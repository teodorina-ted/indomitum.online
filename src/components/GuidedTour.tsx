import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
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

type Placement = "top" | "bottom" | "left" | "right";
type Phase = "welcome" | "steps" | "complete";

const TOOLTIP_WIDTH = 320;
const VIEWPORT_PADDING = 12;
const SPOTLIGHT_PADDING = 10;
const TOOLTIP_GAP = 14;
const MOBILE_BREAKPOINT = 640;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function GuidedTour({ steps, storageKey, open, onFinish }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [phase, setPhase] = useState<Phase>("welcome");
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];

  const measureTarget = useCallback(() => {
    if (!step) return;
    const target = document.querySelector(step.target);
    if (!target) { setRect(null); return; }
    setRect(target.getBoundingClientRect());
  }, [step]);

  const focusTarget = useCallback(() => {
    if (!step) return;
    const target = document.querySelector(step.target);
    if (!target) { setRect(null); return; }

    target.scrollIntoView({
      behavior: "smooth",
      block: window.innerWidth < MOBILE_BREAKPOINT ? "center" : "nearest",
      inline: "nearest",
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        measureTarget();
        setIsVisible(true);
      });
    });
  }, [measureTarget, step]);

  useEffect(() => {
    if (!open || phase !== "steps") return;
    setIsVisible(false);
    const timer = window.setTimeout(focusTarget, 80);
    return () => window.clearTimeout(timer);
  }, [open, currentStep, focusTarget, phase]);

  useEffect(() => {
    if (!open || phase !== "steps") return;
    const sync = () => measureTarget();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [open, measureTarget, phase]);

  // Reset phase when tour opens
  useEffect(() => {
    if (open) {
      setPhase("welcome");
      setCurrentStep(0);
      setIsVisible(false);
    }
  }, [open]);

  const finish = useCallback(() => {
    try { localStorage.setItem(storageKey, "true"); } catch {}
    setCurrentStep(0);
    setRect(null);
    setIsVisible(false);
    setPhase("welcome");
    onFinish();
  }, [storageKey, onFinish]);

  const next = useCallback(() => {
    if (currentStep >= steps.length - 1) {
      setPhase("complete");
      return;
    }
    setCurrentStep((prev) => prev + 1);
  }, [currentStep, steps.length]);

  const prev = useCallback(() => {
    setCurrentStep((prevStep) => Math.max(prevStep - 1, 0));
  }, []);

  const startTour = useCallback(() => {
    setPhase("steps");
    setCurrentStep(0);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (phase === "welcome") {
        if (event.key === "Enter") startTour();
        if (event.key === "Escape") finish();
        return;
      }
      if (phase === "complete") {
        if (event.key === "Enter" || event.key === "Escape") finish();
        return;
      }
      if (event.key === "ArrowRight" || event.key === "Enter") next();
      if (event.key === "ArrowLeft") prev();
      if (event.key === "Escape") finish();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, next, prev, finish, phase, startTour]);

  if (!open) return null;

  // ── Welcome Screen ──
  if (phase === "welcome") {
    return createPortal(
      <div className="pointer-events-none fixed inset-0 z-[9999]" role="dialog" aria-modal="true" aria-label="Welcome to tour">
        <div className="absolute inset-0 bg-foreground/20 pointer-events-auto" onClick={finish} />
        <div className="pointer-events-auto fixed z-[10000] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] max-w-[calc(100vw-32px)] rounded-2xl border border-border/70 bg-background shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300">
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">Welcome to Indomitum!</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Take a quick tour to learn the key features. It only takes a few seconds.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={finish} className="flex-1 text-xs">
                Skip
              </Button>
              <Button size="sm" onClick={startTour} className="flex-1 text-xs">
                Start Tour
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/60">
              Press Enter to start · Esc to skip
            </p>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  // ── Completion Screen ──
  if (phase === "complete") {
    return createPortal(
      <div className="pointer-events-none fixed inset-0 z-[9999]" role="dialog" aria-modal="true" aria-label="Tour complete">
        <div className="absolute inset-0 bg-foreground/20 pointer-events-auto" onClick={finish} />
        <div className="pointer-events-auto fixed z-[10000] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] max-w-[calc(100vw-32px)] rounded-2xl border border-border/70 bg-background shadow-2xl animate-in fade-in-0 zoom-in-95 duration-300">
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7 text-emerald-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">You're all set!</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You can restart the tour anytime from the sidebar menu.
              </p>
            </div>
            <Button size="sm" onClick={finish} className="w-full text-xs">
              Get Started
            </Button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  // ── Step-by-step Tour ──
  if (!step) return null;

  const spotlightStyle = rect
    ? {
        top: rect.top - SPOTLIGHT_PADDING,
        left: rect.left - SPOTLIGHT_PADDING,
        width: rect.width + SPOTLIGHT_PADDING * 2,
        height: rect.height + SPOTLIGHT_PADDING * 2,
      }
    : null;

  const getTooltipStyle = (): React.CSSProperties => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = Math.min(tooltipRef.current?.offsetWidth ?? TOOLTIP_WIDTH, viewportWidth - VIEWPORT_PADDING * 2);
    const tooltipHeight = tooltipRef.current?.offsetHeight ?? 188;

    if (!rect || viewportWidth < MOBILE_BREAKPOINT) {
      return {
        left: viewportWidth / 2,
        top: viewportHeight - tooltipHeight - VIEWPORT_PADDING,
        transform: "translateX(-50%)",
      };
    }

    const preferredPlacement: Placement = step.placement || "bottom";
    const placements: Placement[] = [
      preferredPlacement,
      ...(["bottom", "top", "right", "left"] as Placement[]).filter((p) => p !== preferredPlacement),
    ];

    const candidateStyles = placements.map((placement) => {
      switch (placement) {
        case "top":
          return { placement, top: rect.top - tooltipHeight - TOOLTIP_GAP, left: rect.left + rect.width / 2 - tooltipWidth / 2 };
        case "left":
          return { placement, top: rect.top + rect.height / 2 - tooltipHeight / 2, left: rect.left - tooltipWidth - TOOLTIP_GAP };
        case "right":
          return { placement, top: rect.top + rect.height / 2 - tooltipHeight / 2, left: rect.right + TOOLTIP_GAP };
        default:
          return { placement: "bottom" as Placement, top: rect.bottom + TOOLTIP_GAP, left: rect.left + rect.width / 2 - tooltipWidth / 2 };
      }
    });

    const fullyVisible = candidateStyles.find(
      (c) =>
        c.left >= VIEWPORT_PADDING &&
        c.top >= VIEWPORT_PADDING &&
        c.left + tooltipWidth <= viewportWidth - VIEWPORT_PADDING &&
        c.top + tooltipHeight <= viewportHeight - VIEWPORT_PADDING,
    );

    const bestCandidate = fullyVisible || candidateStyles[0];

    return {
      left: clamp(bestCandidate.left, VIEWPORT_PADDING, viewportWidth - tooltipWidth - VIEWPORT_PADDING),
      top: clamp(bestCandidate.top, VIEWPORT_PADDING, viewportHeight - tooltipHeight - VIEWPORT_PADDING),
    };
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[9999]" role="dialog" aria-modal="true" aria-label="Guided tour">
      {/* Overlay with cutout */}
      <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <mask id="tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spotlightStyle && (
              <rect
                x={spotlightStyle.left}
                y={spotlightStyle.top}
                width={spotlightStyle.width}
                height={spotlightStyle.height}
                rx="14"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0" y="0" width="100%" height="100%"
          mask="url(#tour-mask)"
          className="pointer-events-auto"
          style={{ fill: "hsl(var(--foreground) / 0.18)" }}
          onClick={finish}
        />
      </svg>

      {/* Spotlight ring */}
      {spotlightStyle && (
        <div
          className="absolute rounded-2xl border-2 border-primary/40 shadow-[0_0_0_4px_hsl(var(--background)/0.6)] transition-all duration-200 ease-out"
          style={{
            top: spotlightStyle.top,
            left: spotlightStyle.left,
            width: spotlightStyle.width,
            height: spotlightStyle.height,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={`pointer-events-auto fixed z-[10000] w-[320px] max-w-[calc(100vw-24px)] overflow-hidden rounded-2xl border border-border/70 bg-background shadow-xl transition-all duration-200 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
        style={getTooltipStyle()}
      >
        {/* Progress bar */}
        <div className="h-0.5 w-full bg-muted">
          <div className="h-full bg-primary transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
        </div>

        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2">
                {step.icon && (
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                    {step.icon}
                  </div>
                )}
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  {currentStep + 1} / {steps.length}
                </p>
              </div>
              <h3 className="text-sm font-semibold leading-snug text-foreground">{step.title}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">{step.description}</p>
            </div>

            <button
              type="button"
              onClick={finish}
              className="shrink-0 rounded-full p-1 text-muted-foreground/60 transition-colors hover:text-foreground hover:bg-muted"
              aria-label="Close guided tour"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3 pt-1">
            {/* Dots */}
            <div className="flex items-center gap-1">
              {steps.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentStep(index)}
                  className={`rounded-full transition-all duration-200 ${
                    index === currentStep
                      ? "w-5 h-1.5 bg-primary"
                      : index < currentStep
                        ? "w-2 h-1.5 bg-primary/30 hover:bg-primary/50"
                        : "w-2 h-1.5 bg-muted-foreground/20 hover:bg-muted-foreground/40"
                  }`}
                  aria-label={`Go to step ${index + 1}`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={prev}
                disabled={currentStep === 0}
                className="h-7 px-2 text-xs"
              >
                <ChevronLeft className="mr-0.5 h-3 w-3" />
                Back
              </Button>
              <Button size="sm" onClick={next} className="h-7 px-3 text-xs">
                {currentStep === steps.length - 1 ? "Finish" : "Next"}
                {currentStep !== steps.length - 1 && <ChevronRight className="ml-0.5 h-3 w-3" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
