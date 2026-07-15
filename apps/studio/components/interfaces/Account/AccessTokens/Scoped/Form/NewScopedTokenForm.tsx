import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronRight } from 'lucide-react'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Form, ScrollArea, Separator, SheetClose, SheetFooter } from 'ui'

import { countConfigured, PermissionMode } from '../../AccessToken.permissions'
import { DEFAULT_EXPIRY, TokenFormSchema, TokenFormValues } from './NewScopedTokenForm.utils'
import { NewScopedTokenFormReview } from './NewScopedTokenFormReview'
import { PermissionsAccordion } from './PermissionsAccordion'
import { ResourceAccessStep } from './ResourceAccessStep'
import { StepIndicator } from './StepIndicator'
import { TokenDetails } from './TokenDetails'

const FORM_ID = 'scoped-token-form'

const DEFAULT_VALUES: TokenFormValues = {
  tokenName: '',
  expiresAt: DEFAULT_EXPIRY,
  customExpiryDate: undefined,
  resourceAccess: 'project',
  organizationSlugs: [],
  projectRefs: [],
  accountConfirmed: false,
  permissions: {},
}

export const NewScopedTokenForm = ({
  isPending,
  onCreateToken,
}: {
  isPending: boolean
  onCreateToken: (values: TokenFormValues) => void
}) => {
  const form = useForm<TokenFormValues>({
    resolver: zodResolver(TokenFormSchema),
    validate: ({ formValues }) => {
      if (formValues.resourceAccess === 'account') {
        if (!formValues.accountConfirmed) return 'Confirm account-level access to continue.'
      }
      return true
    },
    defaultValues: DEFAULT_VALUES,
    mode: 'onChange',
  })
  const [step, setStep] = useState<'form' | 'review'>('form')
  const [showZeroWarning, setShowZeroWarning] = useState(false)
  const resourceSectionRef = useRef<HTMLDivElement>(null)
  const values = form.watch()
  const selection = values.permissions
  const configuredCount = countConfigured(selection)

  const handleReviewAccess = async () => {
    if (configuredCount === 0) setShowZeroWarning(true)
    setStep('review')
  }

  const handlePermissionChange = (key: string, mode: PermissionMode) => {
    form.setValue('permissions', { ...selection, [key]: mode })
    if (mode !== 'none') setShowZeroWarning(false)
  }

  return (
    <>
      <ScrollArea className="flex-1">
        {step === 'form' ? (
          <Form {...form}>
            <form id={FORM_ID} onSubmit={form.handleSubmit(handleReviewAccess)}>
              <TokenDetails form={form} />
              <Separator />
              <div ref={resourceSectionRef}>
                <ResourceAccessStep form={form} />
              </div>
              <Separator />
              <PermissionsAccordion
                selection={selection}
                onChange={handlePermissionChange}
                showZeroWarning={showZeroWarning}
              />
            </form>
          </Form>
        ) : (
          <NewScopedTokenFormReview values={values} />
        )}
      </ScrollArea>
      <SheetFooter className="mt-auto flex w-full items-center justify-between! border-t py-4">
        <StepIndicator step={1} total={2} label="Configure" />
        <div className="flex gap-2">
          {step === 'review' && (
            <Button variant="default" disabled={isPending} onClick={() => setStep('form')}>
              Back
            </Button>
          )}
          <SheetClose asChild disabled={isPending}>
            <Button variant="default">Cancel</Button>
          </SheetClose>
          {step === 'form' ? (
            <Button type="submit" form={FORM_ID} iconRight={<ChevronRight />}>
              Review access
            </Button>
          ) : (
            <Button loading={isPending} onClick={() => onCreateToken(form.getValues())}>
              Create token
            </Button>
          )}
        </div>
      </SheetFooter>
    </>
  )
}
