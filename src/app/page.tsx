import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  FileSearch,
  History,
  Plane,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Travel Agency Booking Management",
  description:
    "ConfirmRoute helps travel agencies process supplier booking confirmations, review exceptions, and approve accurate booking records.",
};

const features = [
  {
    icon: FileSearch,
    title: "Process booking confirmations",
    description:
      "Start a booking from a supplier confirmation PDF or use sample scenarios to explore the workflow.",
  },
  {
    icon: ClipboardCheck,
    title: "Review every detail",
    description:
      "Check extracted booking fields, fill gaps, and resolve missing, changed, or duplicate information.",
  },
  {
    icon: History,
    title: "Keep a clear record",
    description:
      "Follow booking activity and changes, with an audit CSV export for workspace operations.",
  },
];

const steps = [
  ["Capture", "Upload a supplier confirmation or begin a booking manually."],
  ["Review", "Verify booking details and resolve any exceptions."],
  ["Approve", "A person makes the final approval decision."],
];

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight"
          aria-label="ConfirmRoute home"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Plane aria-hidden="true" className="size-4" />
          </span>
          ConfirmRoute
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">Open workspace</Link>
          </Button>
        </nav>
      </header>

      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 sm:py-28 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="mb-4 text-sm font-semibold tracking-wide text-primary">
              TRAVEL AGENCY BOOKING OPERATIONS
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              From supplier confirmation to a booking your team can trust.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              ConfirmRoute brings travel agency booking management into one
              reviewable workflow. Process confirmations, track exceptions, and
              keep people in control of every approval.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/dashboard">
                  Explore the workspace
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/signup">Create a workspace</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Portfolio MVP · Demo records are fictional
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="font-semibold">Human-led booking review</p>
                <p className="text-sm text-muted-foreground">
                  Approvals stay with your team
                </p>
              </div>
            </div>
            <ol className="space-y-5">
              {steps.map(([title, description], index) => (
                <li key={title} className="flex gap-4">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    0{index + 1}
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold">{title}</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            A clearer travel booking workflow
          </h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            Give travel agency teams a focused place to manage booking details
            from intake through approval.
          </p>
        </div>
        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <article key={title} className="rounded-xl border bg-card p-6">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <h3 className="mt-5 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-10 text-sm leading-6 text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-3xl">
            PDF intake uses local rules to read selectable text; it is not
            AI-powered, and scanned PDFs require manual entry. Extracted details
            should be checked by an operator before approval.
          </p>
          <p className="shrink-0">ConfirmRoute</p>
        </div>
      </section>
    </main>
  );
}
