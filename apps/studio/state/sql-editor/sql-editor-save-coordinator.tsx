import { useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type PropsWithChildren,
} from 'react'
import { toast } from 'sonner'

import { hasUnsavedChanges } from './sql-editor-lifecycle'
import { createSaveMechanism } from './sql-editor-save'
import { createSaveScheduler, type SaveMode, type SaveScheduler } from './sql-editor-save-scheduler'
import { sqlEditorState } from './sql-editor-state'
import { useIsSqlEditorManualSaveEnabled } from '@/components/interfaces/App/FeaturePreview/FeaturePreviewContext'
import { upsertContent } from '@/data/content/content-upsert-mutation'
import { contentKeys } from '@/data/content/keys'
import { createSQLSnippetFolder } from '@/data/content/sql-folder-create-mutation'
import { updateSQLSnippetFolder } from '@/data/content/sql-folder-update-mutation'

type SaveCoordinator = Pick<SaveScheduler, 'requestSave'>

const SqlEditorSaveCoordinatorContext = createContext<SaveCoordinator | null>(null)

/**
 * Wires the SQL editor save mechanism + scheduler and arms the auto-save trigger
 * for as long as it's mounted. Lives here (rather than at module load) so that
 * query invalidation uses the React Query client from context, and the
 * subscription is started/stopped deterministically — and is testable.
 *
 * Exposes `requestSave` (the explicit-save entry, e.g. Cmd+S) via context.
 */
export function SqlEditorSaveCoordinatorProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()

  const isManualSaveEnabled = useIsSqlEditorManualSaveEnabled()
  const saveModeRef = useRef<SaveMode>('auto')
  useEffect(() => {
    saveModeRef.current = isManualSaveEnabled ? 'manual' : 'auto'
  }, [isManualSaveEnabled])

  const scheduler = useMemo(() => {
    const mechanism = createSaveMechanism({
      state: sqlEditorState,
      upsertContent,
      createSQLSnippetFolder,
      updateSQLSnippetFolder,
      notify: toast,
      invalidate: async (projectRef: string) => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: contentKeys.count(projectRef, 'sql') }),
          queryClient.invalidateQueries({ queryKey: contentKeys.sqlSnippets(projectRef) }),
          queryClient.invalidateQueries({ queryKey: contentKeys.folders(projectRef) }),
        ])
      },
    })
    // getSaveMode is invoked synchronously from a Valtio `subscribe` callback,
    // outside React's render cycle, so it can't read reactive state directly.
    // Route it through a ref that's kept in sync via the effect above instead.
    return createSaveScheduler({
      state: sqlEditorState,
      saveMechanism: mechanism,
      notify: toast,
      getSaveMode: () => saveModeRef.current,
    })
  }, [queryClient])

  useEffect(() => scheduler.start(), [scheduler])

  // Warn before the tab is closed/reloaded while any snippet still has unsaved
  // work (a failed save, a save in flight, or a never-saved snippet). In-app
  // navigation isn't guarded — the store survives client-side route changes, so
  // nothing is lost. Browsers only allow the native prompt here, not a custom one.
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const hasUnsaved = Object.values(sqlEditorState.snippets).some((stateSnippet) =>
        hasUnsavedChanges(stateSnippet.snippet.status)
      )
      if (hasUnsaved) {
        event.preventDefault()
        event.returnValue = true
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  return (
    <SqlEditorSaveCoordinatorContext.Provider value={scheduler}>
      {children}
    </SqlEditorSaveCoordinatorContext.Provider>
  )
}

export function useSqlEditorSaveCoordinator() {
  const coordinator = useContext(SqlEditorSaveCoordinatorContext)
  if (coordinator === null) {
    throw new Error(
      'useSqlEditorSaveCoordinator must be used within a SqlEditorSaveCoordinatorProvider'
    )
  }
  return coordinator
}
