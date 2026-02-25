import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@reelforge/shared";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";

export function SignUpPage() {
  const { signUp } = useAuth();
  const { pushToast } = useToast();
  const navigate = useNavigate();

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await signUp(values);
      pushToast({ type: "success", title: "Account created", message: "Welcome to ReelForge." });
      navigate("/dashboard", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to register.";
      pushToast({ type: "error", title: "Sign up failed", message });
    }
  });

  return (
    <div className="mx-auto w-full max-w-md">
      <Card className="space-y-4">
        <h1 className="text-2xl font-bold">Create account</h1>
        <form className="space-y-3" onSubmit={onSubmit}>
          <Input label="Name" {...form.register("name")} error={form.formState.errors.name?.message} />
          <Input label="Email" type="email" {...form.register("email")} error={form.formState.errors.email?.message} />
          <Input
            label="Password"
            type="password"
            {...form.register("password")}
            error={form.formState.errors.password?.message}
          />
          <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
            Create account
          </Button>
        </form>
        <p className="text-sm text-[rgb(var(--text-muted))]">
          Already registered?{" "}
          <Link className="rf-link" to="/auth/signin">
            Sign in
          </Link>
        </p>
      </Card>
    </div>
  );
}