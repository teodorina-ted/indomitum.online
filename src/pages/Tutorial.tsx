import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Leaf, Scan, Package, MapPin, Download, Users, Shield, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  {
    icon: <Users className="w-8 h-8" />,
    title: "Create Your Account",
    description: "Sign up as a Collector to manage seeds, or as a Buyer to browse and order. Choose your role during registration — each role unlocks different features.",
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    icon: <Package className="w-8 h-8" />,
    title: "Add Your First Seed",
    description: "Navigate to the Dashboard and click 'Add Plant'. Fill in the seed ID, name, quantity, and optional location data. You can also capture a photo or scan a barcode.",
    color: "bg-emerald-500/10 text-emerald-500",
  },
  {
    icon: <Scan className="w-8 h-8" />,
    title: "Scan & Track Barcodes",
    description: "Use the built-in scanner to read barcodes or QR codes. Each seed gets a unique barcode that links to its digital passport — perfect for inventory management.",
    color: "bg-purple-500/10 text-purple-500",
  },
  {
    icon: <MapPin className="w-8 h-8" />,
    title: "Geolocation & Mapping",
    description: "Tag each seed with GPS coordinates. The platform automatically captures your location or lets you enter it manually. View collection sites on a map.",
    color: "bg-orange-500/10 text-orange-500",
  },
  {
    icon: <Download className="w-8 h-8" />,
    title: "Import & Export Data",
    description: "Bulk import seeds from CSV, JSON, or XLSX files. Export your collection in multiple formats including PDF seed passports with barcodes.",
    color: "bg-cyan-500/10 text-cyan-500",
  },
  {
    icon: <BarChart3 className="w-8 h-8" />,
    title: "Track Orders & History",
    description: "Monitor order status from request to delivery. Every change is logged in the history — edits, deletions, and status transitions are fully auditable.",
    color: "bg-pink-500/10 text-pink-500",
  },
  {
    icon: <Shield className="w-8 h-8" />,
    title: "Security & Roles",
    description: "Role-based access ensures collectors manage inventory while buyers can only view and order. All data is protected with row-level security policies.",
    color: "bg-amber-500/10 text-amber-500",
  },
];

const Tutorial = () => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [isAnimating, setIsAnimating] = useState(false);

  const goTo = useCallback((index: number) => {
    if (isAnimating || index === current) return;
    setDirection(index > current ? "right" : "left");
    setIsAnimating(true);
    setTimeout(() => {
      setCurrent(index);
      setIsAnimating(false);
    }, 200);
  }, [current, isAnimating]);

  const next = useCallback(() => goTo(Math.min(current + 1, slides.length - 1)), [current, goTo]);
  const prev = useCallback(() => goTo(Math.max(current - 1, 0)), [current, goTo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  // Auto-advance every 6s
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[current];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 lg:px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Leaf className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">Tutorial</h1>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-3">How to Use Indomitum</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Swipe through the steps or use arrow keys to navigate.
          </p>
        </div>

        {/* Carousel Card */}
        <div className="relative">
          <div
            className={`bg-card rounded-2xl border border-border shadow-lg p-8 sm:p-12 text-center min-h-[320px] flex flex-col items-center justify-center transition-all duration-200 ${
              isAnimating
                ? direction === "right"
                  ? "opacity-0 translate-x-8"
                  : "opacity-0 -translate-x-8"
                : "opacity-100 translate-x-0"
            }`}
          >
            <div className={`w-16 h-16 rounded-2xl ${slide.color} flex items-center justify-center mx-auto mb-6`}>
              {slide.icon}
            </div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-3">
              Step {current + 1} of {slides.length}
            </p>
            <h3 className="text-xl font-semibold text-foreground mb-3">{slide.title}</h3>
            <p className="text-muted-foreground leading-relaxed max-w-md">{slide.description}</p>
          </div>

          {/* Prev/Next Arrows */}
          <button
            onClick={prev}
            disabled={current === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            disabled={current === slides.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-200 ${
                i === current
                  ? "w-6 h-2 bg-primary"
                  : "w-2 h-2 bg-muted-foreground/25 hover:bg-muted-foreground/40"
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <Link to="/login">
            <Button size="lg">
              <Leaf className="w-4 h-4 mr-2" />
              Start Collecting
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Tutorial;
