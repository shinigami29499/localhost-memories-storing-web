---
title: "Context-Based Entity Deduplication"
description: "Resolve entity aliases in a knowledge graph using context (entity type, graph neighborhood, source snippet), not just name similarity. Scalable blocking, adjudication, a persistent canonical map, and human override, all with tools available today."
tags: [apache-age, deduplication, entity-resolution, knowledge-graph, pgvector, postgresql]
---

# Context-Based Entity Deduplication

## When to use this skill

Use when the same real world entity appears under many surface names and name matching alone is unsafe. "AKS", "Azure Kubernetes Service", and "the k8s cluster" are the same thing; "Mercury" the planet and "Mercury" the element are not. Correct resolution needs context, not just the string. This reference goes deeper than the dedup step in `extract-to-graph`.

Everything here uses capabilities available today: SQL, pgvector, `ag_catalog.cypher()`, and either the agent's own judgment or `azure_ai.generate()` on Azure. No unreleased `ai.*` primitives.

## Learn the jargon and taxonomy first

Context aware dedup cannot judge "same or not" until two things are learned from the data: the **taxonomy** (what types exist and which properties identify each type) and the **domain jargon** (the abbreviations, acronyms, and synonyms that name those entities). Neither is hardcoded; both are induced and then confirmed.

### Taxonomy (reuse ontology derivation)

Types and predicates come from `ontology-derivation`. The taxonomy fixes the first blocking key (only compare within a type) and tells you which properties are identifying per type: an id or owner for a `Service`, an email for a `Person`. Learn those identifying properties during profiling, low cardinality or unique columns for structured data and frequently repeated attributes for text, and use them as the context features you compare during adjudication.

### Jargon lexicon (learn it, do not hardcode a dictionary)

Build a glossary of alias to canonical, scoped to a type, from the data itself, in increasing order of recall:

1. **In-text definition patterns (deterministic, high precision).** Mine source snippets for the classic long form with a parenthetical acronym and appositive patterns. These give near certain acronym to expansion pairs.

```sql no-execute
SELECT (m)[1] AS long_form, (m)[2] AS acronym
FROM (
    SELECT regexp_matches(content, '([A-Z][A-Za-z0-9 ]{3,}?) \(([A-Z]{2,6})\)', 'g') AS m
    FROM documents
) s;
```

2. **Acronym-initial check.** Confirm the candidate acronym matches the initials of its expansion, so `AKS` maps to Azure Kubernetes Service but a coincidental collision is rejected. The mined long form can include leading articles or verbs, so trim it to the trailing phrase whose initials match the acronym before accepting the pair.

3. **Embedding plus neighborhood clusters.** Within a type, cluster names by name plus context embedding and require a shared graph neighborhood before proposing aliases. This catches informal jargon like "the k8s cluster" that has no definition pattern.

4. **Adjudicate and scope.** The agent or `azure_ai.generate()` confirms each candidate group is truly synonymous and picks the canonical, usually the most formal or most frequent form. Scope the decision to the type and neighborhood so "prod" or "Mercury" never merge globally.

Persist learned jargon so it compounds across runs and humans can correct it:

```sql no-execute
CREATE TABLE IF NOT EXISTS jargon_lexicon (
    alias      text NOT NULL,
    canonical  text NOT NULL,
    label      text NOT NULL,          -- the type this jargon is scoped to
    evidence   text,                   -- definition-pattern | acronym-initials | embedding+neighborhood
    confidence real,
    decided_by text NOT NULL DEFAULT 'auto',
    updated_at timestamptz DEFAULT now(),
    PRIMARY KEY (alias, label)
);
```

- **Optional seed.** The user can supply a starter glossary or a `domain_hint` as a prior. It biases learning, it does not dictate; the data can override a wrong prior.
- **Human confirmation.** Present newly learned jargon for review. A `decided_by = 'human'` entry is authoritative and seeds future runs.
- `jargon_lexicon` is reusable term level knowledge; the `entity_canonical` map below is the instance level result it feeds.

## Why names alone fail

- **False merges (homonyms)**: identical or similar names that are different entities. Over-merging silently corrupts the graph.
- **False splits (aliases)**: the same entity written differently, abbreviations, or references like "the gateway service".

Names give a candidate signal. The decision needs context.

## Context signals to use

For each entity mention, gather:

1. **Entity type**: only compare within the same node label. A `Person` never merges with a `Service`.
2. **Graph neighborhood**: the relationships and neighbors already attached. Two "Gateway" nodes that both connect to the same team and service are likely one; two that live in unrelated neighborhoods are likely not.
3. **Source snippet**: the surrounding text the mention came from, which disambiguates homonyms.
4. **Properties**: stable attributes such as an id, owner, or region.

## The strategy ladder (escalate only as needed)

Apply the cheapest strategy that resolves a group, escalating for the hard cases.

1. **exact**: identical strings.
2. **normalized**: fold case, whitespace, and punctuation, then rewrite known aliases through the learned `jargon_lexicon` so "AKS" and "the k8s cluster" collapse onto the canonical before comparison.

```sql no-execute
SELECT lower(regexp_replace(name, '[^a-z0-9]+', ' ', 'gi')) AS norm_key,
       array_agg(DISTINCT name) AS aliases
FROM staging_entities
GROUP BY norm_key
HAVING count(DISTINCT name) > 1;
```

3. **embedding**: embed the name plus a short context string and group near duplicates that normalization misses. On Azure, generate embeddings in the database with the `azure_ai` extension; see [azure-ai-semantic-search](azure-ai-semantic-search.md).
4. **context adjudication**: for the remaining ambiguous candidates, decide using type, neighborhood, and snippet.

## Blocking: keep it scalable

Never compare all pairs. That is quadratic. Generate candidate pairs with cheap blocking, then adjudicate only within blocks:

- Block by **node label** (never cross types).
- Block by **normalized key prefix** or shared token.
- Block by **embedding neighbors**: for each entity, take its approximate nearest neighbors by vector similarity and consider only those as candidates.

```sql no-execute
SELECT a.id AS left_id, b.id AS right_id
FROM entity_embeddings a
JOIN LATERAL (
    SELECT e.id
    FROM entity_embeddings e
    WHERE e.label = a.label AND e.id <> a.id
    ORDER BY e.embedding <=> a.embedding
    LIMIT 5
) b ON TRUE;
```

## Adjudication

For each candidate pair or small cluster, present the model with the entity type, the top neighboring relationships for each side, and a short source snippet per alias, then ask: same entity or not, the canonical name, and a confidence. Batch these to control cost. The agent can adjudicate directly, or on Azure `azure_ai.generate()` can run the same prompt at scale.

Resolve clusters transitively with union find so that if A matches B and B matches C, all three collapse to one canonical, but only when each link clears the confidence threshold. Do not chain weak links into a giant blob.

## Persistent canonical map and human override

Persist decisions so later runs reuse them and humans can correct them.

```sql no-execute
CREATE TABLE IF NOT EXISTS entity_canonical (
    alias      text PRIMARY KEY,
    canonical  text NOT NULL,
    label      text NOT NULL,
    confidence real,
    decided_by text NOT NULL DEFAULT 'auto',
    updated_at timestamptz DEFAULT now()
);
```

Rules:

- On an incremental run, look up existing aliases first and reuse the canonical. Only adjudicate genuinely new mentions.
- A row with `decided_by = 'human'` is authoritative. Never overwrite it with an automated decision.
- Support explicit **merge** (map alias to a canonical) and **split** (remove a wrong mapping and re-adjudicate) as user operations.

## Apply at load time

At MERGE time, resolve each extracted name through the canonical map, then MERGE on the canonical key so aliases converge on one vertex.

```sql no-execute
SELECT *
FROM ag_catalog.cypher('incident_kg', $$
    MERGE (s:Service {name: 'Azure Kubernetes Service'})
    RETURN s
$$) AS (s agtype);
```

## Guarding quality

- **Precision over recall by default**: a missed merge is easy to fix later; a wrong merge silently corrupts the graph and is hard to detect.
- **Spot check**: sample resolved clusters and confirm a handful by hand. Track the rate of human corrections as a quality signal.
- **Threshold tuning**: raise the confidence threshold if you see over-merging, lower it if obvious aliases stay separate.

## Common Mistakes

1. **[CRITICAL] Name-only merging**: Ignoring type and context merges homonyms.
2. **[CRITICAL] All-pairs comparison**: Skipping blocking makes dedup quadratic and unusable at scale.
3. **[HIGH] Chaining weak links**: Union find over low confidence pairs collapses unrelated entities.
4. **[HIGH] Overwriting human decisions**: Automated runs must not replace `decided_by = 'human'` rows.
5. **[MEDIUM] No persistence**: Re-deciding every run wastes cost and yields unstable canonicals.
6. **[HIGH] Hardcoding a jargon dictionary**: A fixed acronym list goes stale and misses domain terms. Learn jargon from the corpus and confirm it, then persist to `jargon_lexicon`.

## Anti-Hallucination Rules

- Do NOT merge entities across different node labels.
- Do NOT merge on name similarity alone. Require type plus at least one context signal.
- Do NOT use unreleased `ai.*` primitives. Use SQL, pgvector, and agent or `azure_ai` adjudication.
- Do NOT let an automated decision override an explicit human correction.
- Do NOT rely on a hardcoded acronym or synonym dictionary. Learn the jargon from the corpus, confirm it, and scope each term to a type.
