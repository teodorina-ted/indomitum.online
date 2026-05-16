import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Camera, StopCircle, Search, Leaf } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const Scanner = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [manualId, setManualId] = useState("");
  const [starting, setStarting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(true);
  const containerId = useRef(`scanner-${Math.random().toString(36).substr(2, 9)}`);

  // Auth guard — redirect if not logged in
  useEffect(() => {
    if (!isLoading && !user) navigate("/login");
  }, [user, isLoading, navigate]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopScanner();
    };
  }, []);

  const extractSeedId = (raw: string): string => {
    try {
      if (raw.includes("/passport/")) return decodeURIComponent(raw.split("/passport/").pop()!.split("?")[0]);
      if (raw.startsWith("http")) {
        const parts = new URL(raw).pathname.split("/").filter(Boolean);
        return parts[parts.length - 1] || raw;
      }
    } catch {}
    return raw.trim();
  };

  const goToPassport = (seedId: string) => {
    const id = extractSeedId(seedId);
    if (!id) { toast.error("Invalid code"); return; }
    navigate(`/passport/${encodeURIComponent(id)}`);
  };

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    if (mountedRef.current) setIsScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    setStarting(true);
    try {
      await stopScanner();

      // No formatsToSupport — passing undefined crashes with forEach error
      scannerRef.current = new Html5Qrcode(containerId.current, { verbose: false });

      const config = { fps: 15, qrbox: { width: 250, height: 250 }, aspectRatio: 1 };
      const onSuccess = (decodedText: string) => {
        stopScanner();
        toast.success("Code scanned!");
        goToPassport(decodedText);
      };

      // Try back camera, fall back to any camera
      try {
        await scannerRef.current.start({ facingMode: { ideal: "environment" } }, config, onSuccess, () => {});
      } catch {
        await scannerRef.current.start({ facingMode: "user" }, config, onSuccess, () => {});
      }

      if (mountedRef.current) setIsScanning(true);

      const video = document.querySelector(`#${containerId.current} video`) as HTMLVideoElement;
      if (video) { video.setAttribute("playsinline", "true"); video.muted = true; }

    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        toast.error("Camera permission denied. Allow camera access in browser settings.");
      } else if (msg.includes("NotFound")) {
        toast.error("No camera found on this device.");
      } else {
        toast.error("Could not start camera. Make sure no other app is using it.");
      }
    } finally {
      if (mountedRef.current) setStarting(false);
    }
  }, []);

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="flex h-14 items-center gap-4 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => { stopScanner(); navigate(-1); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Leaf className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <h1 className="font-semibold text-lg">Scan Product</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">Scan Your Product</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Point at a QR code or barcode on the seed bag
          </p>
        </div>

        {/* Scanner box with placeholder */}
        <div className="relative w-full aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden bg-muted border-2 border-dashed border-border">
          <div id={containerId.current} className="w-full h-full" />
          {!isScanning && !starting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6 pointer-events-none">
              <Camera className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Available on mobile & tablet.<br />Tap below to start camera.
              </p>
            </div>
          )}
          {starting && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Single button */}
        <div className="flex justify-center">
          {!isScanning ? (
            <Button onClick={startScanner} size="lg" className="w-full max-w-xs" disabled={starting}>
              <Camera className="h-5 w-5 mr-2" />
              {starting ? "Starting..." : "Scan with Camera"}
            </Button>
          ) : (
            <Button onClick={stopScanner} variant="outline" size="lg" className="w-full max-w-xs">
              <StopCircle className="h-5 w-5 mr-2" />Stop Scanning
            </Button>
          )}
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or enter ID manually</span>
          </div>
        </div>

        <div className="space-y-3">
          <Input
            placeholder="e.g., SEED-ABC123"
            value={manualId}
            onChange={e => setManualId(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && manualId.trim()) goToPassport(manualId); }}
            className="text-center font-mono"
          />
          <Button className="w-full" size="lg" disabled={!manualId.trim()} onClick={() => goToPassport(manualId)}>
            <Search className="w-4 h-4 mr-2" />View Passport
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Scanner;
