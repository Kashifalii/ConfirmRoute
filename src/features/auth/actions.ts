"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/config";
import {
  createSupabaseActionClient,
} from "@/lib/supabase/server";
import { signInSchema, signUpSchema } from "./schema";

export interface AuthActionState {
  error?: string;
  success?: string;
}

function formString(formData: FormData, field: string): unknown {
  const value = formData.get(field);
  return typeof value === "string" ? value : undefined;
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Configure Supabase to enable account sign-in." };
  }

  const parsed = signInSchema.safeParse({
    email: formString(formData, "email"),
    password: formString(formData, "password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your sign-in details." };
  }

  const supabase = await createSupabaseActionClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Unable to sign in with those credentials." };

  redirect("/dashboard");
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) {
    return { error: "Configure Supabase to create an account and workspace." };
  }

  const parsed = signUpSchema.safeParse({
    fullName: formString(formData, "fullName"),
    organizationName: formString(formData, "organizationName"),
    email: formString(formData, "email"),
    password: formString(formData, "password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your account details." };
  }

  const supabase = await createSupabaseActionClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        organization_name: parsed.data.organizationName,
      },
      emailRedirectTo: `${process.env.APP_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });
  if (error) return { error: "Unable to create the account. Check the details and try again." };

  if (data.session) redirect("/dashboard");
  return { success: "Check your email to confirm your account, then sign in." };
}

export async function signOutAction(): Promise<void> {
  if (!isSupabaseConfigured()) redirect("/dashboard");
  const supabase = await createSupabaseActionClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  redirect("/login");
}
