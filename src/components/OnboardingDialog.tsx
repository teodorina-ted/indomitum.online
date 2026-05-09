import { useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type OnboardingDialogProps = {
  storageKey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  bullets: string[];
};

export function OnboardingDialog({
  storageKey,
  open,
  onOpenChange,
  title,
  bullets,
}: OnboardingDialogProps) {
  const completed = useMemo(() => {
    try {
      return localStorage.getItem(storageKey) === "true";
    } catch {
      return false;
    }
  }, [storageKey]);

  useEffect(() => {
    if (completed) return;
    // Auto-open only if not completed (parent still controls open)
  }, [completed]);

  const markCompleted = () => {
    try {
      localStorage.setItem(storageKey, "true");
    } catch {
      // ignore
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // If user closes it, consider it completed so it doesn't spam.
        if (!next) markCompleted();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
            {bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>

          <Separator />

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => {
                markCompleted();
                onOpenChange(false);
              }}
            >
              Got it
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                markCompleted();
                onOpenChange(false);
              }}
            >
              Skip
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
