'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { authClient } from '@/lib/auth-client'
import { useRouter } from 'next/navigation'

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const getSession = async () => {
      try {
        const session = await authClient.getSession()
        setSession(session.data)
      } catch (error) {
        console.error('Failed to get session:', error)
      } finally {
        setLoading(false)
      }
    }
    getSession()
  }, [])

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark)
    
    setIsDark(shouldBeDark)
    if (shouldBeDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = !isDark ? 'dark' : 'light'
    setIsDark(!isDark)
    localStorage.setItem('theme', newTheme)
    
    if (!isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const handleLogout = async () => {
    await authClient.signOut()
    setSession(null)
    router.push('/')
    router.refresh()
  }

  return (
    <header 
      className={`fixed top-0 w-full transition-all duration-300 ${
        isScrolled 
          ? 'border-b-2 border-accent shadow-lg bg-background/95 backdrop-blur-sm' 
          : 'border-b-2 border-accent'
      }`}
      style={!isScrolled ? { backgroundColor: 'rgba(0, 0, 0, 0.3)' } : {}}
    >
      <div className="flex items-center justify-between px-4 md:px-8 py-4 relative">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="text-2xl font-bold text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            Luma Vision
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-4">
          {session?.user ? (
            <>
              <Link href="/dashboard" className="text-sm font-medium text-white hover:text-accent transition duration-200" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                Dashboard
              </Link>
              <Link href="/court-coverage" className="text-sm font-medium text-white hover:text-accent transition duration-200" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                Court Analyzer
              </Link>
              <Link href="/profile" className="text-sm font-medium text-white hover:text-accent transition duration-200" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                {session.user.name || session.user.email}
              </Link>
            </>
          ) : (
            <>
              <Link href="/sign-in" className="text-sm font-medium text-white hover:text-accent transition duration-200" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                Log In
              </Link>
              <Link 
                href="/sign-up"
                className="text-sm font-medium px-4 py-2 rounded transition duration-200"
                style={{ backgroundColor: '#D5BC8A', color: '#145A60' }}
              >
                Sign Up
              </Link>
            </>
          )}
        </nav>

        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 3v1m0 16v1m9-9h-1m-16 0H1m15.657 5.657l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  )
}
