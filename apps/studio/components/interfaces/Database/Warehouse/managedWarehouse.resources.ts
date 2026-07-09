export const SUPABASE_MANAGED_WAREHOUSE_RESOURCE_NAME = 'supabase_warehouse'

export function isSupabaseManagedWarehousePublicationName(name: string): boolean {
  return name === SUPABASE_MANAGED_WAREHOUSE_RESOURCE_NAME
}

export const MANAGED_WAREHOUSE_PUBLICATION_TOOLTIP =
  'Managed by Supabase for Warehouse replication. Configure schemas on the Warehouse card above.'
