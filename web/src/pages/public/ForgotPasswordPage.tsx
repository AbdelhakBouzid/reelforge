import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema } from "@reelforge/shared";
import { z } from "zod";
import { Link } from "react-router-dom";
import { apiRequest } from "../../lib/api";
import { useToast } from "../../contexts/ToastContext";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

type ForgotInput = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const { pushToast } = useToast();

  const form = useForm<ForgotInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await apiRequest("/auth/forgot", {
        method: "POST",
        body: values,
      });
      pushToast({
        type: "success",
        title: "Request submitted",
        message: "If the account exists, reset instructions were sent.",
      });
      form.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to request reset.";
      pushToast({ type: "error", title: "Request failed", message });
    }
  });

  return (
    <div className="mx-auto w-full max-w-md">
      <Card className="space-y-4">
        <h1 className="text-2xl font-bold">Forgot password</h1>
        <p className="text-sm text-[rgb(var(--text-muted))]">Enter your email and we will send reset instructions.</p>
        <form className="space-y-3" onSubmit={onSubmit}>
          <Input label="Email" type="email" {...form.register("email")} error={form.formState.errors.email?.message} />
          <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
            Send reset link
          </Button>
        </form>
        <Link className="rf-link text-sm" to="/auth/signin">
          Back to sign in
        </Link>
      </Card>
    </div>
  );
}