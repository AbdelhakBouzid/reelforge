import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@reelforge/shared";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

export function SignInPage() {
  const { signIn } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/dashboard";

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await signIn(values);
      pushToast({ type: "success", title: "Welcome back", message: "Signed in successfully." });
      navigate(fromPath, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in.";
      pushToast({ type: "error", title: "Sign in failed", message });
    }
  });

  return (
    <div className="mx-auto w-full max-w-md">
      <Card className="space-y-4">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <form className="space-y-3" onSubmit={onSubmit}>
          <Input label="Email" type="email" {...form.register("email")} error={form.formState.errors.email?.message} />
          <Input
            label="Password"
            type="password"
            {...form.register("password")}
            error={form.formState.errors.password?.message}
          />
          <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
            Sign in
          </Button>
        </form>
        <div className="text-sm text-[rgb(var(--text-muted))]">
          <Link className="rf-link" to="/auth/forgot">
            Forgot your password?
          </Link>
          <p className="mt-2">
            New here?{" "}
            <Link className="rf-link" to="/auth/signup">
              Create an account
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}