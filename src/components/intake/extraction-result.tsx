"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import type {
  ExtractedFieldEvidence,
  ExtractionResult,
} from "@/features/extraction/types";
import { formatDate, formatMoney } from "@/lib/format";
import { SERVICE_TYPE_LABELS } from "@/types/domain";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ExtractionResultViewProps {
  result: ExtractionResult;
  onApply: () => void;
  applying: boolean;
}

function FieldRow({
  label,
  value,
  missing,
  evidence,
}: {
  label: string;
  value: string | null;
  missing?: boolean;
  evidence?: ExtractedFieldEvidence;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 py-2 last:border-0">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-sm",
          missing ? "text-destructive" : "text-foreground",
        )}
      >
        {value ?? (
          <span className="italic text-destructive">Missing</span>
        )}
        {evidence ? (
          <span className="mt-1 block max-w-sm text-right text-xs text-muted-foreground">
            {evidence.confidence} confidence · “{evidence.text}”
          </span>
        ) : null}
      </dd>
    </div>
  );
}

export function ExtractionResultView({
  result,
  onApply,
  applying,
}: ExtractionResultViewProps) {
  const { data, disclosure } = result;
  const hasAnyData = Object.values(data).some((v) => v !== null);

  return (
    <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="mb-3 flex items-start gap-2 rounded-lg bg-info/10 p-3 text-sm text-info">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <p>{disclosure}</p>
      </div>

      {hasAnyData ? (
        <>
          <dl className="space-y-0">
            <FieldRow label="Reference" value={data.reference} missing={!data.reference} evidence={result.fieldEvidence?.reference} />
            <FieldRow label="Customer" value={data.customerName} missing={!data.customerName} evidence={result.fieldEvidence?.customerName} />
            <FieldRow label="Supplier" value={data.supplierName} missing={!data.supplierName} evidence={result.fieldEvidence?.supplierName} />
            <FieldRow
              label="Service type"
              value={data.serviceType ? SERVICE_TYPE_LABELS[data.serviceType] : null}
              missing={!data.serviceType}
              evidence={result.fieldEvidence?.serviceType}
            />
            <FieldRow
              label="Start date"
              value={data.startDate ? formatDate(data.startDate) : null}
              missing={!data.startDate}
              evidence={result.fieldEvidence?.startDate}
            />
            <FieldRow
              label="End date"
              value={data.endDate ? formatDate(data.endDate) : null}
              missing={!data.endDate}
              evidence={result.fieldEvidence?.endDate}
            />
            <FieldRow
              label="Amount"
              value={
                data.amount !== null && data.currency
                  ? formatMoney(data.amount, data.currency)
                  : null
              }
              missing={data.amount === null}
              evidence={result.fieldEvidence?.amount}
            />
            <FieldRow label="Currency" value={data.currency} missing={!data.currency} evidence={result.fieldEvidence?.currency} />
          </dl>

          <div className="mt-4 flex justify-end">
            <Button onClick={onApply} disabled={applying || !data.reference}>
              {applying ? (
                <>
                  <CheckCircle2 className="mr-2 size-4 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 size-4" />
                  Apply to bookings
                </>
              )}
            </Button>
          </div>
        </>
      ) : (
        <div className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
          No structured data could be extracted. Review the document manually
          and create a booking from the Bookings page.
        </div>
      )}
    </div>
  );
}
