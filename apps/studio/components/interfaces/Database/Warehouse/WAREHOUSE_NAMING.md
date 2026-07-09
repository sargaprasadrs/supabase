# Warehouse product naming

Studio copy for Warehouse uses **replicate** as the shared verb and **qualified nouns** for the destination. The goal is one replication mental model across destinations (Warehouse, read replicas, external pipelines) without teaching another product concept.

## Principles

1. **Verb stays lean** — `replicate`, `replicating`, `stop replicating`
2. **Noun carries the destination** — always qualify: **Warehouse replica**, **read replica**
3. **Never bare "replica"** in user-facing UI without a destination prefix
4. **Avoid loaded terms** — do not use `link`, `linked`, `copy`, or `mirror` in product copy (platform API types may still use them)

## Endpoint model (wholesale MVP)

Warehouse uses a **separate host** with **identical schema and table names**:

| Postgres (transactional)     | Warehouse (analytical)              |
| ---------------------------- | ----------------------------------- |
| `public.events`              | `public.events`                     |
| Host: `db.<ref>.supabase.co` | Host: `warehouse.<ref>.supabase.co` |

Do **not** use `public_warehouse.events` or other renamed schemas in user-facing copy. That was a pre-pivot exploration.

## User-facing vocabulary

| Concept              | Use                                                       | Avoid                                 |
| -------------------- | --------------------------------------------------------- | ------------------------------------- |
| Project action       | **Enable Warehouse**                                      | Turn on Warehouse, Link project       |
| In progress          | **Replicating** / **Backfilling**                         | Syncing, Linking                      |
| Steady state         | **Streaming** / **Active**                                | Replica live (unless emphasis needed) |
| The analytical table | **Warehouse replica** (`public.events` on Warehouse host) | Linked table, Warehouse copy          |
| Ongoing process      | **Warehouse replication**                                 | Warehouse link, sync                  |
| Remove               | **Disable Warehouse**                                     | Unlink, Detach, Delete copy           |
| Table list column    | **Replicated** (generic; not Warehouse-branded)           | Warehouse column, Linked              |
| Postgres product     | **Read replica**                                          | Replica (alone)                       |

## Status labels

| Internal phase | UI label (Destinations) | UI label (card chip) |
| -------------- | ----------------------- | -------------------- |
| `provisioning` | Starting                | Starting             |
| `backfilling`  | Backfilling             | Backfilling          |
| `streaming`    | Active                  | Active               |
| `failed`       | Failed                  | Failed               |

## Example copy

| Surface                | Copy                                                |
| ---------------------- | --------------------------------------------------- |
| Enable CTA             | Enable Warehouse                                    |
| Enable dialog title    | Enable Warehouse                                    |
| Disable confirm title  | Disable Warehouse?                                  |
| Disable confirm body   | This deletes all Warehouse replicas                 |
| Replication card (off) | Analytical replica on a separate Warehouse endpoint |
| SQL Editor toggle      | Postgres \| Warehouse                               |
| SQL Editor footer      | Served by: Warehouse                                |
| Connect tab            | Warehouse                                           |

## Internal code (not user-facing)

| Internal             | Meaning                         |
| -------------------- | ------------------------------- |
| `includedSchemas`    | Schemas replicated to Warehouse |
| `replicationPhase`   | Project pipeline phase          |
| `publicationName`    | `supabase_warehouse` (managed)  |
| `warehouseDemoStore` | Prototype mock state            |

See `WAREHOUSE_API_CONTRACT.md` for planned platform endpoints.

## Terms we rejected

| Term                        | Why                                                 |
| --------------------------- | --------------------------------------------------- |
| **Link / linked**           | Reads like foreign keys or ETL pipeline config      |
| **Copy**                    | Implies a one-off snapshot, not ongoing replication |
| **public_warehouse schema** | Pre-pivot; replaced by 1:1 endpoint mapping         |
