import { Button } from 'ui'
import { Admonition } from 'ui-patterns/admonition'

import { useResolvedLogUser } from '../hooks/useResolvedLogUser'

interface UserLogFilterNoticeProps {
  /** The active `?user=` identifier. */
  identifier: string
  /** True once loading has settled and no rows are attributable to this user. */
  isEmpty: boolean
  onClear: () => void
  className?: string
}

/**
 * Persistent notice shown while the user filter is active. Honesty requirement: it
 * always states that coverage is partial (some sources can't be attributed and are
 * hidden), and on an empty result it surfaces the likely cause — auth event logs not
 * being enabled — as a system condition rather than reading as "no such user".
 */
export const UserLogFilterNotice = ({
  identifier,
  isEmpty,
  onClear,
  className,
}: UserLogFilterNoticeProps) => {
  const { data: resolved } = useResolvedLogUser(identifier)
  const label = resolved?.email ?? identifier

  const clearAction = (
    <Button type="button" variant="default" size="tiny" onClick={onClear}>
      Clear
    </Button>
  )

  if (isEmpty) {
    return (
      <Admonition
        type="warning"
        className={className}
        title={`No logs attributable to ${label} in the selected time range`}
        description="Auth event logs may not be enabled for this project. Some log sources also can't be filtered by user and are hidden."
        actions={clearAction}
      />
    )
  }

  return (
    <Admonition
      type="default"
      className={className}
      title={`Showing logs attributable to ${label}`}
      description="Some sources can't be filtered by user and are hidden."
      actions={clearAction}
    />
  )
}
