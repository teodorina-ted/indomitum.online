import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, StopCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface WebScannerProps {
  onScan: (result: string) => void;
  className?: string;
  autoStart?: boolean;
}

// Native BarcodeDetector — available on Chrome Android, Safari 17+, Edge
const hasBarcodeDetector = () =>
  typeof window !== "undefined" && "BarcodeDetector" in window;

const SUPPORTED_FORMATS = [
  "qr_code", "ean_13", "ean_8", "code_128", "code_39", "code_93",
  "itf", "upc_a", "upc_e", "data_matrix", "aztec", "pdf417",
];

const WebScanner = ({ onScan, className = "", autoStart = false }: WebScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectorRef = useRef<any>(null);
  const lastScanRef = useRef<string>("");
  const mountedRef = useRef(true);

  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    setSupported(hasBarcodeDetector());
    if (autoStart) startScanner();
    return () => {
      mountedRef.current = false;
      stopScanner();
    };
  }, []);

  const stopScanner = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    if (mountedRef.current) setIsScanning(false);
  }, []);

  const scanLoop = useCallback(async () => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video || !detector || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }
    try {
      const barcodes = await detector.detect(video);
      if (barcodes.length > 0) {
        const value = barcodes[0].rawValue;
        if (value && value !== lastScanRef.current) {
          lastScanRef.current = value;
          stopScanner();
          onScan(value);
          return;
        }
      }
    } catch {
      // detector not ready yet, keep looping
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  }, [onScan, stopScanner]);

  const startScanner = useCallback(async () => {
    if (!hasBarcodeDetector()) {
      toast.error("Camera scanning not supported. Enter the ID manually.");
      return;
    }
    setIsStarting(true);
    lastScanRef.current = "";
    try {
      let formats = SUPPORTED_FORMATS;
      try {
        const sup = await (window as any).BarcodeDetector.getSupportedFormats();
        formats = SUPPORTED_FORMATS.filter((f) => sup.includes(f));
      } catch {}

      detectorRef.current = new (window as any).BarcodeDetector({ formats });

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (!mountedRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }

      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.muted = true;
      await video.play();

      if (mountedRef.current) {
        setIsScanning(true);
        rafRef.current = requestAnimationFrame(scanLoop);
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      const msg = err?.message || "";
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        toast.error("Camera permission denied. Please allow camera access.");
      } else if (msg.includes("NotFound")) {
        toast.error("No camera found on this device.");
      } else {
        toast.error("Could not start camera. Try again.");
      }
    } finally {
      if (mountedRef.current) setIsStarting(false);
    }
  }, [scanLoop]);

  if (supported === false) {
    return (
      <div className={`text-center py-4 text-sm text-muted-foreground ${className}`}>
        Camera scanning not available in this browser. Use the manual input below.
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="relative w-full max-w-xs mx-auto rounded-2xl overflow-hidden bg-black aspect-square">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          style={{ display: isScanning ? "block" : "none" }}
        />
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-white/70 rounded-xl" />
          </div>
        )}
        {!isScanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted rounded-2xl">
            {isStarting ? (
              <>
                <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                <p className="text-xs text-muted-foreground">Starting camera…</p>
              </>
            ) : (
              <>
                <Camera className="w-10 h-10 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Camera off</p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-center mt-3">
        {!isScanning ? (
          <Button onClick={startScanner} size="lg" disabled={isStarting}>
            {isStarting
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting…</>
              : <><Camera className="w-4 h-4 mr-2" />Scan with Camera</>
            }
          </Button>
        ) : (
          <Button onClick={stopScanner} variant="outline" size="lg">
            <StopCircle className="w-4 h-4 mr-2" />Stop Camera
          </Button>
        )}
      </div>

      {isScanning && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Point at a QR code or barcode
        </p>
      )}
    </div>
  );
};

export default WebScanner;
