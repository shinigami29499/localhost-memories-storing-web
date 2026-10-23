---
title: "Explainability and Traceability for Graph Reasoning"
description: "Make graph facts traceable to their sources and graph recommendations explainable, with provenance on every vertex and edge, a returned reasoning path, a weakest link path confidence, and a reproducible reasoning trace log. Uses Apache AGE and SQL available today."
tags: [apache-age, explainability, traceability, provenance, graph-rag, knowledge-graph, postgresql]
---

# Explainability and Traceability

## When to use this skill

Use when a recommendation or answer from the graph must be defensible: the user needs to see **why** an answer was produced and **where** each supporting fact came from. This is essential for incident resolution, audit, and any decision a human will act on. It builds on `extract-to-graph` provenance, `graph-augmented-rag` traversal, and `text-to-cypher`.

Two distinct goals:

- **Traceability**: every vertex and edge can be traced back to the exact source that produced it.
- **Explainability**: every recommendation carries the reasoning path, the supporting evidence, and a confidence, in a form a human can read.

## Pillar 1: Provenance on every fact (traceability)

Carry provenance as properties on the vertex and edge, not in a side channel. At minimum record where the fact came from, who produced it, how confident it is, and which ontology version it was written under.

| Property | Meaning |
|---|---|
| `source_id` | Stable id of the source row or document |
| `source_kind` | `row`, `document`, or `foreign_key` |
| `source_ref` | Primary key value, or `doc_id:char_span` for text |
| `extractor` | What produced it: `fk-derived`, an agent model name, or `azure_ai` |
| `confidence` | Extraction confidence in `[0,1]` |
| `ontology_version` | Version of the finalized ontology used |
| `extracted_at` | Timestamp of the load |

Write them during MERGE (see `extract-to-graph`):

```sql no-execute
SELECT * FROM ag_catalog.cypher('incident_kg', $$
  MERGE (i:Incident {id:'INC-9002'})
  MERGE (c:Cause {name:'bad deploy'})
  MERGE (i)-[e:CAUSED_BY {
      source_id:'row-42', source_kind:'row', source_ref:'incidents:42',
      extractor:'fk-derived', confidence:0.7, ontology_version:3
  }]->(c)
  RETURN i
$$) AS (i agtype);
```

**Trace any fact back to its source.** Given a vertex or edge, return its provenance so the user can open the original record.

```sql no-execute
SELECT * FROM ag_catalog.cypher('incident_kg', $$
  MATCH (i:Incident {id:'INC-9002'})-[e:CAUSED_BY]->(c:Cause)
  RETURN e.source_kind, e.source_ref, e.extractor, e.confidence
$$) AS (source_kind agtype, source_ref agtype, extractor agtype, confidence agtype);
```

Because provenance travels on the edge, you can always answer "which source asserted this relationship" without re-running extraction.

## Pillar 2: Explain a recommendation (reasoning path)

Never return only the answer. Return the **path that led to it**, the **supporting evidence**, and a **path confidence**. A traversal can return the intermediate vertices and each edge's confidence in one query. Verified live on Apache AGE:

```sql no-execute
SELECT * FROM ag_catalog.cypher('incident_kg', $$
  MATCH (n:Incident {id:'INC-9002'})-[a:CAUSED_BY]->(c:Cause)
        <-[b:CAUSED_BY]-(h:Incident)-[d:RESOLVED_BY]->(r:Resolution)
  RETURN r.summary,
         [a.confidence, b.confidence, d.confidence],
         [n.id, c.name, h.id]
$$) AS (suggestion agtype, edge_confidences agtype, path agtype);
```

This returns, for the new incident, a suggested resolution, the confidence of each edge on the path, and the chain of vertices that connects them (the new incident, the shared cause, and the historical incident that carried the fix).

**Path confidence is the weakest link.** A recommendation is only as trustworthy as its least certain edge, so take the minimum edge confidence along the path (use a product if you want it to decay with length). Compute it in SQL by unnesting the returned array. Verified live:

```sql no-execute
WITH hits AS (
  SELECT * FROM ag_catalog.cypher('incident_kg', $$
    MATCH (n:Incident {id:'INC-9002'})-[a:CAUSED_BY]->(c:Cause)
          <-[b:CAUSED_BY]-(h:Incident)-[d:RESOLVED_BY]->(r:Resolution)
    RETURN r.summary, [a.confidence,b.confidence,d.confidence], h.id
  $$) AS (summary agtype, confs agtype, support_id agtype)
)
SELECT summary::text AS suggestion,
       (SELECT min(v::text::real)
        FROM jsonb_array_elements(confs::text::jsonb) v) AS path_confidence,
       count(*) OVER () AS evidence_count
FROM hits;
```

**Render it for a human, not as `agtype`.** Mirror the reader friendly style used for ontologies: a plain sentence, the evidence, the path, and the weakest link.

```text
Suggested: roll back the deploy   (path confidence 0.70, weakest link)
Why: 1 past incident with the same cause was resolved this way.
Path: INC-9002 --CAUSED_BY--> "bad deploy" <--CAUSED_BY-- INC-5001 --RESOLVED_BY--> "roll back the deploy"
Sources: edge row-42 (this incident), edge row-11 (INC-5001)
```

Frequency across the supporting set is itself a signal: a resolution shared by many incidents with the same cause is stronger than one seen once. Surface that count alongside the confidence.

## Pillar 3: Traceable natural language to Cypher

When a recommendation comes from a natural language question, always surface the **generated Cypher**, the **labels and properties it was grounded on**, and the **result**. A user can only trust an answer they can audit. Never present a graph answer without the query that produced it. See `text-to-cypher` for the grounded generation workflow and `graph-schema-introspection` for grounding the labels.

## Pillar 4: A reproducible reasoning trace (audit log)

For recommendations a human will act on, persist the whole reasoning event so it can be reproduced and audited later. Record the question, the embedding model, the ontology version, the seed ids, the generated Cypher, the suggestion, the path confidence, and the evidence count. Verified live:

```sql no-execute
CREATE TABLE IF NOT EXISTS reasoning_trace (
    id               bigserial PRIMARY KEY,
    asked_at         timestamptz DEFAULT now(),
    question         text,
    embedding_model  text,
    ontology_version int,
    seed_ids         jsonb,
    generated_cypher text,
    suggestion       text,
    path_confidence  real,
    evidence_count   int
);
```

Insert one row per recommendation. Because the row captures the exact Cypher and the seeds, re-running it reproduces the answer, and comparing rows over time shows how recommendations shift as the graph and ontology evolve. This is the traceability layer for recommendations, complementing the per-fact provenance in Pillar 1.

## Readability in graph construction

Explainable construction starts at the ontology. Keep labels and edge types human readable (curated names from the finalized ontology, not opaque codes), carry a short description per label, and prefer meaningful edge names like `RESOLVED_BY` over generic `REL`. The ontology derivation report (nodes, edges, confidence, evidence) plus the per-fact provenance together explain how the graph was built. See `ontology-derivation` for the derivation report and confidence scores.

## Common Mistakes

1. **[CRITICAL] Answer without a path**: Returning a recommendation with no reasoning path or evidence makes it impossible to trust or audit.
2. **[HIGH] No provenance on edges**: Putting `source_id` only on vertices loses the "which source asserted this relationship" trace.
3. **[HIGH] Averaging edge confidence**: Averaging hides a weak link. Use the minimum (or a length decaying product) so a single unreliable edge lowers the path score.
4. **[HIGH] Hidden Cypher**: Presenting a natural language answer without the generated query the user can inspect.
5. **[MEDIUM] No reasoning log**: Not persisting the reasoning event, so a past recommendation cannot be reproduced or explained after the fact.

## Anti-Hallucination Rules

- Do NOT present a recommendation without its reasoning path, supporting evidence, and a confidence.
- Do NOT invent provenance. If a fact has no recorded source, say so rather than fabricating a `source_id`.
- Do NOT claim a confidence the data does not support. Path confidence is bounded by the weakest edge on the path.
- Do NOT hide the generated Cypher behind a natural language answer. Surface it so the user can audit.
- Do NOT rely on unreleased `ai.*` primitives for explainability. Provenance properties, AGE traversal, and the reasoning trace table are all available today.
