import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Honest persistence/extraction disclosure. Demo mode states clearly that
 * data is fictional and stored locally, not in a database.
 */
export function ModeBanner({
  mode,
  className,
}: {
  mode: "demo" | "supabase";
  className?: string;
}) {
  if (mode === "supabase") {
    return (
      <div
        className={cn(
          "mb-6 flex items-start gap-3 rounded-lg border border-info/30 bg-info/5 px-4 py-3 text-sm text-info",
          className,
        )}
      >
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <p>
          <span className="font-medium">Signed-in workspace.</span>{" "}
          Records are stored in PostgreSQL and protected by organization-scoped
          database policies. Text-based PDFs are parsed locally; sample
          scenarios use predefined data.
        </p>
      </div>
    );
  }
  return (
    <div
      className={cn(
        "mb-6 flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground",
        className,
      )}
    >
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p>
        <span className="font-medium">Demo mode.</span> All bookings, people,
        and suppliers are fictional. Data is stored in a local file on this
        machine — not a database. Text-based PDFs use local rule-based parsing;
        sample scenarios are simulated, not real AI.
      </p>
    </div>
  );
}
