import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  hint?: string;
  tone?: "neutral" | "warning" | "success" | "info";
}) {
  const tones: Record<string, string> = {
    neutral: "text-foreground",
    warning: "text-warning-foreground",
    success: "text-success",
    info: "text-info",
  };
  return (
    <Card className="min-w-0">
      <CardContent className="flex items-center gap-4 p-5">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p
            className={cn(
              "text-2xl font-semibold tabular-nums leading-tight",
              tones[tone],
            )}
          >
            {value}
          </p>
          {hint ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {hint}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
