"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, signUpAction } from "@/features/auth/actions";
import type { AuthActionState } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

export function AuthForm({
  mode,
  notice,
  errorNotice,
}: {
  mode: "sign-in" | "sign-up";
  notice?: string;
  errorNotice?: string;
}) {
  const action = mode === "sign-in" ? signInAction : signUpAction;
  const [state, formAction, isPending] = useActionState(action, initialState);
  const isSignUp = mode === "sign-up";

  return (
    <form action={formAction} className="space-y-5">
      {notice ? (
        <p className="rounded-md bg-info/10 p-3 text-sm text-info">{notice}</p>
      ) : null}
      {errorNotice ? (
        <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {errorNotice}
        </p>
      ) : null}

      {isSignUp ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="fullName">Your name</Label>
            <Input id="fullName" name="fullName" autoComplete="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organizationName">Workspace name</Label>
            <Input
              id="organizationName"
              name="organizationName"
              autoComplete="organization"
              required
            />
          </div>
        </>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          minLength={8}
          required
        />
        {isSignUp ? (
          <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
        ) : null}
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-sm text-success">{state.success}</p>
      ) : null}

      <Button className="w-full" type="submit" disabled={isPending}>
        {isPending
          ? "Please wait…"
          : isSignUp
            ? "Create workspace"
            : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {isSignUp ? "Already have an account?" : "New to ConfirmRoute?"}{" "}
        <Link
          className="font-medium text-foreground underline-offset-4 hover:underline"
          href={isSignUp ? "/login" : "/signup"}
        >
          {isSignUp ? "Sign in" : "Create a workspace"}
        </Link>
      </p>
    </form>
  );
}
