"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { UserProfileData } from "./profile-types";
import { toast } from "sonner";
import { Separator } from "../ui/separator";
import { LockIcon, UserCogIcon } from "lucide-react";

const profileFormSchema = z.object({
  fullName: z
    .string()
    .min(2, { message: "Full name must be at least 2 characters." })
    .max(50, { message: "Full name must not be longer than 50 characters." }),
  nickname: z
    .string()
    .min(2, { message: "Nickname must be at least 2 characters." })
    .max(30, { message: "Nickname must not be longer than 30 characters." })
    .regex(/^[a-zA-Z0-9_.-]+$/, {
      message:
        "Nickname can only contain letters, numbers, underscores, periods, and hyphens.",
    }),
  email: z.string({ required_error: "Please enter an email." }).email(),
  bio: z
    .string()
    .max(200, { message: "Bio must not be longer than 200 characters." })
    .optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileSettingsFormProps {
  user: UserProfileData;
}

export function ProfileSettingsForm({ user }: ProfileSettingsFormProps) {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: user.fullName,
      nickname: user.nickname,
      email: user.email,
      bio: user.bio || "",
    },
    mode: "onChange",
  });

  async function onSubmit(data: ProfileFormValues) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Profile updated:", data);
    // toast({
    //   title: "Profile Updated",
    //   description: "Your profile information has been successfully updated.",
    //   variant: "default",
    // })
    toast.success("Profile Updated", {
      description: "Your profile information has been successfully updated.",
    });
  }

  return (
    <Card className="border shadow-sm">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="flex items-center text-xl">
              <UserCogIcon className="w-6 h-6 mr-2.5 text-primary" />
              Edit Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal details. Changes will be reflected across the
              platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Jane Doe"
                        {...field}
                        className="h-10"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nickname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nickname</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., janedoe99"
                        {...field}
                        className="h-10"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your.email@example.com"
                      {...field}
                      readOnly
                      className="focus-visible:ring-0 cursor-not-allowed opacity-70 h-10"
                    />
                  </FormControl>
                  <FormDescription>
                    Your email is not changeable for security reasons.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Tell us a little about yourself..."
                      className="resize-none min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A brief description about you (max 200 characters).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <Separator className="my-6 bg-border/60" />

          <CardContent>
            <h3 className="text-lg font-medium mb-1 flex items-center">
              <LockIcon className="w-5 h-5 mr-2 text-primary" />
              Account Security
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Manage your account security settings.
            </p>
            <Button variant="outline" type="button">
              Change Password
            </Button>
          </CardContent>

          <CardFooter className="border-t border-border/60 px-6 py-4 mt-6">
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || !form.formState.isDirty}
              className="min-w-[120px]"
            >
              {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
