import { FolderKanban, Layers, Megaphone, Rocket, Snowflake, type LucideIcon } from 'lucide-react'
import type { BadgeTone } from '@/components/arc/badge/badge'
import type { ProjectStatus, ProjectType } from '@/data/tracker/types'

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; tone: BadgeTone }> = {
  planning: { label: 'Planning', tone: 'info' },
  active: { label: 'Active', tone: 'success' },
  completed: { label: 'Completed', tone: 'neutral' },
  archived: { label: 'Archived', tone: 'neutral' },
}
export const STATUS_ORDER: ProjectStatus[] = ['active', 'planning', 'completed', 'archived']

export const PROJECT_TYPE: Record<ProjectType, string> = {
  season: 'Season',
  collection: 'Collection',
  launch: 'Product launch',
  campaign: 'Marketing campaign',
  other: 'Other',
}

/** One restrained accent per project type, drawn from the existing palette, so cards are easy to tell apart at a glance. */
export const PROJECT_TYPE_STYLE: Record<ProjectType, { color: string; icon: LucideIcon }> = {
  season: { color: 'var(--sales)', icon: Snowflake },
  collection: { color: 'var(--agent-store)', icon: Layers },
  launch: { color: 'var(--agent-tracker)', icon: Rocket },
  campaign: { color: 'var(--agent-ads)', icon: Megaphone },
  other: { color: 'var(--text-muted)', icon: FolderKanban },
}
