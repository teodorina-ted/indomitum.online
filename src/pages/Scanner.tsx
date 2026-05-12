import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Camera, StopCircle, Search, Leaf } from "lucide-react";
import { toast } from "sonner";

const Scanner = () => {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [manualId, setManualId] = useState("");
  const [starting, setStarting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopScanner();
    };
  }, []);

  const extractSeedId = (raw: string): string => {
    try {
      if (raw.includes("/passport/")) {
        return decodeURIComponent(raw.split("/passport/").pop()!.split("?")[0]);
      }
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

      scannerRef.current = new Html5Qrcode("buyer-scanner-container", {
        verbose: false,
        formatsToSupport: undefined, // all formats
      });

      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
        (decodedText) => {
          stopScanner();
          toast.success("Code scanned!");
          goToPassport(decodedText);
        },
        () => {}
      );

      if (mountedRef.current) setIsScanning(true);

      // iOS Safari fix
      const video = document.querySelector("#buyer-scanner-container video") as HTMLVideoElement;
      if (video) {
        video.setAttribute("playsinline", "true");
        video.muted = true;
        (video as any).playsInline = true;
      }
    } catch (error: any) {
      const msg = error?.message || "";
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        toast.error("Camera permission denied. Please allow camera access.");
      } else if (msg.includes("NotFound")) {
        toast.error("No camera found on this device.");
      } else {
        toast.error("Could not start scanner. Try again.");
      }
    } finally {
      if (mountedRef.current) setStarting(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
        {/* Title */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">Scan Your Product</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enter the ID from your seed bag to view its Plant Passport
          </p>
        </div>

        {/* Scanner box — same style as collector */}
        <div
          id="buyer-scanner-container"
          className="w-full aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden bg-muted border-2 border-dashed border-border"
          style={{ minHeight: isScanning ? "300px" : "200px" }}
        />

        {/* Controls */}
        <div className="flex justify-center">
          {!isScanning ? (
            <Button onClick={startScanner} size="lg" className="gap-2 w-full max-w-xs" disabled={starting}>
              <Camera className="h-5 w-5" />
              {starting ? "Starting..." : "Scan with Camera"}
            </Button>
          ) : (
            <Button onClick={stopScanner} variant="destructive" size="lg" className="gap-2 w-full max-w-xs">
              <StopCircle className="h-5 w-5" />
              Stop Scanning
            </Button>
          )}
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or enter ID manually</span>
          </div>
        </div>

        {/* Manual input */}
        <div className="space-y-3">
          <Input
            placeholder="e.g., SEED-ABC123"
            value={manualId}
            onChange={e => setManualId(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && manualId.trim()) goToPassport(manualId); }}
            className="text-center font-mono"
          />
          <Button
            className="w-full"
            size="lg"
            disabled={!manualId.trim()}
            onClick={() => goToPassport(manualId)}
          >
            <Search className="w-4 h-4 mr-2" />
            View Passport
          </Button>
        </div>

        {/* Instructions */}
        <div className="bg-muted/50 rounded-xl p-4">
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li>• Tap "Scan with Camera" to start the live scanner</li>
            <li>• Point at the QR code or barcode on the seed bag</li>
            <li>• The plant passport will open automatically</li>
            <li>• You can then save it to your list or favorites</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default Scanner;
