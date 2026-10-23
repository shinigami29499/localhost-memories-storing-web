---
title: "Graph Semantic Search with the azure_ai Extension"
description: "Enable and use the azure_ai extension on Azure Database for PostgreSQL to generate embeddings for graph semantic search and graph-augmented retrieval, including what to configure and what to ask the user for."
tags: [azure-ai, azure-openai, embeddings, pgvector, semantic-search, postgresql]
---

# Graph Semantic Search with the azure_ai Extension

## When to use this skill

Use when a graph task needs semantic text search: seeding graph-augmented retrieval, embedding entity mentions for context aware dedup, or diverse sampling during ontology derivation. On managed Azure Database for PostgreSQL (Flexible Server and Azure HorizonDB), generate embeddings in the database with the `azure_ai` extension instead of shipping text to an external service. Off Azure, generate embeddings with any provider and insert the vectors; only this seed step changes, the graph traversal is identical.

## Enable the extension

`azure_ai` and `vector` must be allowlisted in `azure.extensions` before they can be created — set this via server parameters on Flexible Server, or via a parameter group connected to the cluster on Azure HorizonDB. They cannot be enabled with `ALTER SYSTEM`.

```sql no-execute
CREATE EXTENSION IF NOT EXISTS azure_ai;
CREATE EXTENSION IF NOT EXISTS vector;
```

## Configure the connection (ask the user, do not guess)

`azure_ai` calls a configured Azure OpenAI resource. Check what is already set before changing anything:

```sql no-execute
SELECT azure_ai.get_setting('azure_openai.endpoint');
```

If the endpoint is empty, gather the required inputs from the user rather than inventing them. Ask for:

1. **Azure OpenAI endpoint URL**, for example the resource `https://<resource>.openai.azure.com`.
2. **Authentication**: prefer the server managed identity (Entra ID) when the resource grants it; otherwise a subscription key. Treat the key as a secret. Do not hardcode it in a file, do not log it, and do not commit it.
3. **Embedding deployment name and its dimensions**, for example `text-embedding-3-small` at 1536 dimensions. The `vector(N)` column dimension must match the model.
4. **Chat deployment name** only if you also use `azure_ai.generate()` for extraction or adjudication.

Set the connection once (values supplied by the user):

```sql no-execute
SELECT azure_ai.set_setting('azure_openai.endpoint', :endpoint);
SELECT azure_ai.set_setting('azure_openai.subscription_key', :key);
```

## Verify the deployment before using it

A wrong or missing deployment name fails at call time with a 404 `DeploymentNotFound`. Confirm the deployment exists on the resource before relying on it, and if you cannot list it, ask the user for the exact name. Do not guess deployment names.

## Generate and store embeddings

`azure_openai.create_embeddings(deployment, text)` returns a float array; cast it to `vector` for pgvector.

```sql no-execute
CREATE TABLE IF NOT EXISTS doc_embeddings (
    id text PRIMARY KEY, content text, embedding vector(1536));

UPDATE doc_embeddings
SET embedding = azure_openai.create_embeddings('text-embedding-3-small', content)::vector
WHERE embedding IS NULL;
```

Add an index for scale (choose the operator class that matches your distance metric):

```sql no-execute
CREATE INDEX ON doc_embeddings USING hnsw (embedding vector_cosine_ops);
```

## Semantic search query

Embed the query the same way, then rank by vector distance. Cosine distance is `<=>`.

```sql no-execute
WITH q AS (
    SELECT azure_openai.create_embeddings('text-embedding-3-small', :question)::vector AS e
)
SELECT id, content, 1 - (embedding <=> q.e) AS similarity
FROM doc_embeddings, q
ORDER BY embedding <=> q.e
LIMIT 10;
```

This is the seed step for [graph-augmented-rag](graph-augmented-rag.md), the embedding blocking signal in [context-dedup](context-dedup.md), and the diverse sampling step in [ontology-derivation](ontology-derivation.md).

## Cost and batching

Each `create_embeddings` call is a network round trip billed per token. Embed in batches during load, store the vectors, and reuse them. Only embed new or changed rows, guarded by an `embedding IS NULL` filter or a content hash.

## Common Mistakes

1. **[CRITICAL] Guessing the deployment name**: A wrong name fails with 404 `DeploymentNotFound`. Verify or ask the user.
2. **[CRITICAL] Leaking the subscription key**: Never hardcode, log, or commit it. Prefer managed identity (Entra ID).
3. **[HIGH] Dimension mismatch**: The `vector(N)` column must match the model, 1536 for `text-embedding-3-small`.
4. **[HIGH] Wrong distance operator**: Match the operator and index opclass to the model metric, cosine `<=>` with `vector_cosine_ops`.
5. **[MEDIUM] Re-embedding every run**: Embed once, store, and reuse; only embed new or changed rows.

## Anti-Hallucination Rules

- Do NOT invent an Azure OpenAI endpoint, key, or deployment name. Read the current settings, and ask the user for anything missing.
- Do NOT assume `azure_ai` function signatures. Verify them against the installed extension version.
- Do NOT enable extensions with `ALTER SYSTEM` on Azure. Use the allowlist and `CREATE EXTENSION`.
- Do NOT print or store the subscription key. Prefer the server managed identity where available.
- Do NOT depend on unreleased `ai.*` primitives. `azure_ai` embeddings and generation are available today.
