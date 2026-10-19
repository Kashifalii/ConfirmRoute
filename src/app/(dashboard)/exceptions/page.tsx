import type { Metadata } from "next";
import { getExceptionsListData } from "@/lib/data/queries";
import { PageHeader } from "@/components/layout/page-header";
import { ModeBanner } from "@/components/layout/mode-banner";
import { ExceptionsList } from "@/components/exceptions/exceptions-list";

export const metadata: Metadata = {
  title: "Exceptions",
};

export default async function ExceptionsPage() {
  const { mode, exceptions, openCount } = await getExceptionsListData();

  return (
    <>
      <PageHeader
        title="Exceptions"
        description="Discrepancies and missing information that need human review before approval."
      />
      <ModeBanner mode={mode} />
      <ExceptionsList exceptions={exceptions} openCount={openCount} />
    </>
  );
}
