---
title: "Ontology Derivation with a Human Feedback Loop"
description: "Point the agent at structured or unstructured data, propose a graph ontology using tools available today, and iterate with the user before finalizing. No unreleased pipeline primitives required."
tags: [apache-age, ontology, knowledge-graph, azure-ai, postgresql]
---

# Ontology Derivation with a Human Feedback Loop

## When to use this skill

Use when the user points at their data and wants a graph but has not defined an ontology yet. The goal is a proposed ontology (node labels, edge types, properties) derived from their data, refined through a review loop, and finalized only after the user approves. Once finalized, hand off to `extract-to-graph`.

This skill uses only capabilities available today. It does NOT depend on unreleased `ai.*` pipeline primitives.

## Two execution modes

1. **Agent driven (default, any PostgreSQL with AGE).** The agent samples the data through the MCP query tools, reasons over it, and proposes the ontology itself. This is the LLM doing the analysis, so no in-database AI function is required. It works on self hosted, RDS, Cloud SQL, or Azure.
2. **In-database at scale (managed Azure Database for PostgreSQL — Flexible Server and Azure HorizonDB).** For large corpora, use the `azure_ai` extension (`azure_ai.generate()`, `azure_ai.extract()`) to run proposals and extraction inside SQL. This needs `azure_ai` allowlisted and configured.

Pick the agent driven mode unless the dataset is too large to sample and the user is on Azure with `azure_ai` available. State which mode you are using.

## Inputs the user can point at

- **Structured data**: existing tables. Read the schema and sample rows, then propose node labels from tables, properties from columns, and edges from foreign keys or join tables. No LLM extraction needed.
- **Unstructured data**: a text column. Sample rows and infer candidate entity and relationship types from the text.
- **Hybrid**: both, merged into one ontology. This is the most common real world case.

## Derive from structured data

Read the schema and a sample, then propose the mapping.

```sql no-execute
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

Propose: each table is a candidate node label, its primary key is the identity, scalar columns are properties, and foreign keys become candidate edges. Present this for review.

Two structural cases the naive profiling query gets wrong, so handle them explicitly:

- **Partitioned tables.** Foreign keys are often declared on the partition children, not the parent. Emitting each partition as its own node label is wrong. Roll partition children up to their parent using `pg_inherits`, and attribute child foreign keys to the parent, so a time partitioned `payment` yields one `payment` label with its real edges.
- **Relationships without a declared foreign key.** Some real relationships exist only as a column plus a unique index or application logic, with no `FOREIGN KEY` constraint (for example a `manager_staff_id` that is unique but not an enforced foreign key). The foreign key query will not see these. Surface likely join columns by naming convention and cardinality as candidate edges for the user to confirm, rather than assuming the foreign key set is complete.

## Derive from unstructured data

Sample rows, then have the LLM propose an ontology JSON with a confidence estimate per element.

Agent driven mode: read a sample and reason over it directly.

```sql no-execute
SELECT id, content
FROM documents
ORDER BY random()
LIMIT 50;
```

In-database mode on Azure: prompt the model from SQL to return the ontology JSON.

```sql no-execute
SELECT azure_ai.generate(
    'From these support tickets, propose a graph ontology as JSON with '
    || 'node labels, edge types, properties, and a confidence 0..1 per element. '
    || 'Tickets: ' || string_agg(content, E'\n---\n')
)
FROM (SELECT content FROM documents ORDER BY random() LIMIT 50) s;
```

Verify the exact `azure_ai` function signatures against the installed extension version before relying on them.

## Store the ontology (user owned table)

Persist ontologies in a plain versioned table the user owns. There is no managed ontology store.

```sql no-execute
CREATE TABLE IF NOT EXISTS ontology_definitions (
    name        text    NOT NULL,
    version     int     NOT NULL,
    schema      jsonb   NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (name, version)
);
```

## How the taxonomy is learned

When the user just points at data with no predefined schema, induce the taxonomy bottom up from the data rather than assuming a fixed model. Five steps:

1. **Profile first (deterministic, cheap).** For structured data, read the schema, foreign keys, join tables, cardinality, and sample values. Foreign keys and join tables are the relationships. Low cardinality columns are candidate categorical taxonomies. For unstructured data, profile length, detect recurring field structure, and measure sample diversity.

```sql no-execute
SELECT tc.table_name, kcu.column_name, ccu.table_name AS references_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
```

2. **Sample diversely, not just randomly.** Random sampling misses rare but important types. Embed rows and sample across clusters so the sample spans the semantic space and surfaces minority entity types. Also stratify by metadata facets such as category, source, or time when present. On Azure, generate the embeddings with the `azure_ai` extension; see [azure-ai-semantic-search](azure-ai-semantic-search.md).

```sql no-execute
SELECT id, content, embedding
FROM documents
ORDER BY embedding <=> (SELECT avg(embedding) FROM documents)
LIMIT 200;
```

3. **Open extraction (surface taxonomy).** Run open information extraction over the sample to pull candidate entities with a guessed type and candidate relationships as subject, predicate, object triples. This yields a raw, noisy set of types and predicates.

4. **Induce the taxonomy.** Cluster synonymous type labels (app, application, service) and synonymous predicates into canonical node and edge types using embedding similarity plus LLM adjudication. Detect a shallow is-a hierarchy (database and service are both a component). Aggregate per type properties that appear above a frequency threshold.

5. **Score and present.** Confidence per element is frequency across the sample times extraction agreement. Coverage is the fraction of sampled records the proposed taxonomy captures. Flag long tail and ambiguous types for the user, then run the feedback loop below.

An optional `domain_hint` biases the induction toward a domain without dictating it, so the data still overrides. This is an inductive proposal from a sample, not a guaranteed complete schema, which is why the human gate and the post load coverage refinement exist.

## Confidence and quality scores

Every proposed element carries a confidence in `[0,1]` and an evidence string, and the proposal as a whole carries quality metrics. Show these to the user; never present a derived ontology as if it were certain.

### Structured path (deterministic evidence)

Scores come from schema facts, not guesses. Per candidate node label combine three signals:

- **Identity quality**: a single column primary key scores 1.0, a composite key 0.6, no key 0.2.
- **Support**: how many rows back the entity, log scaled so large tables saturate.
- **Property completeness**: the average non null fraction across its columns.

```sql no-execute
WITH pk AS (
    SELECT tc.table_name, count(*) AS pk_cols
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = :schema
    GROUP BY tc.table_name
),
comp AS (
    SELECT tablename, 1 - avg(null_frac) AS completeness
    FROM pg_stats WHERE schemaname = :schema GROUP BY tablename
),
tbl AS (
    SELECT c.relname, c.reltuples AS est_rows
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = :schema AND c.relkind = 'r'
)
SELECT t.relname AS candidate_node,
       CASE WHEN pk.pk_cols = 1 THEN 1.0 WHEN pk.pk_cols > 1 THEN 0.6 ELSE 0.2 END AS identity_quality,
       round(LEAST(1.0, ln(GREATEST(t.est_rows, 0) + 1) / ln(10000))::numeric, 2) AS support,
       round(COALESCE(comp.completeness, 0)::numeric, 2) AS property_completeness,
       round((0.4 * CASE WHEN pk.pk_cols = 1 THEN 1.0 WHEN pk.pk_cols > 1 THEN 0.6 ELSE 0.2 END
            + 0.3 * LEAST(1.0, ln(GREATEST(t.est_rows, 0) + 1) / ln(10000))
            + 0.3 * COALESCE(comp.completeness, 0))::numeric, 2) AS node_confidence
FROM tbl t
LEFT JOIN pk ON pk.table_name = t.relname
LEFT JOIN comp ON comp.tablename = t.relname
ORDER BY node_confidence DESC;
```

Edge confidence is high when a foreign key backs it (a declared constraint is strong evidence, score near 1.0) and lower for an edge inferred from a naming convention with no constraint (score by name match plus join cardinality, and flag it for confirmation).

### Unstructured path (frequency and agreement)

Element confidence is `frequency_across_sample * extraction_agreement`, both in `[0,1]`: how often the type or predicate appears in the sample, times how consistently extraction labeled it. Coverage is the fraction of sampled records the proposed taxonomy captures. A type seen once has low confidence and is flagged as long tail rather than dropped silently.

### Overall quality metrics

Report alongside the elements: **coverage** (fraction of tables or sampled records mapped), **mean confidence**, and the **count of low confidence elements** below the threshold (default 0.6). These let the user judge the proposal at a glance.

### Present the scored proposal

Show a scored table, most uncertain first so review effort goes where it matters:

| element | kind | confidence | evidence |
|---|---|---|---|
| Incident | node | 0.95 | single column key, 5k rows, 0.98 completeness |
| Service | node | 0.88 | single column key, 40 rows, 0.90 completeness |
| ESCALATED_TO | edge | 0.30 | seen once, no foreign key, inferred from text |

Carry the confidence into the stored ontology so later runs and audits can see it:

```sql no-execute
INSERT INTO ontology_definitions (name, version, schema)
VALUES ('incident_ontology', 1, '{
  "nodes": [{"label": "Incident", "confidence": 0.95}],
  "edges": [{"type": "ESCALATED_TO", "source": "Incident", "target": "Vendor", "confidence": 0.30}],
  "quality": {"coverage": 0.92, "mean_confidence": 0.81, "low_confidence_count": 1}
}'::jsonb);
```

## The feedback loop (do not skip)

Treat the derived ontology as a proposal, never a finished artifact.

1. **Present the proposal.** Show node labels, edge types, and properties, with a confidence estimate. Call out low confidence elements explicitly.
2. **Invite edits.** The user can add, remove, rename, merge, or split labels and edges, and adjust which columns map to which properties.
3. **Apply and re-present.** Update the proposal and show the diff so the user sees what changed.
4. **Iterate** until the user explicitly approves.
5. **Finalize only on approval.** Insert the approved JSON as the next version. Never write it to the load process before the user says yes.

```sql no-execute
INSERT INTO ontology_definitions (name, version, schema)
VALUES ('incident_ontology', 1, '{ "nodes": [], "edges": [] }'::jsonb);
```

### Surface it in a reader friendly format

Do not show raw JSON first. Lead with a short plain language summary, then scannable structure, then the decisions you need. Keep JSON available on request.

**1. One line summary.** State what was found and from where: "From 2,000 rows across 4 tables I propose 3 entity types and 2 relationships. Two items need your attention."

**2. Entities as a scored table, most uncertain first**, so review effort goes where it matters:

| # | entity | properties | confidence | evidence |
|---|---|---|---|---|
| 1 | Incident | id, symptom, severity | 0.89 | single key, 2k rows |
| 2 | Service | id, name, owner | 0.77 | single key, 40 rows |
| 3 | audit_log ? | msg, at | 0.46 | no key, 12 rows |

**3. Relationships as sentences, not adjacency dumps**: "Incident AFFECTS Service (from foreign key `incident.service_id`, confidence 1.0)."

**4. A text diagram of the graph shape** so the user sees structure at a glance:

```text
(Incident) --AFFECTS--> (Service) --DEPENDS_ON--> (Component)
(Incident) --CAUSED_BY--> (Cause)
(Incident) --RESOLVED_BY--> (Resolution)
```

A `mermaid` graph block works well on surfaces that render it; the ASCII form is the fallback.

**5. A "needs your attention" list** that names the specific low confidence, ambiguous, long tail, and inferred non foreign key elements, each with a suggested default action.

### Collect edits with low friction

Present decisions as numbered items with a concrete suggested action rather than an open ended "is this ok". Accept a small edit grammar the user can reply with in plain text:

- `keep 1` or `keep all`
- `rename 3 to IncidentAudit`
- `merge 5 into 2`
- `split 2 into Service, ManagedService`
- `drop 3`
- `add edge Incident REPORTED_BY Customer`
- `set 1 identity = id`

Ask one focused question at a time for the highest impact ambiguities rather than bundling many. After applying edits, show a short diff (added, removed, renamed, remapped) and re present the scored table. Iterate until the user gives explicit approval, then and only then finalize the version.

## Refine after the first load

The loop does not end at finalize. After a first extraction run, measure coverage with plain SQL rather than a managed function: count how many source rows produced each label and how many entities fell below a confidence threshold.

```sql no-execute
SELECT label, count(*) AS extracted,
       round(100.0 * count(*) FILTER (WHERE confidence < 0.6) / count(*), 1) AS low_conf_pct
FROM staging_entities
GROUP BY label
ORDER BY low_conf_pct DESC;
```

A high low confidence percentage means the label is ambiguous or too broad. Propose a revision, run the feedback loop again, and insert a new version. Renaming a label or changing an edge source or target is a breaking change that requires reloading affected facts.

## Common Mistakes

1. **[CRITICAL] Auto-finalizing**: Writing the derived ontology into the load process without user approval.
2. **[HIGH] Hiding uncertainty**: Not surfacing confidence so the user cannot judge the proposal.
3. **[HIGH] Raw JSON first**: Dumping the ontology as JSON instead of a plain language summary, scored table, and readable relationships makes review hard. Lead with the reader friendly view.
3. **[HIGH] Depending on unreleased primitives**: Reaching for `ai.suggest_ontology()`, which does not exist yet.
4. **[MEDIUM] Skipping refinement**: Treating version 1 as final and ignoring the coverage query.

## Anti-Hallucination Rules

- Do NOT finalize an ontology without explicit user approval.
- Do NOT use unreleased `ai.*` pipeline primitives. Use agent-driven analysis or the `azure_ai` extension.
- Do NOT present derived labels as authoritative. They are proposals grounded in a data sample.
- Do NOT hide low confidence elements. Flag them for review.
- Do NOT assume `azure_ai` function signatures. Verify them against the installed version.
