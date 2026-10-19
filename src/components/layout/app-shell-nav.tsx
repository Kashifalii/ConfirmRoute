"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BriefcaseBusiness,
  LayoutDashboard,
  Menu,
  Plane,
  Settings,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ResetDemoDataButton } from "@/components/layout/reset-demo-data-button";
import { LogoutButton } from "@/components/auth/logout-button";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/bookings", label: "Bookings", icon: BriefcaseBusiness },
  { href: "/intake", label: "Document intake", icon: Plane },
  { href: "/exceptions", label: "Exceptions", icon: AlertTriangle },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon aria-hidden="true" className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
    >
      <span
        aria-hidden="true"
        className="flex size-8 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-accent-foreground"
      >
        <Plane className="size-4" />
      </span>
      <span className="text-base font-semibold tracking-tight">ConfirmRoute</span>
    </Link>
  );
}

/** Fixed sidebar on desktop; sheet drawer on mobile. */
export function AppShellNav({ mode }: { mode: "demo" | "supabase" }) {
  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 text-sidebar-foreground lg:hidden">
        <Brand />
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              aria-label="Open navigation menu"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground"
          >
            <SheetHeader className="border-b border-sidebar-border p-4">
              <SheetTitle className="text-sidebar-foreground">
                <Brand />
              </SheetTitle>
              <SheetDescription className="sr-only">
                ConfirmRoute main navigation
              </SheetDescription>
            </SheetHeader>
            <div className="p-4">
              <NavLinks />
            </div>
            {mode === "demo" ? (
              <div className="mt-auto border-t border-sidebar-border p-4">
                <ResetDemoDataButton className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
              </div>
            ) : (
              <div className="mt-auto border-t border-sidebar-border p-4">
                <LogoutButton className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
              </div>
            )}
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <NavLinks />
        </div>
        <div className="border-t border-sidebar-border px-4 py-3 text-xs leading-relaxed text-sidebar-foreground/70">
          {mode === "demo" ? (
            <>
              <p>
                Demo mode — fictional seed data. PDF fields use local parsing;
                sample scenarios are simulated.
              </p>
              <div className="mt-2">
                <ResetDemoDataButton className="-ml-2 h-7 px-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
              </div>
            </>
          ) : (
            <>
              <p>
                Signed-in workspace data is protected by organization-scoped
                database policies.
              </p>
              <div className="mt-2">
                <LogoutButton className="-ml-2 h-7 px-2 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
