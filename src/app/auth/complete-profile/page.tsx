'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export default function CompleteProfilePage() {
  const supabase = createSupabaseBrowserClient()
  const router = useRouter()
  const { toast } = useToast()

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    const fetchUser = async () => {
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUser(user)
        } else {
          router.push('/auth')
        }
      }
      setLoading(false)
    }
    fetchUser()
  }, [supabase, router])

  const handleCompleteProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!user || !supabase) return
    if (username.length < 3) {
      toast({
        title: "Username too short",
        description: "Your username must be at least 3 characters long.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    const { error } = await supabase
      .from('user_profiles')
      .update({
        username: username,
        full_name: fullName,
        is_profile_complete: true,
      })
      .eq('id', user.id)

    if (error) {
      console.error("Profile update failed:", error)
      if (error.code === '23505') {
        toast({
          title: "Username already taken",
          description: "Please choose a different username.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error updating profile",
          description: "An unexpected error occurred. Please check the console for details.",
          variant: "destructive",
        })
      }
      setLoading(false)
    } else {
      toast({
        title: "Profile Complete!",
        description: "Welcome! Your profile has been set up.",
      })

      // Navigate to workspace - middleware will handle any profile completion checks
      router.push('/workspace')
      router.refresh() // To ensure header gets updated profile info
      // Keep loading state active during navigation
    }
  }

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
            <h1 className="text-2xl font-bold text-center mb-2">Complete Your Profile</h1>
            <p className="text-muted-foreground text-center mb-6">
                Please set your username to continue.
            </p>
            <form onSubmit={handleCompleteProfile} className="space-y-4">
                <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={user.email} disabled />
                </div>
                <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        minLength={3}
                        placeholder="e.g., janesmith"
                    />
                </div>
                <div>
                    <Label htmlFor="fullName">Full Name (Optional)</Label>
                    <Input
                        id="fullName"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g., Jane Smith"
                    />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Saving...' : 'Continue'}
                </Button>
            </form>
        </div>
    </div>
  )
}