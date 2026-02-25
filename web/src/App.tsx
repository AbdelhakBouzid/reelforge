import { Navigate, Route, Routes } from "react-router-dom";
import { PublicLayout } from "./components/layout/PublicLayout";
import { AppLayout } from "./components/layout/AppLayout";
import { RequireAdmin, RequireAuth } from "./components/layout/RouteGuards";
import { LandingPage } from "./pages/public/LandingPage";
import { PricingPage } from "./pages/public/PricingPage";
import { SignInPage } from "./pages/public/SignInPage";
import { SignUpPage } from "./pages/public/SignUpPage";
import { ForgotPasswordPage } from "./pages/public/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/public/ResetPasswordPage";
import { DashboardPage } from "./pages/protected/DashboardPage";
import { GenerateImagePage } from "./pages/protected/GenerateImagePage";
import { GenerateVideoPage } from "./pages/protected/GenerateVideoPage";
import { HistoryPage } from "./pages/protected/HistoryPage";
import { BillingPage } from "./pages/protected/BillingPage";
import { AccountSettingsPage } from "./pages/protected/AccountSettingsPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminGenerationsPage } from "./pages/admin/AdminGenerationsPage";
import { AdminPaymentsPage } from "./pages/admin/AdminPaymentsPage";
import { AdminPlansPage } from "./pages/admin/AdminPlansPage";
import { AdminPacksPage } from "./pages/admin/AdminPacksPage";
import { Card } from "./components/ui/Card";

function NotFoundPage() {
  return (
    <div className="mx-auto mt-10 max-w-xl">
      <Card className="space-y-3 text-center">
        <h1 className="text-3xl font-bold">404</h1>
        <p className="text-sm text-[rgb(var(--text-muted))]">The requested page was not found.</p>
      </Card>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/auth/signin" element={<SignInPage />} />
        <Route path="/auth/signup" element={<SignUpPage />} />
        <Route path="/auth/forgot" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset" element={<ResetPasswordPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/generate/image" element={<GenerateImagePage />} />
          <Route path="/generate/video" element={<GenerateVideoPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/account" element={<AccountSettingsPage />} />

          <Route path="/admin" element={<RequireAdmin />}>
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="generations" element={<AdminGenerationsPage />} />
            <Route path="payments" element={<AdminPaymentsPage />} />
            <Route path="plans" element={<AdminPlansPage />} />
            <Route path="packs" element={<AdminPacksPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
      <Route path="/app" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}