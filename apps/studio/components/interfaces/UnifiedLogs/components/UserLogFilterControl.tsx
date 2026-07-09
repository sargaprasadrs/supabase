import { useParams } from 'common'
import { User, X } from 'lucide-react'
import { parseAsString, useQueryState } from 'nuqs'
import { useEffect, useState, type KeyboardEvent } from 'react'
import { Button, InputGroup, InputGroupAddon, InputGroupInput } from 'ui'

import { searchAuthUserByEmail } from '@/components/interfaces/UserJourneys/UserJourneys.queries'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'
import { UUID_REGEX } from '@/lib/constants'

/**
 * Dedicated "filter by user" control for Unified Logs. Writes the `?user=` key
 * (not the generic `filter=` array) since the filter is cross-cutting — see
 * SEARCH_PARAMS_PARSER / applySearchParamsFilter. An email is resolved to a user id
 * on submit (so it also matches postgres error text, which carries the id not the
 * email); an identifier with no auth.users row is kept as-is so failed signups still
 * match on their auth email.
 */
export const UserLogFilterControl = () => {
  const { ref: projectRef } = useParams()
  const { data: project } = useSelectedProjectQuery()

  const [user, setUser] = useQueryState('user', parseAsString)
  const [value, setValue] = useState(user ?? '')
  const [isResolving, setIsResolving] = useState(false)

  // Keep the input in sync when the filter is set/cleared elsewhere (deep link, clear button).
  useEffect(() => {
    setValue(user ?? '')
  }, [user])

  const apply = async () => {
    const raw = value.trim()
    if (!raw) {
      setUser(null)
      return
    }
    if (UUID_REGEX.test(raw) || !raw.includes('@')) {
      setUser(raw)
      return
    }
    // Email → resolve to id where an account exists; fall back to the raw email otherwise.
    setIsResolving(true)
    try {
      const resolved = await searchAuthUserByEmail(
        projectRef!,
        project?.connectionString ?? null,
        raw
      ).catch(() => undefined)
      setUser(resolved?.id ?? raw)
    } finally {
      setIsResolving(false)
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      apply()
    }
  }

  return (
    <div className="px-2 pt-2 pb-1 flex flex-col gap-1.5">
      <span className="text-xs text-foreground-light">Filter by user</span>
      <InputGroup>
        <InputGroupInput
          size="tiny"
          placeholder="Email or user id"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={apply}
          disabled={isResolving}
        />
        <InputGroupAddon>
          <User size={14} />
        </InputGroupAddon>
        {user ? (
          <InputGroupAddon align="inline-end">
            <Button
              type="button"
              variant="text"
              size="tiny"
              className="px-1"
              aria-label="Clear user filter"
              icon={<X size={14} />}
              onClick={() => setUser(null)}
            />
          </InputGroupAddon>
        ) : null}
      </InputGroup>
    </div>
  )
}
