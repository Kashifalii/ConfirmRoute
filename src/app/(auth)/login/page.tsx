import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";

type Props = PageProps<"/login">;

async function LoginForm({
  searchParams,
}: Pick<Props, "searchParams">) {
  const params = await searchParams;
  const notice = params.signup === "check-email"
    ? "Check your email for a confirmation link to finish creating your workspace."
    : undefined;
  const errorNotice = params.error === "callback"
    ? "The confirmation link could not be verified. Request a new one and try again."
    : undefined;

  return <AuthForm mode="sign-in" notice={notice} errorNotice={errorNotice} />;
}

export default function LoginPage({ searchParams }: Props) {
  return (
    <>
      <Link href="/" className="text-sm font-semibold text-primary">ConfirmRoute</Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        Sign in to your travel operations workspace.
      </p>
      <Suspense fallback={<AuthForm mode="sign-in" />}>
        <LoginForm searchParams={searchParams} />
      </Suspense>
    </>
  );
}
