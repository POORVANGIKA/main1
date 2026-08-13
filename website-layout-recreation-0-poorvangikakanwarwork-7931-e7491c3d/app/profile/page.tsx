'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Header } from '@/components/header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LogOut, User } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    const loadSession = async () => {
      const currentSession = await auth.getSession()
      if (!currentSession?.user) {
        router.push('/sign-in')
        return
      }
      setSession(currentSession)
      setName(currentSession.user.name || '')
      setLoading(false)
    }
    loadSession()
  }, [router])

  const handleLogout = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/')
        },
      },
    })
  }

  const handleUpdateName = async () => {
    try {
      // Name update would require an API endpoint
      setIsEditing(false)
    } catch (error) {
      console.error('[v0] Failed to update name:', error)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    )
  }

  if (!session?.user) {
    return null
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="container max-w-2xl mx-auto px-4 py-16">
        <Card className="p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{session.user.name}</h1>
              <p className="text-muted-foreground">{session.user.email}</p>
            </div>
          </div>

          <div className="space-y-6 border-t pt-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">Account Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-foreground">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={session.user.email}
                    disabled
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <Label htmlFor="name" className="text-foreground">Full Name</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!isEditing}
                      className="flex-1"
                    />
                    {isEditing ? (
                      <>
                        <Button
                          onClick={handleUpdateName}
                          className="bg-primary hover:bg-primary/90"
                        >
                          Save
                        </Button>
                        <Button
                          onClick={() => {
                            setIsEditing(false)
                            setName(session.user.name || '')
                          }}
                          variant="outline"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => setIsEditing(true)}
                        variant="outline"
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Danger Zone</h2>
              <Button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </main>
  )
}
