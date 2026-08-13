'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isSignUp = mode === 'sign-up'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const result = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password })

    console.log("[v0] Auth result:", result)
    setLoading(false)

    if (result.error) {
      console.log("[v0] Auth error:", result.error)
      setError(result.error.message ?? 'Something went wrong')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
        {isSignUp && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="name" style={{ color: '#CBD5E1' }}>
              Full Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              placeholder="John Doe"
              style={{ borderColor: 'rgba(148, 163, 184, 0.2)', backgroundColor: 'rgba(15, 23, 42, 0.8)', color: '#CBD5E1', padding: '10px 12px' }}
            />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Label htmlFor="email" style={{ color: '#CBD5E1' }}>
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
            style={{ borderColor: 'rgba(148, 163, 184, 0.2)', backgroundColor: 'rgba(15, 23, 42, 0.8)', color: '#CBD5E1', padding: '10px 12px' }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password" style={{ color: '#CBD5E1' }}>
            Password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            placeholder="At least 8 characters"
            style={{ borderColor: 'rgba(148, 163, 184, 0.2)', backgroundColor: 'rgba(15, 23, 42, 0.8)', color: '#CBD5E1', padding: '10px 12px' }}
          />
        </div>

        {error && (
          <p className="text-sm p-3 rounded" role="alert" style={{ backgroundColor: '#7F1D1D', color: '#FCA5A5' }}>
            {error}
          </p>
        )}

        <Button 
          type="submit" 
          disabled={loading} 
          className="w-full font-semibold py-2 rounded transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#14B8A6', color: '#0F172A' }}
        >
          {loading
            ? 'Please wait...'
            : isSignUp
              ? 'Create Account'
              : 'Sign In'}
        </Button>
      </form>
    </>
  )
}
