import { Activity, Lightbulb, MessagesSquare, UsersRound, type LucideIcon } from 'lucide-react'

export type LunaSectionId = 'pulse' | 'cases' | 'conversations' | 'insights'

export interface LunaSection {
  id: LunaSectionId
  label: string
  icon: LucideIcon
}

export const LUNA_SECTIONS: LunaSection[] = [
  { id: 'pulse', label: 'Customer pulse', icon: Activity },
  { id: 'cases', label: 'Opportunities and attention', icon: UsersRound },
  { id: 'conversations', label: 'Conversations', icon: MessagesSquare },
  { id: 'insights', label: 'Insights', icon: Lightbulb },
]

export function lunaSection(id: string | undefined): LunaSection {
  return LUNA_SECTIONS.find((s) => s.id === id) ?? LUNA_SECTIONS[0]
}

export function lunaPath(id: LunaSectionId, search = ''): string {
  return `${id === 'pulse' ? '/krew/luna/workspace' : `/krew/luna/workspace/${id}`}${search}`
}
