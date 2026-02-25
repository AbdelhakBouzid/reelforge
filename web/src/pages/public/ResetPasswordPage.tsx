import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema } from "@reelforge/shared";
import { z } from "zod";
import { Link, useSearchParams } from "react-router-dom";
import { apiRequest } from "../../lib/api";
import { useToast } from "../../contexts/ToastContext";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

type ResetInput = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const { pushToast } = useToast();

  const form = useForm<ResetInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: searchParams.get("token") || "",
      password: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await apiRequest("/auth/reset", {
        method: "POST",
        body: values,
      });
      pushToast({
        type: "success",
        title: "Password updated",
        message: "You can now sign in with your new password.",
      });
      form.reset({ token: "", password: "" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reset password.";
      pushToast({ type: "error", title: "Reset failed", message });
    }
  });

  return (
    <div className="mx-auto w-full max-w-md">
      <Card className="space-y-4">
        <h1 className="text-2xl font-bold">Reset password</h1>
        <form className="space-y-3" onSubmit={onSubmit}>
          <Input label="Reset Token" {...form.register("token")} error={form.formState.errors.token?.message} />
          <Input
            label="New Password"
            type="password"
            {...form.register("password")}
            error={form.formState.errors.password?.message}
          />
          <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
            Reset Password
          </Button>
        </form>
        <Link className="rf-link text-sm" to="/auth/signin">
          Back to sign in
        </Link>
      </Card>
    </div>
  );
}