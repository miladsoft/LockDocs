import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function getPage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = Number.parseInt(raw ?? '1', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

export function getPageCount(totalItems: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalItems / pageSize))
}

export function clampPage(page: number, pageCount: number) {
  return Math.min(Math.max(1, page), pageCount)
}

export function Pagination({
  page,
  pageCount,
  totalItems,
  pageSize,
  basePath,
  pageParam = 'page',
  preserveParams,
}: {
  page: number
  pageCount: number
  totalItems: number
  pageSize: number
  basePath: string
  pageParam?: string
  preserveParams?: Record<string, string | number | undefined>
}) {
  if (totalItems <= pageSize && pageCount <= 1) return null

  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(totalItems, page * pageSize)

  function href(nextPage: number) {
    const params = new URLSearchParams()
    Object.entries(preserveParams ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value))
    })
    if (nextPage > 1) params.set(pageParam, String(nextPage))
    else params.delete(pageParam)
    const query = params.toString()
    return query ? `${basePath}?${query}` : basePath
  }

  const pages = getVisiblePages(page, pageCount)

  return (
    <div className="flex flex-col gap-4 border-t border-slate-800/80 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium text-slate-300">{start}</span> to <span className="font-medium text-slate-300">{end}</span> of{' '}
        <span className="font-medium text-slate-300">{totalItems}</span>
      </p>
      <nav className="flex items-center justify-between gap-2 sm:justify-end" aria-label="Pagination">
        <PageLink href={href(page - 1)} disabled={page <= 1} ariaLabel="Previous page">
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </PageLink>
        <div className="hidden items-center gap-1 sm:flex">
          {pages.map((item, index) =>
            item === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="flex h-9 w-9 items-center justify-center text-slate-600">
                ...
              </span>
            ) : (
              <Link
                key={item}
                href={href(item)}
                aria-current={item === page ? 'page' : undefined}
                className={cn(
                  'flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors focus-ring',
                  item === page
                    ? 'bg-teal-400 text-slate-950'
                    : 'border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-100',
                )}
              >
                {item}
              </Link>
            ),
          )}
        </div>
        <span className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-400 sm:hidden">
          {page} / {pageCount}
        </span>
        <PageLink href={href(page + 1)} disabled={page >= pageCount} ariaLabel="Next page">
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </PageLink>
      </nav>
    </div>
  )
}

function PageLink({
  href,
  disabled,
  ariaLabel,
  children,
}: {
  href: string
  disabled: boolean
  ariaLabel: string
  children: ReactNode
}) {
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-3 text-sm font-medium text-slate-700"
      >
        {children}
      </span>
    )
  }

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="inline-flex min-h-9 items-center justify-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100 focus-ring"
    >
      {children}
    </Link>
  )
}

function getVisiblePages(page: number, pageCount: number) {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1)

  const pages: Array<number | 'ellipsis'> = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(pageCount - 1, page + 1)

  if (start > 2) pages.push('ellipsis')
  for (let item = start; item <= end; item += 1) pages.push(item)
  if (end < pageCount - 1) pages.push('ellipsis')
  pages.push(pageCount)

  return pages
}
