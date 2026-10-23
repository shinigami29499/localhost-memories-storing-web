---
title: "Graph Schema Introspection on Apache AGE"
description: "How to discover labels, edge types, and property keys in an Apache AGE graph so that generated openCypher is grounded in the real schema."
tags: [apache-age, opencypher, graph-schema, introspection, ag_catalog, postgresql]
---

# Graph Schema Introspection

## When to use this skill

Use before generating or debugging Cypher against an unfamiliar graph. Grounding every label and property in the actual schema is the single biggest driver of correct text to Cypher results.

## How AGE stores a graph

Each graph is a schema named after the graph. Every vertex label and edge label is a table inside that schema, tracked in `ag_catalog.ag_label`. Vertex and edge properties are stored as `agtype` in a `properties` column, so property keys are data, not columns.

## List graphs

```sql no-execute
SELECT name FROM ag_catalog.ag_graph ORDER BY name;
```

## List labels in a graph

`ag_label` records each label, its kind (vertex `v` or edge `e`), and its backing relation.

Both `ag_label` and `ag_graph` have a `name` column, so qualify the columns you select or the query fails with `column reference "name" is ambiguous`. AGE also seeds every graph with two internal placeholder labels, `_ag_label_vertex` and `_ag_label_edge`; exclude them so only your real labels are returned.

```sql no-execute
SELECT l.name, l.kind
FROM ag_catalog.ag_label l
JOIN ag_catalog.ag_graph g ON l.graph = g.graphid
WHERE g.name = 'support_kg'
  AND l.name NOT IN ('_ag_label_vertex', '_ag_label_edge')
ORDER BY l.kind, l.name;
```

## Discover property keys for a label

Property keys are inside the `agtype` `properties` column, so sample rows and collect the keys rather than reading a fixed column list.

```sql no-execute
SELECT DISTINCT jsonb_object_keys(properties::text::jsonb) AS property_key
FROM support_kg."Ticket"
LIMIT 100;
```

Confirm the cast path against your AGE version. The intent is to enumerate the property keys present on that label so generated Cypher only references real properties.

## Sample values

To ground filter values, sample a few distinct values for a key.

```sql no-execute
SELECT DISTINCT (properties::text::jsonb)->>'name' AS cause_name
FROM support_kg."Cause"
LIMIT 25;
```

## Build a compact schema summary

For text to Cypher, assemble a short summary the model can rely on:

- Vertex labels and their common property keys.
- Edge labels and the vertex labels they connect.
- A few sample values for high signal properties.

Keep it compact. A concise, accurate summary beats a long dump.

## Common Mistakes

1. **[HIGH] Treating properties as columns**: Property keys live in the `agtype` `properties` value, not as table columns.
2. **[HIGH] Ambiguous `name` in the label query**: `ag_label` and `ag_graph` both expose `name`. Qualify the selected columns (`l.name`, `l.kind`) or the query errors out. Also filter the internal `_ag_label_vertex` and `_ag_label_edge` placeholders so only real labels are returned.
3. **[MEDIUM] Stale summary**: Introspect per session or when the graph may have changed.
4. **[MEDIUM] Over sampling**: Large scans to enumerate keys are unnecessary. Sample with a `LIMIT`.

## Anti-Hallucination Rules

- Do NOT assume a property exists. Enumerate keys from real rows.
- Do NOT guess which labels an edge connects. Verify from `ag_label` and sampled endpoints.
