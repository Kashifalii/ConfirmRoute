import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AppShellNav } from "@/components/layout/app-shell-nav";
import { isSupabaseConfigured } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isUnauthenticatedAuthError } from "@/lib/supabase/errors";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

async function DashboardWorkspace({
  mode,
  children,
}: {
  mode: "demo" | "supabase";
  children: ReactNode;
}) {
  await connection();

  if (mode === "supabase") {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error && !isUnauthenticatedAuthError(error)) throw error;
    if (!data.user) redirect("/login");
  }

  return (
    <div className="min-h-dvh bg-background">
      {/*
        The nav reads usePathname(), which is runtime URL data on dynamic
        routes like /bookings/[id]; the Suspense boundary lets the shell
        prerender while the nav streams in.
      */}
      <Suspense fallback={null}>
        <AppShellNav mode={mode} />
      </Suspense>
      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const mode = isSupabaseConfigured() ? "supabase" : "demo";
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh bg-background" aria-busy="true">
          <p className="sr-only">Loading workspace</p>
        </div>
      }
    >
      <DashboardWorkspace mode={mode}>{children}</DashboardWorkspace>
    </Suspense>
  );
}
