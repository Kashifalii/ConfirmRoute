import { AuthForm } from "@/components/auth/auth-form";

export default function SignupPage() {
  return (
    <>
      <p className="text-sm font-semibold text-primary">ConfirmRoute</p>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Create your workspace</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        Your account will be the administrator for this organization.
      </p>
      <AuthForm mode="sign-up" />
    </>
  );
}
