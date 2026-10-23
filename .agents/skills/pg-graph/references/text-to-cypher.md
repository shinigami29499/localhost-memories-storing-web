---
title: "Natural Language to openCypher"
description: "A grounded workflow for turning a user question into a validated openCypher query on Apache AGE, then running it and returning results."
tags: [apache-age, opencypher, cypher, text-to-cypher, nl2cypher, postgresql]
---

# Natural Language to openCypher

## When to use this skill

Use when a user asks a question in plain English and expects an answer from the graph. The goal is a correct, safe, grounded openCypher query, not a guess. This is the core consumption path of the pg-graph skill.

## Workflow

1. **Introduce the schema.** Never generate Cypher blind. First load the graph schema (labels, edge types, key properties) using the schema introspection reference. Ground every label and property in what actually exists.
2. **Draft the Cypher.** Map entities in the question to vertex labels, relationships to edge types, filters to `WHERE` or inline property maps.
3. **Wrap correctly.** Emit the query wrapped in `ag_catalog.cypher()` with a column definition list matching the `RETURN` arity.
4. **Validate before executing.** Check that labels, edge types, and properties exist in the schema. If any are missing, ask a clarifying question or pick the closest grounded match and say so.
5. **Execute and read back.** Run the query, then translate the `agtype` results into a plain answer.

## Grounding example

Question: "Which resolutions fixed tickets caused by the upgrade bug?"

Grounded mapping (from schema):

- Ticket vertex label `Ticket`, property `id`, `title`.
- Cause vertex label `Cause`, property `name`.
- Resolution vertex label `Resolution`, property `summary`.
- Edges `CAUSED_BY` (Ticket to Cause), `RESOLVED_BY` (Ticket to Resolution).

Generated query:

```sql no-execute
SELECT *
FROM ag_catalog.cypher('support_kg', $$
    MATCH (t:Ticket)-[:CAUSED_BY]->(c:Cause {name: 'upgrade bug'}),
          (t)-[:RESOLVED_BY]->(r:Resolution)
    RETURN DISTINCT r.summary
$$) AS (resolution agtype);
```

## Visualizing the graph in the VS Code extension

When the user works in the **PostgreSQL extension for Visual Studio Code** (`ms-ossdata.vscode-pgsql`), it auto-detects AGE Cypher results and renders them as an interactive node-edge graph. To make a query render as a graph instead of a plain table, generate it to meet these requirements (identical on Flexible Server and Azure HorizonDB):

1. **Return whole vertices and edges, not scalar properties.** `RETURN a, r, b` renders; `RETURN a.name, b.title` returns plain text and will not visualize. Always name the relationship variable so the edge object is returned.
2. **Set `disp_label` for readable nodes.** Without it, nodes display internal IDs. Assign a meaningful property before `RETURN`, e.g. `SET a.disp_label = a.title`.
3. **Match the `AS (...)` arity to every returned object.** One `agtype` column per returned object, including every intermediate node and edge on a multi-hop path.

Single hop, visualization ready:

```sql no-execute
SELECT * FROM ag_catalog.cypher('support_kg', $$
    MATCH (t:Ticket)-[r:CAUSED_BY]->(c:Cause)
    SET t.disp_label = t.title
    SET c.disp_label = c.name
    RETURN t, r, c
$$) AS (t agtype, r agtype, c agtype);
```

Multi hop, return and declare every intermediate node and edge:

```sql no-execute
SELECT * FROM ag_catalog.cypher('support_kg', $$
    MATCH (t:Ticket)-[r1:CAUSED_BY]->(c:Cause)-[r2:RESOLVED_BY]->(res:Resolution)
    RETURN t, r1, c, r2, res
$$) AS (t agtype, r1 agtype, c agtype, r2 agtype, res agtype);
```

For a pure text answer, a scalar `RETURN` is fine. When the user is exploring visually, prefer returning objects so the result renders in the graph explorer. Source: [Apache AGE graph visualization (HorizonDB)](https://learn.microsoft.com/en-us/azure/horizondb/graph/age-overview#apache-age-graph-visualization) and [Apache AGE on Azure Database for PostgreSQL](https://learn.microsoft.com/en-us/azure/postgresql/azure-ai/generative-ai-age-overview#apache-age-graph-visualization).

## Safety rules

- Never concatenate raw user text into the `$$...$$` body. Bind parameters do not cross into Cypher, so filter values must be validated and, where possible, applied in the surrounding SQL or through a strict allowlist of expected shapes.
- Prefer read only `MATCH` and `RETURN` for question answering. Do not emit `CREATE`, `MERGE`, `SET`, or `DELETE` in response to a read question. If the user asks to mutate the graph, confirm explicitly first.
- Cap traversal depth. Use bounded variable length like `*1..3` rather than unbounded `*` to avoid runaway traversals.

## Handling ambiguity

- If a label or property in the draft does not exist in the schema, do not invent it. Present the closest grounded option and ask the user to confirm.
- If the question maps to multiple plausible paths, show the interpretation you chose in one sentence before the results.

## Common Mistakes

1. **[CRITICAL] Ungrounded labels**: Generating Cypher against labels that do not exist returns nothing and looks like a data problem.
2. **[HIGH] Unbounded traversal**: `*` with no bound can scan the whole graph.
3. **[HIGH] Silent mutation**: Emitting write clauses for a read question.
4. **[MEDIUM] Arity mismatch**: Column definition list not matching `RETURN`.
5. **[MEDIUM] Scalar RETURN when visualizing**: Returning properties (`RETURN a.name`) instead of whole objects prevents the VS Code graph explorer from rendering; return `a, r, b` and set `disp_label`.

## Anti-Hallucination Rules

- Do NOT fabricate labels, edge types, or properties. Ground them in schema introspection.
- Do NOT claim a result is complete if the mapping was uncertain. State the interpretation.
