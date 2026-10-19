import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BOOKING_STATUS_LABELS,
  EXCEPTION_TYPE_LABELS,
  type BookingStatus,
  type ExceptionStatus,
  type ExceptionType,
} from "@/types/domain";

const BOOKING_STATUS_STYLES: Record<BookingStatus, string> = {
  pending_review: "border-warning/40 bg-warning/15 text-warning-foreground",
  approved: "border-success/30 bg-success/10 text-success",
  archived: "border-border bg-muted text-muted-foreground",
};

export function BookingStatusBadge({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(BOOKING_STATUS_STYLES[status], className)}>
      {BOOKING_STATUS_LABELS[status]}
    </Badge>
  );
}

const EXCEPTION_TYPE_STYLES: Record<ExceptionType, string> = {
  missing_field: "border-warning/40 bg-warning/15 text-warning-foreground",
  duplicate_reference: "border-info/30 bg-info/10 text-info",
  value_change: "border-info/30 bg-info/10 text-info",
  invalid_value: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function ExceptionTypeBadge({
  type,
  className,
}: {
  type: ExceptionType;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(EXCEPTION_TYPE_STYLES[type], className)}>
      {EXCEPTION_TYPE_LABELS[type]}
    </Badge>
  );
}

export function ExceptionStatusBadge({
  status,
  className,
}: {
  status: ExceptionStatus;
  className?: string;
}) {
  return status === "open" ? (
    <Badge variant="outline" className={cn("border-destructive/30 bg-destructive/10 text-destructive", className)}>
      Open
    </Badge>
  ) : (
    <Badge variant="outline" className={cn("border-success/30 bg-success/10 text-success", className)}>
      Resolved
    </Badge>
  );
}
