import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface PanelProps {
  title?: ReactNode
  icon?: ReactNode
  description?: ReactNode
  href?: string
  hrefLabel?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  as?: 'section' | 'div' | 'article'
}

/** The standard white surface: hairline border, quiet header, optional "open" arrow. */
export function Panel({ title, icon, description, href, hrefLabel = 'Open', actions, children, className, bodyClassName, as: Tag = 'section' }: PanelProps) {
  return (
    <Tag className={cn('flex min-w-0 flex-col rounded-[var(--radius-panel)] border border-line bg-panel shadow-[var(--shadow-resting)]', className)}>
      {(title || actions || href) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            {title && (
              <h2 className="flex items-center gap-2 text-[14.5px] font-medium tracking-[-0.01em] text-ink">
                {icon && <span className="text-ink-3 [&>svg]:size-4">{icon}</span>}
                {title}
              </h2>
            )}
            {description && <p className="mt-0.5 text-[13px] text-ink-3">{description}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            {href && (
              <Link
                to={href}
                aria-label={hrefLabel}
                className="-mr-1.5 -mt-0.5 inline-flex size-7 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-sunken hover:text-ink"
              >
                <ArrowUpRight className="size-4" strokeWidth={1.75} />
              </Link>
            )}
          </div>
        </header>
      )}
      <div className={cn('min-w-0 flex-1 px-5 pb-5 pt-3', bodyClassName)}>{children}</div>
    </Tag>
  )
}

export function PageHeader({ title, description, actions, children }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[26px] font-medium leading-tight tracking-[-0.025em] text-ink sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[14px] text-ink-2">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Page({ children, className, wide = false }: { children: ReactNode; className?: string; wide?: boolean }) {
  return <div className={cn('mx-auto w-full px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pt-8', wide ? 'max-w-[1480px]' : 'max-w-[1280px]', className)}>{children}</div>
}


/** Small numeric readout used inside cards and embeds. */
export function Stat({ label, value, change, tone = 'neutral', size = 'md' }: { label: string; value: ReactNode; change?: string; tone?: 'good' | 'bad' | 'neutral'; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-[12.5px] text-ink-3">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className={cn('tabular truncate font-normal tracking-[-0.02em] text-ink', size === 'lg' ? 'text-[30px] font-light' : size === 'md' ? 'text-[20px]' : 'text-[16px]')}>{value}</span>
        {change && (
          <span className={cn('tabular text-[12px]', tone === 'good' ? 'text-good' : tone === 'bad' ? 'text-bad' : 'text-ink-3')}>{change}</span>
        )}
      </div>
    </div>
  )
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-line-subtle', className)} />
}

export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-2 py-0.5 text-[12px] text-ink-2', className)}>{children}</span>
}
