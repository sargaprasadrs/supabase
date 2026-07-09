import { useParams } from 'common'
import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogSection,
  DialogSectionSeparator,
  DialogTitle,
} from 'ui'
import { Admonition } from 'ui-patterns/admonition'

import { disableWarehouseProject } from './warehouseDemoStore'

interface WarehouseDisableModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WarehouseDisableModal({ open, onOpenChange }: WarehouseDisableModalProps) {
  const { ref: projectRef } = useParams()
  const [isDisabling, setIsDisabling] = useState(false)

  const onDisable = async () => {
    if (!projectRef) return
    setIsDisabling(true)
    disableWarehouseProject(projectRef)
    setIsDisabling(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="medium">
        <DialogHeader>
          <DialogTitle>Disable Warehouse?</DialogTitle>
        </DialogHeader>
        <DialogSection>
          <p className="text-sm text-foreground-light mb-4">
            This deletes all Warehouse replicas for this project.
          </p>
          <Admonition
            type="destructive"
            title="Warehouse data will be deleted"
            description="Disabling Warehouse removes all replicated tables from the Warehouse endpoint. Re-enabling requires a full backfill."
          />
        </DialogSection>
        <DialogSectionSeparator />
        <DialogFooter>
          <Button variant="default" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="danger" loading={isDisabling} onClick={onDisable}>
            Disable Warehouse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
