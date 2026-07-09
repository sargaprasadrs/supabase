import { useQuery } from '@tanstack/react-query'
import { useParams } from 'common'

import {
  searchAuthUserByEmail,
  searchAuthUserById,
} from '@/components/interfaces/UserJourneys/UserJourneys.queries'
import { useSelectedProjectQuery } from '@/hooks/misc/useSelectedProject'
import { UUID_REGEX } from '@/lib/constants'

export interface ResolvedLogUser {
  /** The raw identifier from the URL (id or email). */
  identifier: string
  /** Resolved email, if an auth.users row was found (or the identifier itself when it's an email). */
  email: string | null
  /** Resolved auth.users id, if one exists. Null for e.g. a failed signup with no row. */
  userId: string | null
  /** Whether an auth.users row matched. False is normal for failed signups. */
  exists: boolean
}

/**
 * Resolves a Unified Logs `?user=` identifier (email or id) into display info for the
 * active-filter notice. Reuses the same identity-resolution queries the parked user-journey
 * timeline depends on. Display-only — the log SQL matches the raw `?user=` value directly.
 */
export function useResolvedLogUser(identifier: string | null | undefined) {
  const { ref: projectRef } = useParams()
  const { data: project } = useSelectedProjectQuery()
  const connectionString = project?.connectionString ?? null
  const id = identifier?.trim() ?? ''

  return useQuery<ResolvedLogUser | null>({
    queryKey: ['unified-logs-resolve-user', projectRef, connectionString, id],
    enabled: Boolean(projectRef) && id.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const isId = UUID_REGEX.test(id)
      const user = isId
        ? await searchAuthUserById(projectRef!, connectionString, id)
        : await searchAuthUserByEmail(projectRef!, connectionString, id)

      if (!user) {
        return { identifier: id, email: isId ? null : id, userId: isId ? id : null, exists: false }
      }
      return { identifier: id, email: user.email, userId: user.id, exists: true }
    },
  })
}
