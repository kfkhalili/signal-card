"use client";

import { useAuth } from "@/contexts/AuthContext";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { fromPromise } from "neverthrow";
import { Option } from "effect";
import { useState, useEffect, FormEvent } from "react";
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
import { useToast } from "@/hooks/use-toast";
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

export default function ProfilePage(): JSX.Element {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [profile, setProfile] = useState<Option.Option<UserProfile>>(Option.none());
  const [pageLoading, setPageLoading] = useState<boolean>(true);
  const [supabase] = useState(() => createSupabaseBrowserClient());

  useEffect(() => {
    if (!supabase) {
        setPageLoading(false);
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
              toast({
                title: "Error",
                description: "Could not fetch your profile.",
                variant: "destructive",
              });
            } else {
              setProfile(Option.fromNullable(data));
            }
            setPageLoading(false);
          },
          (err) => {
            // Handle Result error (network/exception errors)
            console.error("Error fetching profile:", err);
            toast({
              title: "Error",
              description: "Could not fetch your profile.",
              variant: "destructive",
            });
            setPageLoading(false);
          }
        );
      }
    };
    if (!authLoading) {
      void fetchProfile();
    }
  }, [user, authLoading, supabase, toast]);

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
          toast({
            title: "Error updating profile",
            description: error.message,
            variant: "destructive",
          });
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
          toast({
            title: "Success",
            description: "Your profile has been updated.",
          });
        }
      },
      (err) => {
        // Handle Result error (network/exception errors)
        toast({
          title: "Error updating profile",
          description: err.message,
          variant: "destructive",
        });
      }
    );
  };

  const handleDeleteAccount = async () => {
    if (!supabase) {
        toast({
            title: "Error",
            description: "Database connection not available.",
            variant: "destructive",
        });
        return;
    }
    const sessionResult = await fromPromise(
      supabase.auth.getSession(),
      (e) => new Error(`Failed to get session: ${(e as Error).message}`)
    );

    if (sessionResult.isErr()) {
      toast({
        title: "Error",
        description: "Could not verify your session.",
        variant: "destructive",
      });
      return;
    }

    const { data: { session } } = sessionResult.value;

    if (!session) {
      toast({
        title: "Error",
        description: "You must be logged in to delete your account.",
        variant: "destructive",
      });
      return;
    }

    const deleteResult = await fromPromise(
      supabase.functions.invoke("delete-user", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }),
      (e) => new Error(`Failed to delete account: ${(e as Error).message}`)
    );

    deleteResult.match(
      (response) => {
        const { error } = response;

        if (error) {
          toast({
            title: "Error Deleting Account",
            description: (error as Error).message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Account Deleted",
            description: "Your account has been successfully deleted.",
          });
          void fromPromise(
            supabase.auth.signOut(),
            (e) => new Error(`Failed to sign out: ${(e as Error).message}`)
          ).then((result) => {
            result.mapErr((error) => {
              console.error("[Profile] Error signing out:", error.message);
            });
          });
          router.push("/");
        }
      },
      (err) => {
        // Handle Result error (network/exception errors)
        toast({
          title: "Error Deleting Account",
          description: err.message,
          variant: "destructive",
        });
      }
    );
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
          <CardFooter>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete My Account</Button>
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
                  <AlertDialogAction onClick={() => void handleDeleteAccount()}>
                    Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}