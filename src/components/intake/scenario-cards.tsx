"use client";

import { useState } from "react";
import { useTransition } from "react";
import { Loader2, Play } from "lucide-react";
import {
  EXTRACTION_SCENARIOS,
  type ExtractionResult,
  type ScenarioId,
} from "@/features/extraction/types";
import { mockExtractionProvider } from "@/features/extraction/mock-provider";
import { applyIntakeResultAction } from "@/features/bookings/actions";
import { ExtractionResultView } from "./extraction-result";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function ScenarioCards() {
  const [runningId, setRunningId] = useState<ScenarioId | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [applying, startApply] = useTransition();
  const router = useRouter();

  async function runScenario(scenarioId: ScenarioId) {
    setRunningId(scenarioId);
    setResult(null);
    try {
      const extractionResult = await mockExtractionProvider.extract({
        kind: "scenario",
        scenarioId,
      });
      setResult(extractionResult);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Scenario failed to run.",
      );
    } finally {
      setRunningId(null);
    }
  }

  async function applyResult() {
    if (!result) return;
    startApply(async () => {
      const outcome = await applyIntakeResultAction({ result });
      if (!outcome.ok) {
        toast.error(outcome.message);
        return;
      }
      toast.success(
        outcome.data.outcome === "amendment"
          ? "Amendment added for review."
          : "Booking created from intake.",
      );
      router.push(`/bookings/${outcome.data.bookingId}`);
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Sample scenarios
        </h2>
        <p className="text-sm text-muted-foreground">
          Run a predefined scenario to see how the system handles different
          document types.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {EXTRACTION_SCENARIOS.map((scenario) => (
          <Card key={scenario.id}>
            <CardHeader>
              <CardTitle className="text-base">{scenario.title}</CardTitle>
              <CardDescription>{scenario.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-muted-foreground">
                <strong>Expected:</strong> {scenario.expectedBehavior}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => runScenario(scenario.id)}
                disabled={runningId !== null}
              >
                {runningId === scenario.id ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 size-4" />
                    Run scenario
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {result ? (
        <ExtractionResultView
          result={result}
          onApply={applyResult}
          applying={applying}
        />
      ) : null}
    </div>
  );
}
