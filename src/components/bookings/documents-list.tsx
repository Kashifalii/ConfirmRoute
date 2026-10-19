import { FileText } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BookingDocument } from "@/types/domain";
import { formatBytes, formatDateTime } from "@/lib/format";

export function DocumentsList({
  documents,
  mode,
}: {
  documents: BookingDocument[];
  mode: "demo" | "supabase";
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent className="px-0 py-0">
        {documents.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No documents attached to this booking.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {documents.map((document) => (
              <li key={document.id} className="flex items-start gap-3 px-4 py-3">
                <FileText aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {document.filename}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatBytes(document.sizeBytes)} · added{" "}
                    {formatDateTime(document.createdAt)}
                    {document.sourceScenario ? ` · from intake scenario` : ""}
                  </p>
                  {document.downloadUrl ? (
                    <Link
                      href={document.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Open PDF
                    </Link>
                  ) : null}
                  {mode === "demo" ? (
                    <p className="mt-1 text-xs text-muted-foreground/80">
                      File was processed in the browser; only metadata is kept in
                      demo mode.
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
