# Warehouse Wholesale MVP

Branch: `dnywh/prototype/warehouse-wholesale`

## Intent

Project-wide Warehouse prototype for Studio. Postgres remains the transactional database; Warehouse is an analytical replica on a **separate `warehouse.*` host** with **1:1 schema and table names** (`public.events` on both).

All platform behavior is mocked via `warehouseDemoStore` (localStorage). No real API endpoints.

## In scope

- **Replication page** — `WarehouseProjectCard` (enable/disable, schema scope, observability)
- **Destinations table** — read-only managed row (`DuckLake` / `supabase_warehouse`)
- **Table list** — read-only **Replicated** column
- **SQL Editor** — Postgres / Warehouse target toggle + mock "Served by: Warehouse" footer
- **Connect sheet** — Warehouse tab with connection credentials when enabled
- **Feature flag** — `useIsWarehouseEnabled` (ConfigCat `warehouse` org slug allowlist)

## Out of scope

- Per-table enablement hero UX
- `?view=warehouse`, table-detail storage tab
- `public_warehouse.*` FDW naming (pre-pivot model)
- Catalog integration install gate
- Real query routing to Warehouse
- config.toml editing in Studio

## Demo store

State key: `supabase-warehouse-wholesale-demo` in localStorage, keyed by project ref.

```ts
// apps/studio/components/interfaces/Database/Warehouse/warehouseDemoStore.ts
enableWarehouseProject(projectRef, includedSchemas)
disableWarehouseProject(projectRef)
updateWarehouseIncludedSchemas(projectRef, schemas)
isTableReplicated(projectRef, schema, table)
```

Enable simulates `provisioning` → `backfilling` → `streaming` phase progression.

## QA checklist

1. Flag off → no Warehouse UI
2. Flag on, disabled → Replication card with Enable CTA only
3. Enable → observability metrics, schema checkboxes, Destinations row, Replicated column, SQL toggle, Connect Warehouse tab
4. Uncheck schema → tables in that schema show Replicated = No
5. Disable → confirm destructive modal, all Warehouse UI hidden
