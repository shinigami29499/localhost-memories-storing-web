---
title: "Graph Augmented Retrieval on Apache AGE"
description: "Retrieval that combines pgvector similarity with Apache AGE graph traversal and reranking, so answers draw on both semantic match and relationship context."
tags: [apache-age, opencypher, graph-rag, pgvector, retrieval, postgresql]
---

# Graph Augmented Retrieval

## When to use this skill

Use when semantic search alone returns plausible but shallow results, and the right answer depends on relationships. A support ticket, for example, is best answered by finding semantically similar past tickets and then following the graph to the resolutions that actually fixed them.

## The pattern

1. **Seed with vector similarity.** Embed the user question and find the closest content nodes with pgvector.
2. **Expand along the graph.** From the seed vertices, traverse curated edges (for example `RESOLVED_BY`, `CAUSED_BY`) to reach the vertices that carry the answer.
3. **Rerank.** Combine semantic score with graph signal such as authority, recency, or path length. Reciprocal rank fusion is a robust default.
4. **Synthesize.** Answer from the reranked, relationship aware set rather than the raw vector hits.

## Seed step (pgvector)

Embed the question and rank content nodes by vector distance. On Azure, generate the embedding in the database with the `azure_ai` extension; the `azure_openai.create_embeddings(deployment, text)` call returns a float array you cast to `vector`.

```sql no-execute
WITH q AS (
    SELECT azure_openai.create_embeddings('text-embedding-3-small', :question)::vector AS e
)
SELECT node_key, content, 1 - (embedding <=> q.e) AS similarity
FROM ticket_embeddings, q
ORDER BY embedding <=> q.e
LIMIT 20;
```

Populate the stored embeddings the same way, for example
`UPDATE ticket_embeddings SET embedding = azure_openai.create_embeddings('text-embedding-3-small', content)::vector;`.
The deployment name must match an embedding deployment on the configured Azure OpenAI resource, and the column dimension must match the model (1536 for `text-embedding-3-small`). Match the distance operator to the metric the model was trained on (cosine `<=>` here), and ensure an appropriate vector index exists. Off Azure, generate embeddings with any model and insert the vectors; only the seed generation changes, the traversal is identical.

## Expand step (AGE traversal)

Feed the seed keys into a bounded traversal that collects the answer bearing vertices.

```sql no-execute
SELECT *
FROM ag_catalog.cypher('support_kg', $$
    MATCH (t:Ticket)-[:RESOLVED_BY]->(r:Resolution)
    WHERE t.id IN ['T-1001','T-1002','T-1003']
    RETURN t.id, r.summary
$$) AS (ticket_id agtype, resolution agtype);
```

In practice the seed keys come from the vector step. Interpolate them safely on the server side, never by concatenating untrusted text into the Cypher body.

## Rerank step

Blend the semantic rank from the seed step with a graph signal. Options:

- **Authority boost**: prefer resolutions referenced by many tickets.
- **Path length**: prefer answers reachable in fewer hops.
- **Recency**: prefer more recently effective resolutions.

Reciprocal rank fusion over the two orderings is a strong, simple baseline that avoids hand tuned weights.

## Why this beats flat vector search

- Vector search finds things that read alike. Graph traversal finds things that are causally or structurally related.
- The combination surfaces the resolution that fixed a similar problem even when its text does not resemble the question.

When you present the answer, return the reasoning path and provenance, not just the final text. See [graph-explainability](graph-explainability.md) for the reasoning path, weakest link path confidence, and a reproducible reasoning trace log.

## Common Mistakes

1. **[HIGH] Vector only**: Stopping at similarity misses the relationship that carries the answer.
2. **[HIGH] Unbounded expansion**: Traversing without a hop bound can explode the candidate set.
3. **[MEDIUM] No reranking**: Concatenating both result sets without fusion loses the benefit of each signal.

## Anti-Hallucination Rules

- Do NOT claim graph augmentation improves every query. It helps when relationships matter.
- Do NOT invent edge types for traversal. Ground them in schema introspection.
