'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { fromPromise } from 'neverthrow'
import { Option } from 'effect'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function CompleteProfilePage() {
  const supabase = createSupabaseBrowserClient()
  const router = useRouter()

  const [user, setUser] = useState<Option.Option<User>>(Option.none())
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    const fetchUser = async () => {
      if (supabase) {
        const userResult = await fromPromise(
          supabase.auth.getUser(),
          (e) => new Error(`Failed to get user: ${(e as Error).message}`)
        );

        userResult.match(
          (response) => {
            const { data: { user } } = response;
            if (user) {
              setUser(Option.some(user));
            } else {
              router.push('/auth');
            }
          },
          (err) => {
            // Handle Result error (network/exception errors)
            console.error('Error fetching user:', err.message);
            router.push('/auth');
          }
        );
      }
      setLoading(false);
    };
    fetchUser();
  }, [supabase, router]);

  const handleCompleteProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const currentUser = Option.isSome(user) ? user.value : null
    if (!currentUser || !supabase) return
    if (username.length < 3) {
      return
    }

    setLoading(true)

    const updateResult = await fromPromise(
      supabase
        .from('user_profiles')
        .update({
          username: username,
          full_name: fullName,
          is_profile_complete: true,
        })
        .eq('id', currentUser.id),
      (e) => new Error(`Failed to update profile: ${(e as Error).message}`)
    )

    updateResult.match(
      (response) => {
        const { error } = response

        if (error) {
          console.error("Profile update failed:", error)
          // Error updating profile - check console for details
          setLoading(false)
        } else {
          // Navigate to workspace - middleware will handle any profile completion checks
          router.push('/workspace')
          router.refresh() // To ensure header gets updated profile info
          // Keep loading state active during navigation
        }
      },
      (err) => {
        // Handle Result error (network/exception errors)
        console.error("Profile update failed:", err)
        setLoading(false)
      }
    )
  }

  if (loading || Option.isNone(user)) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading...</p>
      </div>
    )
  }

  const currentUser = user.value

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
                    <Input id="email" type="email" value={currentUser.email} disabled />
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