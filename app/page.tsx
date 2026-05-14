'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export default function HomePage() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()

  useEffect(() => {
    if (isPending) return
    if (!session) {
      router.push('/auth/signin')
    } else {
      router.push('/dashboard')
    }
  }, [isPending, session, router])

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <div className="mb-8">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
              Job Hunter
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8">
              Your AI-powered freelance job search companion
            </p>
          </div>

          <div className="space-y-6">
            {!session && !isPending && (
              <>
                <div className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl mx-auto">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-4">Get Started</h2>
                  <p className="text-gray-600 mb-6">
                    Sign in to start tracking your job applications and get AI-powered assistance
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => router.push('/auth/signin')}
                      className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => router.push('/auth/signup')}
                      className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg"
                    >
                      Create Account
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                  <div className="bg-white rounded-lg p-6 shadow-md">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                      <span className="text-2xl">📊</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Track Applications</h3>
                    <p className="text-gray-600 text-sm">Monitor your job pipeline in real-time</p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-6 shadow-md">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                      <span className="text-2xl">🤖</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">AI Assistant</h3>
                    <p className="text-gray-600 text-sm">Get help with job search strategies</p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-6 shadow-md">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                      <span className="text-2xl">🔔</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">Smart Notifications</h3>
                    <p className="text-gray-600 text-sm">Stay updated on your applications</p>
                  </div>
                </div>
              </>
            )}

            {!!session && (
              <div className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl mx-auto">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Welcome back, {session.user?.name || 'User'}!</h2>
                <p className="text-gray-600 mb-6">
                  Your job hunting dashboard is ready. Let's find your next opportunity!
                </p>
                <div className="space-y-4">
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="w-full bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
                  >
                    Go to Dashboard
                  </button>
                  <p className="text-sm text-gray-500 text-center">
                    Or you'll be automatically redirected in a moment...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}