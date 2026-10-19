"use client";

import { useCallback, useRef, useState } from "react";
import { useTransition } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";
import Link from "next/link";
import type { ExtractionResult } from "@/features/extraction/types";
import { extractBookingDataFromText } from "@/features/extraction/local-parser";
import { applyIntakeResultAction } from "@/features/bookings/actions";
import { ExtractionResultView } from "./extraction-result";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formatBytes } from "@/lib/format";
import { showNotificationResult } from "@/components/layout/notification-result";

async function extractTextFromPdf(file: File): Promise<string | null> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });

  try {
    const pdf = await loadingTask.promise;
    const textParts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const rows = new Map<number, Array<{ x: number; text: string }>>();
      for (const item of content.items) {
        if (!("str" in item) || !("transform" in item) || !item.str.trim()) {
          continue;
        }
        const x = item.transform[4] ?? 0;
        const y = Math.round((item.transform[5] ?? 0) * 2) / 2;
        const row = rows.get(y) ?? [];
        row.push({ x, text: item.str.trim() });
        rows.set(y, row);
      }
      const pageText = [...rows.entries()]
        .sort(([yA], [yB]) => yB - yA)
        .map(([, row]) =>
          row
            .sort((a, b) => a.x - b.x)
            .map((item) => item.text)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim(),
        )
        .filter(Boolean)
        .join("\n");
      if (pageText) textParts.push(pageText);
    }

    const fullText = textParts.join("\n").trim();
    return fullText.length > 0 ? fullText : null;
  } finally {
    await loadingTask.destroy();
  }
}

export function PdfUpload({
  maxUploadBytes,
  mode,
}: {
  maxUploadBytes: number;
  mode: "demo" | "supabase";
}) {
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState<string | null | undefined>();
  const [readError, setReadError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [applying, startApply] = useTransition();
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentRetryBookingId, setDocumentRetryBookingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.toLowerCase().includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Please upload a PDF file.");
      return;
    }
    if (file.size > maxUploadBytes) {
      toast.error(`This PDF exceeds the ${formatBytes(maxUploadBytes)} upload limit.`);
      return;
    }
    setFile(file);
    setExtractedText(undefined);
    setReadError(null);
    setResult(null);
    setDocumentRetryBookingId(null);
    setExtracting(true);
    try {
      const text = await extractTextFromPdf(file);
      setExtractedText(text);
    } catch (error) {
      setReadError(error instanceof Error ? error.message : "Failed to read PDF.");
      toast.error(
        error instanceof Error ? error.message : "Failed to read PDF.",
      );
    } finally {
      setExtracting(false);
    }
  }, [maxUploadBytes]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) handleFile(selectedFile);
    },
    [handleFile],
  );

  const handleExtract = useCallback(async () => {
    if (!file || extractedText == null) return;
    setExtracting(true);
    try {
      setResult(extractBookingDataFromText(extractedText));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Extraction failed.",
      );
    } finally {
      setExtracting(false);
    }
  }, [file, extractedText]);

  const handleApply = useCallback(() => {
    if (!result) return;
    startApply(async () => {
      const outcome = await applyIntakeResultAction({
        result,
        document: mode === "demo" && file
          ? {
              filename: file.name,
              mimeType: file.type || "application/pdf",
              sizeBytes: file.size,
              sourceScenario: null,
            }
          : null,
      });
      if (!outcome.ok) {
        toast.error(outcome.message);
        return;
      }
      if (mode === "supabase" && file) {
        setUploadingDocument(true);
        const uploadForm = new FormData();
        uploadForm.set("bookingId", outcome.data.bookingId);
        uploadForm.set("file", file);
        try {
          const response = await fetch("/api/documents", {
            method: "POST",
            body: uploadForm,
          });
          const payload = (await response.json()) as { error?: string };
          if (!response.ok) {
            setDocumentRetryBookingId(outcome.data.bookingId);
            toast.error("Booking created, but the PDF was not stored.", {
              description: payload.error ?? "Retry the upload before leaving this page.",
            });
            return;
          }
        } catch (error) {
          setDocumentRetryBookingId(outcome.data.bookingId);
          toast.error("Booking created, but the PDF was not stored.", {
            description: error instanceof Error ? error.message : "Retry the upload before leaving this page.",
          });
          return;
        } finally {
          setUploadingDocument(false);
        }
      }
      toast.success(
        outcome.data.outcome === "amendment"
          ? "Amendment added for review."
          : "Booking created from intake.",
      );
      showNotificationResult(outcome.data.notification, "Intake saved");
      router.push(`/bookings/${outcome.data.bookingId}`);
    });
  }, [result, file, mode, router]);

  const retryDocumentUpload = useCallback(async () => {
    if (!file || !documentRetryBookingId) return;
    setUploadingDocument(true);
    const uploadForm = new FormData();
    uploadForm.set("bookingId", documentRetryBookingId);
    uploadForm.set("file", file);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        body: uploadForm,
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error("PDF upload failed.", {
          description: payload.error ?? "Please try again.",
        });
        return;
      }
      toast.success("PDF stored in the workspace.");
      router.push(`/bookings/${documentRetryBookingId}`);
    } catch (error) {
      toast.error("PDF upload failed.", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setUploadingDocument(false);
    }
  }, [file, documentRetryBookingId, router]);

  const clearFile = useCallback(() => {
    setFile(null);
    setExtractedText(undefined);
    setReadError(null);
    setResult(null);
    setDocumentRetryBookingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Upload document
        </h2>
        <p className="text-sm text-muted-foreground">
          {mode === "demo"
            ? "Text is extracted and parsed in your browser; PDF bytes stay on this device."
            : "Text is extracted and parsed in your browser; the PDF is stored privately in your Supabase workspace."}
        </p>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/50",
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleInputChange}
          className="hidden"
          aria-label="Upload PDF document"
        />
        {file ? (
          <>
            <FileText className="mb-2 size-8 text-primary" />
            <p className="text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="mt-2"
            >
              <X className="mr-1 size-3" />
              Remove
            </Button>
          </>
        ) : (
          <>
            <Upload className="mb-2 size-8 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Drop a PDF here or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              PDF files only, max {formatBytes(maxUploadBytes)}
            </p>
          </>
        )}
      </div>

      {extracting && !result ? (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Extracting text from PDF...
        </div>
      ) : null}

      {extractedText != null && !result ? (
        <div className="rounded-lg bg-muted p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Extracted text preview:
          </p>
          <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap text-xs text-foreground">
            {extractedText}
          </pre>
          <div className="mt-3 flex justify-end">
            <Button onClick={handleExtract} disabled={extracting}>
              {extracting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Extracting...
                </>
              ) : (
                "Extract fields"
              )}
            </Button>
          </div>
        </div>
      ) : null}

      {readError && file && !extracting ? (
        <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
          <strong>Could not read this PDF:</strong> {readError}
        </div>
      ) : null}

      {extractedText === null && file && !extracting ? (
        <div className="rounded-lg bg-warning/10 p-4 text-sm text-warning-foreground">
          <strong>Scanned PDF detected:</strong> No selectable text could be
          extracted. This MVP does not perform OCR. Review the document manually
          and create a booking from the Bookings page.
        </div>
      ) : null}

      {result ? (
        <ExtractionResultView
          result={result}
          onApply={handleApply}
          applying={applying || uploadingDocument || Boolean(documentRetryBookingId)}
        />
      ) : null}

      {documentRetryBookingId ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-warning-foreground sm:flex-row sm:items-center sm:justify-between"
        >
          <p>
            The booking exists, but its source PDF has not been stored. Retry
            the upload or continue to the booking without its document.
          </p>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              onClick={retryDocumentUpload}
              disabled={uploadingDocument}
            >
              {uploadingDocument ? "Uploading..." : "Retry upload"}
            </Button>
            <Button asChild variant="ghost">
              <Link href={`/bookings/${documentRetryBookingId}`}>Continue</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
