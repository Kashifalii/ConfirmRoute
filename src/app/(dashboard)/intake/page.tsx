import type { Metadata } from "next";
import { getUploadLimitBytes, isSupabaseConfigured } from "@/lib/config";
import { PageHeader } from "@/components/layout/page-header";
import { ModeBanner } from "@/components/layout/mode-banner";
import { ScenarioCards } from "@/components/intake/scenario-cards";
import { PdfUpload } from "@/components/intake/pdf-upload";

export const metadata: Metadata = {
  title: "Document intake",
};

export default function IntakePage() {
  const mode = isSupabaseConfigured() ? "supabase" : "demo";

  return (
    <>
      <PageHeader
        title="Document intake"
        description="Upload a booking confirmation or run a sample scenario to see how extraction works."
      />
      <ModeBanner mode={mode} />

      <div className="space-y-8">
        <ScenarioCards />
        <PdfUpload
          maxUploadBytes={getUploadLimitBytes()}
          mode={mode}
        />
      </div>
    </>
  );
}
