import { useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { accountPasswordSchema, accountProfileSchema } from "@reelforge/shared";
import { z } from "zod";
import { apiRequest } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";

type ProfileInput = z.infer<typeof accountProfileSchema>;
type PasswordInput = z.infer<typeof accountPasswordSchema>;

export function AccountSettingsPage() {
  const { user, refreshMe } = useAuth();
  const { pushToast } = useToast();

  const profileForm = useForm<ProfileInput>({
    resolver: zodResolver(accountProfileSchema),
    defaultValues: {
      name: user?.name || "",
    },
  });

  const passwordForm = useForm<PasswordInput>({
    resolver: zodResolver(accountPasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    },
  });

  useEffect(() => {
    profileForm.reset({ name: user?.name || "" });
  }, [profileForm, user?.name]);

  const profileMutation = useMutation({
    mutationFn: (payload: ProfileInput) =>
      apiRequest<{ user: { id: string; name: string | null } }>("/me/profile", {
        method: "PATCH",
        auth: true,
        body: payload,
      }),
    onSuccess: async () => {
      await refreshMe();
      pushToast({ type: "success", title: "Profile updated" });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to update profile.";
      pushToast({ type: "error", title: "Update failed", message });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (payload: PasswordInput) =>
      apiRequest("/me/password", {
        method: "PATCH",
        auth: true,
        body: payload,
      }),
    onSuccess: () => {
      pushToast({ type: "success", title: "Password updated" });
      passwordForm.reset();
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to update password.";
      pushToast({ type: "error", title: "Update failed", message });
    },
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h2 className="text-lg font-bold">Profile</h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={profileForm.handleSubmit((values) => profileMutation.mutate(values))}
        >
          <Input label="Name" {...profileForm.register("name")} error={profileForm.formState.errors.name?.message} />
          <Input label="Email" value={user?.email || ""} disabled />
          <Button type="submit" className="w-full" loading={profileMutation.isPending}>
            Save profile
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-bold">Change Password</h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={passwordForm.handleSubmit((values) => passwordMutation.mutate(values))}
        >
          <Input
            label="Current Password"
            type="password"
            {...passwordForm.register("currentPassword")}
            error={passwordForm.formState.errors.currentPassword?.message}
          />
          <Input
            label="New Password"
            type="password"
            {...passwordForm.register("newPassword")}
            error={passwordForm.formState.errors.newPassword?.message}
          />
          <Button type="submit" className="w-full" loading={passwordMutation.isPending}>
            Update password
          </Button>
        </form>
      </Card>
    </div>
  );
}