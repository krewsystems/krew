import { BadgeCheck, CircleCheck, FileText, Lightbulb, Sparkles, TriangleAlert, UsersRound, type LucideIcon } from 'lucide-react'
import type { PostType } from '@/data/types'

export const POST_TYPES: Record<PostType, { label: string; plural: string; icon: LucideIcon }> = {
  insight: { label: 'Insight', plural: 'Insights', icon: Lightbulb },
  alert: { label: 'Alert', plural: 'Alerts', icon: TriangleAlert },
  recommendation: { label: 'Recommendation', plural: 'Recommendations', icon: Sparkles },
  collaboration: { label: 'Collaboration', plural: 'Collaboration', icon: UsersRound },
  approval: { label: 'Needs approval', plural: 'Approvals', icon: BadgeCheck },
  report: { label: 'Report', plural: 'Reports', icon: FileText },
  task: { label: 'Completed', plural: 'Completed', icon: CircleCheck },
}
