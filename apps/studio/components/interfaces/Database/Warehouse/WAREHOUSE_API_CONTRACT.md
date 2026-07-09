# Warehouse API contract (planned)

> **Prototype note:** Studio wholesale branch uses `warehouseDemoStore` only. Endpoints below are the target platform contract; not implemented in this branch.

## Model

- **Project-wide** enable/disable (not per-table hero API)
- Separate **`warehouse.*` host** with **1:1 schema.table names**
- Managed publication: `supabase_warehouse`
- Disable **deletes** all Warehouse replicas; re-enable triggers full backfill

## Endpoints (planned)

### `POST /platform/projects/{ref}/warehouse/enable`

Enable Warehouse for the project.

**Request body:**

```json
{
  "included_schemas": ["public", "storage"]
}
```

**Response:**

```json
{
  "enabled": true,
  "replication_phase": "provisioning",
  "pipeline_id": "7022",
  "warehouse_host": "warehouse.<ref>.supabase.co",
  "publication_name": "supabase_warehouse",
  "included_schemas": ["public", "storage"]
}
```

### `PATCH /platform/projects/{ref}/warehouse/schemas`

Update which schemas are replicated.

**Request body:**

```json
{
  "included_schemas": ["public"]
}
```

Adding schemas triggers backfill for new tables. Removing schemas drops Warehouse replicas for those schemas.

### `DELETE /platform/projects/{ref}/warehouse`

Disable Warehouse and delete all replicas.

**Response:** `204 No Content`

### `GET /platform/projects/{ref}/warehouse`

Project Warehouse status (phase, lag, included schemas, pipeline metadata).

## Table replicated check (Studio)

A table is **replicated** when:

1. Project Warehouse is enabled
2. Table's schema is in `included_schemas`
3. Table is not on the system denylist (e.g. `supabase_migrations`)

Studio table list **Replicated** column is read-only metadata derived from this.

## SQL query target (Studio)

Studio SQL Editor target toggle (`postgres` | `warehouse`) is a **query routing hint** for the execution layer. Wholesale prototype does not route queries; it shows `Served by: Warehouse` in the results footer when Warehouse is selected.

## Config (out of Studio scope)

Notion simplification referenced `[warehouse] enabled = true` in `config.toml`. Studio wholesale MVP does not edit config; enable/disable is project-scoped in the Replication UI.
