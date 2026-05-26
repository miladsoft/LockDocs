import Link from 'next/link'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8', className)}>
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  description,
  eyebrow,
  action,
  className,
}: {
  title: string
  description?: string
  eyebrow?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">{eyebrow}</p>}
        <h1 className="truncate text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}

export function Surface({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('surface rounded-xl', className)}>{children}</div>
}

export function StatusBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', className)}>
      {children}
    </span>
  )
}

export function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  tone = 'teal',
}: {
  label: string
  value: ReactNode
  helper?: string
  icon: LucideIcon
  tone?: 'teal' | 'indigo' | 'emerald' | 'amber' | 'red'
}) {
  const tones = {
    teal: 'bg-teal-400/10 text-teal-300 ring-teal-400/20',
    indigo: 'bg-indigo-400/10 text-indigo-300 ring-indigo-400/20',
    emerald: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20',
    amber: 'bg-amber-400/10 text-amber-300 ring-amber-400/20',
    red: 'bg-red-400/10 text-red-300 ring-red-400/20',
  }

  return (
    <Surface className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{value}</p>
          {helper && <p className="mt-2 text-xs text-slate-500">{helper}</p>}
        </div>
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1', tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Surface>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  href,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  href?: string
  action?: string
}) {
  return (
    <Surface className="px-5 py-12 text-center sm:px-8 sm:py-16">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-800/90 text-slate-300 ring-1 ring-slate-700">
        <Icon className="h-7 w-7" />
      </div>
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      {href && action && (
        <Link
          href={href}
          className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg bg-teal-500 px-4 text-sm font-medium text-slate-950 transition-colors hover:bg-teal-400 focus-ring"
        >
          {action}
        </Link>
      )}
    </Surface>
  )
}
