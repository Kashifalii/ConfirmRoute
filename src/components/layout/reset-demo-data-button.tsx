"use client";

import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { resetDemoDataAction } from "@/features/bookings/actions";
import { Button } from "@/components/ui/button";

export function ResetDemoDataButton({ className }: { className?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function reset() {
    const confirmed = window.confirm(
      "Reset all demo data? Every booking, exception, and change made in this session will be replaced with the original fictional sample data.",
    );
    if (!confirmed) return;
    startTransition(async () => {
      const result = await resetDemoDataAction();
      if (result.ok) {
        toast.success("Demo data reset", {
          description: "The fictional sample workspace has been restored.",
        });
        router.refresh();
      } else {
        toast.error("Could not reset", { description: result.message });
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className={className}
      onClick={reset}
      disabled={isPending}
    >
      <RotateCcw aria-hidden="true" />
      Reset demo data
    </Button>
  );
}
