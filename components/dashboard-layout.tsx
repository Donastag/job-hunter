'use client'

import { useState, useCallback } from 'react'
import { authClient } from '@/lib/auth-client'
import { useIdleTimeout } from '@/hooks/use-idle-timeout'
import {
  Home,
  Briefcase,
  Users,
  Settings,
  Menu,
  X,
  LogOut
} from 'lucide-react'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [warnSeconds, setWarnSeconds] = useState<number | null>(null)

  const handleIdle = useCallback(() => {
    authClient.signOut({ fetchOptions: { onSuccess: () => { window.location.href = '/auth/signin' } } })
  }, [])

  const handleWarn = useCallback((secs: number) => {
    setWarnSeconds(secs)
  }, [])

  const handleActivity = useCallback(() => {
    setWarnSeconds(null)
  }, [])

  useIdleTimeout(handleIdle, handleWarn, handleActivity)

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Jobs', href: '/jobs', icon: Briefcase },
    { name: 'Pipeline', href: '/pipeline', icon: Users },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Idle warning banner */}
      {warnSeconds !== null && (
        <div className="fixed top-0 inset-x-0 z-50 bg-amber-500 text-white text-sm font-medium text-center py-2 shadow-lg">
          Session expiring in {warnSeconds}s due to inactivity — move your mouse to stay signed in.
        </div>
      )}

      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 md:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 opacity-75" onClick={() => setSidebarOpen(false)}></div>
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center justify-between px-4">
              <h1 className="text-xl font-bold text-gray-900">Job Hunter</h1>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="group flex items-center px-2 py-2 text-base font-medium rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  <item.icon className="mr-4 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
                  {item.name}
                </a>
              ))}
            </nav>
          </div>
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {session?.user?.name?.charAt(0) || 'U'}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{session?.user?.name || 'User'}</p>
                <p className="text-xs text-gray-500">{session?.user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center justify-center">
              <h1 className="text-2xl font-bold text-gray-900">Job Hunter</h1>
            </div>
            <nav className="mt-8 flex-1 px-2 space-y-1">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  <item.icon className="mr-3 h-6 w-6 text-gray-400 group-hover:text-gray-500" />
                  {item.name}
                </a>
              ))}
            </nav>
          </div>
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {session?.user?.name?.charAt(0) || 'U'}
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{session?.user?.name || 'User'}</p>
                <p className="text-xs text-gray-500 truncate">{session?.user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gray-50">
          <button
            onClick={() => setSidebarOpen(true)}
            className="ml-3 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}