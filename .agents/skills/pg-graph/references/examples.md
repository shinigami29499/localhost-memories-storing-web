---
title: "Apache AGE Worked Examples"
description: "End to end worked examples on Apache AGE spanning graph creation, idempotent load, schema introspection, traversal, and text to Cypher."
tags: [apache-age, opencypher, cypher, examples, postgresql]
---

# Apache AGE Worked Examples

## When to use this skill

Use as a concrete reference when you want a full sequence from empty graph to answered question. Each example is grounded in the wrapping and safety rules from the other references in this skill.

## Example 1: Build a small support knowledge graph

Set up the session and graph.

```sql no-execute
-- On managed Azure AGE is preloaded; skip LOAD 'age' (self-hosted only).
SET search_path = public, ag_catalog;
SELECT create_graph('support_kg');
```

Load a ticket, a cause, and a resolution idempotently.

```sql no-execute
SELECT *
FROM ag_catalog.cypher('support_kg', $$
    MERGE (t:Ticket {id: 'T-1001'})
      SET t.title = 'Login fails after upgrade'
    MERGE (c:Cause {name: 'upgrade bug'})
    MERGE (r:Resolution {id: 'R-42'})
      SET r.summary = 'Clear cached tokens and re issue session'
    MERGE (t)-[:CAUSED_BY]->(c)
    MERGE (t)-[:RESOLVED_BY]->(r)
    RETURN t.id
$$) AS (ticket_id agtype);
```

## Example 2: Introspect the schema

List the labels present in the graph.

```sql no-execute
SELECT name, kind
FROM ag_catalog.ag_label l
JOIN ag_catalog.ag_graph g ON l.graph = g.graphid
WHERE g.name = 'support_kg'
ORDER BY kind, name;
```

## Example 3: Answer a question by traversal

Question: "What resolved the ticket caused by the upgrade bug?"

```sql no-execute
SELECT *
FROM ag_catalog.cypher('support_kg', $$
    MATCH (t:Ticket)-[:CAUSED_BY]->(:Cause {name: 'upgrade bug'}),
          (t)-[:RESOLVED_BY]->(r:Resolution)
    RETURN DISTINCT r.summary
$$) AS (resolution agtype);
```

## Example 4: Bounded multi hop traversal

Find root causes within three hops.

```sql no-execute
SELECT *
FROM ag_catalog.cypher('support_kg', $$
    MATCH (t:Ticket {id: 'T-1001'})-[:CAUSED_BY*1..3]->(root:Cause)
    RETURN root.name
$$) AS (root_cause agtype);
```

## Example 5: Text to Cypher, grounded

User asks: "Show me tickets about login problems." After introspecting that `Ticket` has a `title` property, generate:

```sql no-execute
SELECT *
FROM ag_catalog.cypher('support_kg', $$
    MATCH (t:Ticket)
    WHERE t.title CONTAINS 'login'
    RETURN t.id, t.title
$$) AS (ticket_id agtype, title agtype);
```

The filter value here is a known safe literal. For values derived from user input, validate them and apply them in the surrounding SQL rather than concatenating into the Cypher body.

## Notes

- Every query is wrapped in `ag_catalog.cypher()` with a matching column definition list.
- All property keys used were confirmed by introspection before the query was written.
- Traversals are bounded to avoid runaway scans.
