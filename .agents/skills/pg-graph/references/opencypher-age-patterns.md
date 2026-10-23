---
title: "openCypher on Apache AGE — Query and Load Patterns"
description: "How to set up Apache AGE, wrap openCypher in ag_catalog.cypher, and use MATCH, MERGE, and CREATE patterns on a property graph in PostgreSQL."
tags: [apache-age, opencypher, cypher, ag_catalog, property-graph, postgresql]
---

# openCypher on Apache AGE

## When to use this skill

Use for graph work on PostgreSQL with Apache AGE: creating a graph, wrapping Cypher correctly, loading vertices and edges idempotently, and traversing relationships. Avoid restating basic Cypher grammar the base model already knows. Focus on the AGE specific wrapping and pitfalls.

## Setup and session state

Set a safe search path once per session. On managed **Azure Database for PostgreSQL (Flexible Server and Azure HorizonDB)**, AGE is preloaded via `shared_preload_libraries`, so it is already loaded: do **not** run `LOAD 'age';` there. A non-superuser login will get `access to library "age" is not allowed`. Only run `LOAD 'age';` on self-hosted PostgreSQL where AGE is not preloaded.

```sql no-execute
-- Managed Azure (AGE preloaded): search_path only.
SET search_path = public, ag_catalog;

-- Self-hosted only, when AGE is not in shared_preload_libraries:
-- LOAD 'age';
-- SET search_path = public, ag_catalog;
```

Confirm AGE is available before running Cypher:

```sql no-execute
SELECT extname FROM pg_extension WHERE extname = 'age';
```

Create the named graph once. This is idempotent guarded on your side; calling it twice errors, so check first.

```sql no-execute
SELECT create_graph('support_kg');
```

## The wrapping contract

Every Cypher statement runs inside `ag_catalog.cypher()` and needs a column definition list whose arity matches the `RETURN` clause. Every returned column is typed `agtype`. The **graph name must be a literal string constant**, not a host bind parameter: `ag_catalog.cypher($1, $$...$$)` fails with `a name constant is expected`. Validate the graph name against your known graphs and inline it as a quoted literal.

To render results in the **PostgreSQL extension for VS Code** graph explorer, return whole vertices and edges (not scalar properties), set `disp_label`, and match the `AS (...)` arity to every returned object. See [text-to-cypher: Visualizing the graph in the VS Code extension](text-to-cypher.md#visualizing-the-graph-in-the-vs-code-extension).

```sql no-execute
SELECT *
FROM ag_catalog.cypher('support_kg', $$
    MATCH (t:Ticket)-[:RESOLVED_BY]->(r:Resolution)
    RETURN t.id, r.summary
$$) AS (ticket_id agtype, resolution agtype);
```

Notes:

- The column list `(ticket_id agtype, resolution agtype)` must have two entries because `RETURN` has two expressions.
- Host bind parameters do not work inside the `$$...$$` body. Never concatenate untrusted input into the Cypher text. Filter or parameterize in the surrounding SQL instead.

## Idempotent load with MERGE

During repeated extraction, use `MERGE` on a stable business key so re runs do not create duplicate vertices.

```sql no-execute
SELECT *
FROM ag_catalog.cypher('support_kg', $$
    MERGE (t:Ticket {id: 'T-1001'})
    SET t.title = 'Login fails after upgrade'
    RETURN t
$$) AS (t agtype);
```

Create a relationship by matching both endpoints first, then MERGE the edge.

```sql no-execute
SELECT *
FROM ag_catalog.cypher('support_kg', $$
    MATCH (t:Ticket {id: 'T-1001'}), (r:Resolution {id: 'R-42'})
    MERGE (t)-[e:RESOLVED_BY]->(r)
    RETURN e
$$) AS (e agtype);
```

## Traversal

Variable length paths let you follow chains of relationships.

```sql no-execute
SELECT *
FROM ag_catalog.cypher('support_kg', $$
    MATCH (t:Ticket {id: 'T-1001'})-[:CAUSED_BY*1..3]->(root:Cause)
    RETURN root.name
$$) AS (root_cause agtype);
```

## Indexing vertices and edges

AGE stores each label as a table under the graph schema. Index the properties you filter or join on. Index the JSON `properties` expression for the business key you MERGE on so lookups during load stay fast.

```sql no-execute
CREATE INDEX ON support_kg."Ticket" USING btree (agtype_access_operator(properties, '"id"'));
```

Confirm the exact operator or helper against your AGE version before relying on it, and validate with `EXPLAIN` that the index is used.

## Common Mistakes

1. **[CRITICAL] Missing column definition list**: Omitting `AS (col agtype)` or a mismatched arity fails the query.
2. **[HIGH] Bare Cypher**: Running `MATCH ...` outside `ag_catalog.cypher()` is a syntax error.
3. **[HIGH] search_path with ag_catalog first**: Breaks ordinary `CREATE TABLE` for non superusers.
4. **[HIGH] Duplicate vertices**: Using `CREATE` instead of `MERGE` on re run load creates duplicates.
5. **[MEDIUM] Assuming bind parameters**: Host parameters do not reach inside the `$$` body.
6. **[HIGH] Graph name as bind parameter**: `cypher($1, $$...$$)` fails with `a name constant is expected`; the graph name must be an inlined literal.
7. **[HIGH] Running `LOAD 'age'` on managed Azure**: AGE is preloaded there; a non-superuser gets `access to library "age" is not allowed`. Skip `LOAD` on managed Azure.

## Anti-Hallucination Rules

- Do NOT invent `agtype` cast helper names. Verify against the installed AGE version.
- Do NOT claim AGE supports every Cypher feature of a dedicated graph engine. Scope to documented AGE support.
- Do NOT enable `age` with `ALTER SYSTEM` on managed PostgreSQL.
