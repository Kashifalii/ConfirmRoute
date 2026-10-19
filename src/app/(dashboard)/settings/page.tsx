import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/page-header";
import { NotificationEmailForm } from "@/components/settings/notification-email-form";
import { getSettingsData } from "@/lib/data/queries";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const { mode, organization } = await getSettingsData();

  return (
    <>
      <PageHeader
        title="Settings"
        description={`Manage notification preferences for ${organization.name}.`}
      />
      <section className="max-w-2xl rounded-xl bg-card p-6 ring-1 ring-foreground/10">
        <h2 className="text-lg font-semibold">Email alerts</h2>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          Optional Resend delivery. Alerts are reported as unconfigured when the provider
          credentials are missing; booking workflows continue to work.
        </p>
        <NotificationEmailForm
          initialEmail={organization.notificationEmail}
          enabled={mode === "supabase"}
        />
        {mode === "demo" ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Configure Supabase and sign in to save a workspace email address.
          </p>
        ) : null}
      </section>
    </>
  );
}
