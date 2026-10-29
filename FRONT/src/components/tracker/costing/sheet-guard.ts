import { createContext, useContext } from 'react'

export interface SheetGuard {
  /** The editor reports unsaved changes here so closing or leaving can ask first. */
  setDirty: (dirty: boolean) => void
  /** Runs the action now, or after the person confirms discarding unsaved changes. */
  guard: (action: () => void) => void
}

export const GuardContext = createContext<SheetGuard>({ setDirty: () => {}, guard: (a) => a() })
export const useSheetGuard = () => useContext(GuardContext)
