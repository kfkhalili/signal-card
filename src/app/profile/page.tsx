"use client";

export const dynamic = 'force-dynamic';

import { useAuth } from "@/contexts/AuthContext";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { fromPromise } from "neverthrow";
import { Option } from "effect";
import { useState, useEffect, FormEvent, type ReactElement } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tables } from "@/lib/supabase/database.types";

type UserProfile = Tables<"user_profiles">;

function accountDeletionErrorMessage(error: unknown): string {
  const status =
    typeof error === "object" &&
    error !== null &&
    "context" in error &&
    typeof error.context === "object" &&
    error.context !== null &&
    "status" in error.context &&
    typeof error.context.status === "number"
      ? error.context.status
      : null;

  if (status === 401) {
    return "Your session is no longer valid. Sign in again and retry.";
  }

  return "We could not delete your account. Please try again.";
}

export default function ProfilePage(): ReactElement {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Option.Option<UserProfile>>(Option.none());
  const [pageLoading, setPageLoading] = useState<boolean>(true);
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
        // Schedule state update to avoid cascading renders
        queueMicrotask(() => {
          setPageLoading(false);
        });
        return;
    }
    const fetchProfile = async () => {
      if (user) {
        setPageLoading(true);
        const profileResult = await fromPromise(
          supabase
            .from("user_profiles")
            .select("*")
            .eq("id", user.id)
            .single(),
          (e) => new Error(`Failed to fetch profile: ${(e as Error).message}`)
        );

        profileResult.match(
          (response) => {
            const { data, error } = response;

            if (error) {
              console.error("Error fetching profile:", error);
            } else {
              setProfile(Option.fromNullable(data));
            }
            setPageLoading(false);
          },
          (err) => {
            // Handle Result error (network/exception errors)
            console.error("Error fetching profile:", err);
            setPageLoading(false);
          }
        );
      }
    };
    if (!authLoading) {
      void fetchProfile();
    }
  }, [user, authLoading, supabase]);

  const handleUpdateProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !supabase) return;

    const formData = new FormData(e.currentTarget);
    const fullName = formData.get("fullName") as string;
    const username = formData.get("username") as string;

    const updateResult = await fromPromise(
      supabase
        .from("user_profiles")
        .update({
          full_name: fullName,
          username: username,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id),
      (e) => new Error(`Failed to update profile: ${(e as Error).message}`)
    );

    updateResult.match(
      (response) => {
        const { error } = response;

        if (error) {
          console.error("Error updating profile:", error.message);
        } else {
          setProfile((prevProfileOption) => {
            const prevProfile = Option.isSome(prevProfileOption) ? prevProfileOption.value : null;
            const updatedProfile = prevProfile
              ? { ...prevProfile, full_name: fullName, username }
              : {
                  id: user.id,
                  full_name: fullName,
                  username: username,
                  avatar_url: null,
                  updated_at: new Date().toISOString(),
                  workspace_id: null,
                  settings: null,
                  is_profile_complete: false,
                };
            return Option.some(updatedProfile);
          });
        }
      },
      (err) => {
        // Handle Result error (network/exception errors)
        console.error("Error updating profile:", err.message);
      }
    );
  };

  const handleDeleteAccount = async () => {
    if (!supabase) {
      setDeleteError("Account deletion is temporarily unavailable.");
      return;
    }

    setDeleteError(null);
    setIsDeleting(true);

    try {
      const sessionResult = await fromPromise(
        supabase.auth.getSession(),
        (e) => new Error(`Failed to get session: ${(e as Error).message}`)
      );

      if (sessionResult.isErr()) {
        console.error("Could not verify session:", sessionResult.error);
        setDeleteError("We could not verify your session. Please try again.");
        return;
      }

      const {
        data: { session },
      } = sessionResult.value;

      if (!session) {
        setDeleteError("Your session has expired. Sign in again and retry.");
        return;
      }

      const deleteResult = await fromPromise(
        supabase.functions.invoke<{ success?: boolean }>("delete-user", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }),
        (e) => new Error(`Failed to delete account: ${(e as Error).message}`)
      );

      if (deleteResult.isErr()) {
        console.error("Error deleting account:", deleteResult.error.message);
        setDeleteError("We could not delete your account. Please try again.");
        return;
      }

      const { data, error } = deleteResult.value;
      if (error || !data?.success) {
        console.error("Error deleting account:", error);
        setDeleteError(accountDeletionErrorMessage(error));
        return;
      }

      const { error: signOutError } = await supabase.auth.signOut({
        scope: "local",
      });
      if (signOutError) {
        console.error("[Profile] Error clearing local session:", signOutError);
      }

      router.replace("/");
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading || pageLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <div>Please log in to view your profile.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Your Profile</h1>
      <Card className="max-w-md">
        <form onSubmit={handleUpdateProfile}>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>
              Update your personal information here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email ?? ""}
                disabled
              />
            </div>
                <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                defaultValue={Option.isSome(profile) ? profile.value.username ?? "" : ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                defaultValue={Option.isSome(profile) ? profile.value.full_name ?? "" : ""}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit">Save Changes</Button>
          </CardFooter>
        </form>
      </Card>

      <div className="mt-8">
        <Card className="max-w-md border-destructive">
          <CardHeader>
            <CardTitle>Delete Account</CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data. This
              action is irreversible.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-3">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting}>
                  {isDeleting ? "Deleting Account..." : "Delete My Account"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    your account and remove your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={isDeleting}
                    onClick={() => void handleDeleteAccount()}
                  >
                    Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {deleteError ? (
              <p className="text-sm text-destructive" role="alert">
                {deleteError}
              </p>
            ) : null}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
