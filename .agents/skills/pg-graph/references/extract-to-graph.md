---
title: "Extract to Graph: Apply an Ontology to Build the AGE Graph"
description: "Once an ontology is finalized, extract entities and relationships, deduplicate them, and MERGE into an Apache AGE graph using tools available today. No unreleased pipeline primitives required."
tags: [apache-age, ontology, extraction, deduplication, knowledge-graph, postgresql]
---

# Extract to Graph

## When to use this skill

Use after an ontology is finalized (see `ontology-derivation`) to populate the Apache AGE graph from the user's data. This covers extraction, deduplication, and the idempotent MERGE into AGE, all with capabilities available today. It does NOT depend on unreleased `ai.*` pipeline primitives.

## Two execution modes

1. **Agent driven (default, any PostgreSQL with AGE).** The agent reads source rows, extracts entities and relationships per the finalized ontology, deduplicates, and writes MERGE statements through the MCP query tools. No in-database AI function required.
2. **In-database at scale (Azure).** Use `azure_ai.extract()` and `azure_ai.generate()` for batch extraction and grouping inside SQL when the corpus is large and `azure_ai` is available.

## Step 1: Extract into a staging table

Land raw extraction results in a staging table before writing to the graph. Include the source row id for provenance and a confidence value.

```sql no-execute
CREATE TABLE IF NOT EXISTS staging_edges (
    source_id   text NOT NULL,
    from_label  text NOT NULL,
    from_key    text NOT NULL,
    edge_label  text NOT NULL,
    to_label    text NOT NULL,
    to_key      text NOT NULL,
    confidence  real,
    loaded_at   timestamptz DEFAULT now()
);
```

Agent driven: read source rows, extract triples aligned to the ontology labels, and insert them. In-database on Azure: use `azure_ai.extract()` with a prompt built from the finalized ontology. For structured sources, map columns directly and derive edges from foreign keys, with no LLM step.

## Step 2: Deduplicate (strategy ladder, today's tools)

Raw extraction produces aliases. "AKS", "Azure Kubernetes Service", and "the k8s cluster" may be one entity. Canonicalize before writing to the graph. Apply the cheapest strategy that works, escalating only as needed:

- **exact**: group identical strings.
- **normalized**: fold case, whitespace, and punctuation.

```sql no-execute
SELECT lower(regexp_replace(name, '[^a-zA-Z0-9]+', ' ', 'g')) AS norm_key,
       min(name) AS canonical, count(*) AS alias_count
FROM staging_entities
GROUP BY norm_key
HAVING count(*) > 1;
```

- **embedding**: embed entity names and group by vector similarity with pgvector, useful for near duplicates that normalization misses.
- **context grouping**: when names alone are ambiguous, decide using the entity type and neighboring relationships plus a source snippet, not just the surface string. The agent can adjudicate directly, or on Azure use `azure_ai.generate()` to group at scale.

Persist decisions in a canonical map so later runs reuse them, and let a human override win.

```sql no-execute
CREATE TABLE IF NOT EXISTS entity_canonical (
    alias      text PRIMARY KEY,
    canonical  text NOT NULL,
    label      text NOT NULL,
    decided_by text NOT NULL DEFAULT 'auto',
    updated_at timestamptz DEFAULT now()
);
```

Treat a row with `decided_by = 'human'` as authoritative and never overwrite it with an automated decision.

## Step 3: MERGE into AGE

Write canonical entities as vertices and their relationships as edges. Use `MERGE` on the canonical business key so repeated runs do not create duplicates. Carry the source id as a property for provenance.

```sql no-execute
SELECT *
FROM ag_catalog.cypher('incident_kg', $$
    MERGE (i:Incident {id: 'INC-2201'})
      SET i.severity = 'Sev2', i.source_id = 'row-8842'
    MERGE (s:Service {name: 'Checkout'})
    MERGE (i)-[e:AFFECTS]->(s)
      SET e.source_id = 'row-8842'
    RETURN i
$$) AS (incident agtype);
```

Interpolate canonical values safely on the server side. Never concatenate untrusted text into the Cypher body. In agent driven mode, generate one MERGE per canonical fact from the staging table.

## Incremental updates and provenance

For ongoing loads, process only new, updated, and deleted source rows. Because every vertex and edge carries `source_id`, you can find and remove stale facts when a source row changes or is deleted by matching on that property. Keep a simple watermark (for example, the max `loaded_at` or a processed id set) to know what is new since the last run.

Carry richer provenance than `source_id` alone when answers must be explainable and auditable. See [graph-explainability](graph-explainability.md) for the full provenance property set (`source_kind`, `source_ref`, `extractor`, `confidence`, `ontology_version`) and how to trace any fact back to its source.

## Common Mistakes

1. **[CRITICAL] Skipping dedup**: Writing raw aliases creates duplicate vertices that fragment the graph.
2. **[HIGH] CREATE instead of MERGE**: Non-idempotent load duplicates entities on re-run.
3. **[HIGH] No provenance property**: Without `source_id` on vertices and edges, stale facts cannot be cleaned up.
4. **[HIGH] Depending on unreleased primitives**: Reaching for `ai.build_graph()` or `ai.deduplicate()`, which do not exist yet.
5. **[MEDIUM] Overwriting human decisions**: Letting an automated dedup run replace a manual correction.

## Anti-Hallucination Rules

- Do NOT use unreleased `ai.*` pipeline primitives. Use agent-driven extraction or the `azure_ai` extension plus `ag_catalog.cypher()` MERGE.
- Do NOT write extracted entities to the graph before deduplication.
- Do NOT invent node or edge labels outside the finalized ontology.
- Do NOT let an automated dedup decision override an explicit user correction.
- Do NOT assume `azure_ai` function signatures. Verify them against the installed version.
