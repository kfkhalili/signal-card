"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function profileErrorMessage(error: { code?: string } | null): string {
  if (error?.code === "23505") {
    return "That username is already taken. Please choose another one.";
  }

  return "We could not save your profile. Please try again.";
}

export default function CompleteProfilePage() {
  const { supabase, user, isLoading: isAuthLoading, clientInitError } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/auth");
    }
  }, [isAuthLoading, router, user]);

  const handleCompleteProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase || !user || isSaving) return;

    const normalizedUsername = username.trim();
    if (normalizedUsername.length < 3 || normalizedUsername.length > 50) {
      setSaveError("Username must be between 3 and 50 characters.");
      return;
    }

    setSaveError(null);
    setIsSaving(true);

    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .update({
          username: normalizedUsername,
          full_name: fullName.trim(),
          is_profile_complete: true,
        })
        .eq("id", user.id)
        .select("id, is_profile_complete")
        .maybeSingle();

      if (error) {
        console.error("Profile update failed:", error);
        setSaveError(profileErrorMessage(error));
        return;
      }

      if (!data?.is_profile_complete) {
        console.error("Profile update did not return an updated profile row");
        setSaveError("We could not find your profile. Please try again.");
        return;
      }

      router.push('/workspace');
      router.refresh();
    } catch (error) {
      console.error("Profile update failed:", error);
      setSaveError("We could not save your profile. Please try again.");
    } finally {
      // If navigation is interrupted, restore the form instead of trapping the
      // user on a permanent loading screen.
      setIsSaving(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (clientInitError) {
    return (
      <div className="flex h-screen items-center justify-center px-4 text-center">
        <p className="text-destructive">Authentication is temporarily unavailable.</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Redirecting to sign in...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <h1 className="mb-2 text-center text-2xl font-bold">
          Complete Your Profile
        </h1>
        <p className="mb-6 text-center text-muted-foreground">
          Please set your username to continue.
        </p>
        <form onSubmit={handleCompleteProfile} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={user.email ?? ""} disabled />
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              minLength={3}
              maxLength={50}
              autoComplete="username"
              placeholder="e.g., janesmith"
              disabled={isSaving}
            />
          </div>
          <div>
            <Label htmlFor="fullName">Full Name (Optional)</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="e.g., Jane Smith"
              disabled={isSaving}
            />
          </div>
          {saveError ? (
            <p className="text-sm text-destructive" role="alert">
              {saveError}
            </p>
          ) : null}
          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving ? "Saving..." : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
