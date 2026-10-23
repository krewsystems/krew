import { getAgent } from '@/data/agents'
import type { AgentDefinition, Hire } from '@/data/types'
import { useWorkspace } from '@/store/krew'

export interface AgentView extends AgentDefinition {
  hire?: Hire
  displayName: string
  color: string
}

/** Agent definition merged with this workspace's hire (custom name and accent). */
export function useAgentView(agentId: string): AgentView {
  const ws = useWorkspace()
  return resolveAgent(agentId, ws.hires)
}

export function resolveAgent(agentId: string, hires: Hire[]): AgentView {
  const def = getAgent(agentId)
  const hire = hires.find((h) => h.agentId === agentId)
  return {
    ...def,
    hire,
    displayName: hire?.settings.displayName || def.name,
    color: hire?.settings.accent || def.accent,
  }
}

export function useAgentResolver() {
  const ws = useWorkspace()
  return (agentId: string) => resolveAgent(agentId, ws.hires)
}
