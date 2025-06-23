'use client'
import { useState, useEffect } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/database.types'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Avatar from '@/components/ui/Avatar'
import { useToast } from '@/hooks/use-toast'

type Profile = Database['public']['Tables']['user_profiles']['Row']

export default function ProfilePage() {
  const supabase = createSupabaseBrowserClient()
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    if (!supabase) {
        console.error("Supabase client is not available.");
        setLoading(false);
        // Optionally redirect or show an error message
        // router.push('/auth-error');
        return;
    }
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
      } else {
        router.push('/auth')
      }
    }
    fetchSession()
  }, [supabase, router])

  useEffect(() => {
    if (user && supabase) {
      const fetchProfile = async () => {
        setLoading(true)
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error fetching profile:', error)
        } else if (data) {
          setProfile(data)
          setFullName(data.full_name || '')
          setUsername(data.username || '')
          setAvatarUrl(data.avatar_url || '')
        }
        setLoading(false)
      }
      fetchProfile()
    }
  }, [user, supabase])

  const handleUpdateProfile = async () => {
    if (!user || !supabase) return
    setLoading(true)
    const { error } = await supabase.from('user_profiles').upsert({
      id: user.id,
      full_name: fullName,
      username,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      })
      // Refresh profile data
      const { data } = await supabase.from('user_profiles').select('*').eq('id', user.id).single()
      if(data) setProfile(data)
    }
    setLoading(false)
  }

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!supabase) {
    return <div>Could not connect to the database. Please check your configuration.</div>
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user || !profile) {
    return <div>User not found.</div>
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">User Profile</h1>
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
            <Avatar src={avatarUrl} alt={fullName || username || 'User Avatar'} size={80} />
            <div>
              <h2 className="text-xl font-semibold">{fullName}</h2>
              <p className="text-muted-foreground">@{username}</p>
            </div>
        </div>
        <div className="pl-1">
            <p className="text-xs text-muted-foreground">
                Your avatar is provided by <a href="https://gravatar.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">Gravatar</a>.
            </p>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={user.email} disabled />
        </div>
        <div>
          <Label htmlFor="fullName">Full Name</Label>
          <Input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="username">Username</Label>
          <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="flex space-x-4">
          <Button onClick={handleUpdateProfile} disabled={loading}>
            {loading ? 'Saving...' : 'Update Profile'}
          </Button>
          <Button variant="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  )
}