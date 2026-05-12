import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TourStep {
  target: string;
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right";
  icon?: React.ReactNode;
}

interface GuidedTourProps {
  steps: TourStep[];
  storageKey: string;
  open: boolean;
  onFinish: () => void;
}

export function GuidedTour({ steps, storageKey, open, onFinish }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);

  if (!open || done) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  const handleFinish = () => {
    localStorage.setItem(storageKey, "true");
    setDone(true);
    onFinish();
  };

  const handleNext = () => {
    if (isLast) handleFinish();
    else setCurrentStep(c => c + 1);
  };

  const handlePrev = () => {
    if (!isFirst) setCurrentStep(c => c - 1);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={handleFinish} />

      {/* Bottom sheet — fluid, centered, responsive */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="w-full max-w-lg pointer-events-auto bg-background rounded-t-2xl shadow-2xl border-t border-border p-5 sm:p-6 mx-0 sm:mx-4 sm:mb-4 sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">
              Quick Tour {currentStep + 1}/{steps.length}
            </span>
          </div>
          <button onClick={handleFinish} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step dots */}
        <div className="flex gap-1.5 mb-4">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentStep ? "bg-primary flex-1" : i < currentStep ? "bg-primary/40 w-4" : "bg-muted w-4"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center gap-3">
            {step.icon && (
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                {step.icon}
              </div>
            )}
            <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
          </div>
          <p className="text-muted-foreground leading-relaxed">{step.description}</p>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {!isFirst && (
            <Button variant="outline" onClick={handlePrev} className="flex-1">
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          <Button onClick={handleNext} className="flex-1">
            {isLast ? (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> Done</>
            ) : (
              <>Next <ChevronRight className="w-4 h-4 ml-1" /></>
            )}
          </Button>
        </div>

        {/* Skip */}
        {!isLast && (
          <button onClick={handleFinish} className="w-full text-center text-xs text-muted-foreground mt-3 hover:text-foreground">
            Skip tour
          </button>
        )}
      </div>
      </div>
    </>
  );
}
