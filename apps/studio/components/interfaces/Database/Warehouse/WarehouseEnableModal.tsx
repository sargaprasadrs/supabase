import { useParams } from 'common'
import { useEffect, useState } from 'react'
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogSection,
  DialogSectionSeparator,
  DialogTitle,
  Label,
} from 'ui'
import { FormItemLayout } from 'ui-patterns/form/FormItemLayout/FormItemLayout'

import { enableWarehouseProject } from './warehouseDemoStore'
import { useDefaultWarehouseSchemas } from './WarehouseSchemaScope'

interface WarehouseEnableModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WarehouseEnableModal({ open, onOpenChange }: WarehouseEnableModalProps) {
  const { ref: projectRef } = useParams()
  const defaultSchemas = useDefaultWarehouseSchemas()
  const [selectedSchemas, setSelectedSchemas] = useState<string[]>(defaultSchemas)
  const [isEnabling, setIsEnabling] = useState(false)

  useEffect(() => {
    if (open) setSelectedSchemas(defaultSchemas)
  }, [open, defaultSchemas])

  const selectedSet = new Set(selectedSchemas)

  const onToggle = (schema: string, checked: boolean) => {
    setSelectedSchemas((prev) => (checked ? [...prev, schema] : prev.filter((s) => s !== schema)))
  }

  const onEnable = async () => {
    if (!projectRef || selectedSchemas.length === 0) return
    setIsEnabling(true)
    enableWarehouseProject(projectRef, selectedSchemas)
    setIsEnabling(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="medium">
        <DialogHeader>
          <DialogTitle>Enable Warehouse</DialogTitle>
        </DialogHeader>
        <DialogSection>
          <p className="text-sm text-foreground-light">
            Create an analytical replica of your Postgres data on a separate Warehouse endpoint.
            Tables use the same schema and table names (for example, <code>public.events</code>).
          </p>
          <p className="text-sm text-foreground-light mt-3">
            Select which schemas to replicate. You can change this later from the Warehouse card.
          </p>
          <div className="flex flex-col gap-y-2 max-h-64 overflow-y-auto mt-4">
            {defaultSchemas.map((schema) => (
              <FormItemLayout
                key={schema}
                isReactForm={false}
                layout="flex"
                label={schema}
                className="items-center"
              >
                <Checkbox
                  id={`enable-warehouse-schema-${schema}`}
                  checked={selectedSet.has(schema)}
                  onCheckedChange={(checked) => onToggle(schema, checked === true)}
                />
                <Label htmlFor={`enable-warehouse-schema-${schema}`} className="sr-only">
                  Include schema {schema}
                </Label>
              </FormItemLayout>
            ))}
          </div>
          <Button
            variant="default"
            onClick={() => setSelectedSchemas(defaultSchemas)}
            className="mt-3"
          >
            Select all
          </Button>
        </DialogSection>
        <DialogSectionSeparator />
        <DialogFooter>
          <Button variant="default" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={isEnabling} disabled={selectedSchemas.length === 0} onClick={onEnable}>
            Enable Warehouse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
