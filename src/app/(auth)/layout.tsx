import type { ReactNode } from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-sm ring-1 ring-foreground/10 sm:p-8">
        {children}
      </div>
    </main>
  );
}
