import { AiOrb } from '@/components/ui/ai-orb'
import { getPersona } from '@/data/personas'
import { agentPortrait } from '@/data/photos'
import { cn } from '@/lib/utils'

/**
 * Large agent portrait for profiles and the Manager's note. Uses the temporary character art;
 * agents without art fall back to skecher's orb tinted with their colour.
 */
export function AgentPortrait({ agentId, size = 56, className, shape = 'circle' }: { agentId: string; size?: number; className?: string; shape?: 'circle' | 'card' }) {
  const persona = getPersona(agentId)
  const photo = agentPortrait(agentId)
  return (
    <div
      className={cn('relative shrink-0 overflow-hidden bg-sunken', shape === 'circle' ? 'rounded-full' : 'rounded-[26px]', className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {photo ? (
        <img src={photo} alt="" draggable={false} className="size-full object-cover" decoding="async" />
      ) : (
        <AiOrb className="h-full w-full" backgroundColor="#1b1b1b" primaryColor="#f5f5f5" secondaryColor={persona.tint} speed={0.5} strandWidth={0.45} interactive={false} ariaLabel="" />
      )}
    </div>
  )
}
