'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: '▦' },
  { href: '/upload', label: 'Upload', icon: '↑' },
  { href: '/documents', label: 'Documents', icon: '⎘' },
  { href: '/shares', label: 'Shares', icon: '⇅' },
  { href: '/activity', label: 'Activity', icon: '≡' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center">
            <span className="text-white text-sm">V</span>
          </div>
          <span className="font-bold text-white">Vaultix</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname.startsWith(href) && href !== '/dashboard'
                ? 'bg-indigo-600/20 text-indigo-400'
                : pathname === href && href === '/dashboard'
                  ? 'bg-indigo-600/20 text-indigo-400'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
            )}
          >
            <span className="text-base leading-none">{icon}</span>
            {label}
          </Link>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-800">
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
          >
            <span>⏎</span> Sign out
          </button>
        </form>
      </div>
    </aside>
  )
}
