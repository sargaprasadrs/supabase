import { useParams } from 'common'
import { useMemo } from 'react'
import { Checkbox, Label } from 'ui'
import { FormItemLayout } from 'ui-patterns/form/FormItemLayout/FormItemLayout'

import {
  getDefaultIncludedSchemas,
  isReplicableSchema,
  updateWarehouseIncludedSchemas,
  useWarehouseProjectState,
} from './warehouseDemoStore'
import { useSchemasQuery } from '@/data/database/schemas-query'

interface WarehouseSchemaScopeProps {
  disabled?: boolean
}

export function WarehouseSchemaScope({ disabled = false }: WarehouseSchemaScopeProps) {
  const { ref: projectRef } = useParams()
  const { data: schemas = [] } = useSchemasQuery({ projectRef })
  const warehouseState = useWarehouseProjectState(projectRef)

  const replicableSchemas = useMemo(
    () =>
      schemas
        .map((s) => s.name)
        .filter(isReplicableSchema)
        .sort(),
    [schemas]
  )

  const includedSet = new Set(warehouseState.includedSchemas)

  const onToggle = (schema: string, checked: boolean) => {
    if (!projectRef) return
    const next = checked
      ? [...warehouseState.includedSchemas, schema]
      : warehouseState.includedSchemas.filter((s) => s !== schema)
    updateWarehouseIncludedSchemas(projectRef, next)
  }

  if (!warehouseState.enabled) return null

  return (
    <div className="flex flex-col gap-y-3">
      <div>
        <p className="text-sm text-foreground">Replicated schemas</p>
        <p className="text-sm text-foreground-light">
          Tables in selected schemas are replicated to Warehouse with the same schema and table
          names.
        </p>
      </div>
      <div className="flex flex-col gap-y-2">
        {replicableSchemas.map((schema) => (
          <FormItemLayout
            key={schema}
            isReactForm={false}
            layout="flex"
            label={schema}
            className="items-center"
          >
            <Checkbox
              id={`warehouse-schema-${schema}`}
              checked={includedSet.has(schema)}
              disabled={disabled}
              onCheckedChange={(checked) => onToggle(schema, checked === true)}
            />
            <Label htmlFor={`warehouse-schema-${schema}`} className="sr-only">
              Replicate schema {schema}
            </Label>
          </FormItemLayout>
        ))}
        {replicableSchemas.length === 0 && (
          <p className="text-sm text-foreground-light">No replicable schemas found.</p>
        )}
      </div>
    </div>
  )
}

export function useDefaultWarehouseSchemas(): string[] {
  const { ref: projectRef } = useParams()
  const { data: schemas = [] } = useSchemasQuery({ projectRef })
  return useMemo(() => getDefaultIncludedSchemas(schemas.map((s) => s.name)), [schemas])
}
