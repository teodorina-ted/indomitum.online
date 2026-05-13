import { useState, useEffect, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, StopCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface WebScannerProps {
  onScan: (result: string) => void;
  className?: string;
  autoStart?: boolean;
}

const extractId = (raw: string): string => {
  try {
    if (raw.includes("/passport/")) return decodeURIComponent(raw.split("/passport/").pop()!.split("?")[0]);
    if (raw.startsWith("http")) {
      const parts = new URL(raw).pathname.split("/").filter(Boolean);
      return parts[parts.length - 1] || raw;
    }
  } catch {}
  return raw.trim();
};

// Unique ID per instance so multiple scanners on the same page don't conflict
let instanceCounter = 0;

const WebScanner = ({ onScan, className = "" }: WebScannerProps) => {
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(true);
  const scannerIdRef = useRef(`html5qr-${++instanceCounter}`);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopScanner();
    };
  }, []);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
    if (mountedRef.current) setScanning(false);
  };

  const startScanner = async () => {
    setStarting(true);
    try {
      await stopScanner();

      const scanner = new Html5Qrcode(scannerIdRef.current, {
        verbose: false,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ],
      });

      scannerRef.current = scanner;

      // Try back camera first, fall back to any camera if rejected
      const startCamera = async (facingMode: any) => {
        await scanner.start(
          { facingMode },
          { fps: 15, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
          (decoded) => {
            stopScanner();
            onScan(extractId(decoded));
          },
          () => {}
        );
      };

      try {
        await startCamera({ ideal: "environment" });
      } catch {
        // Some Android phones reject "environment" — fall back to any camera
        await startCamera("user");
      }

      if (mountedRef.current) setScanning(true);

      const video = document.querySelector(`#${scannerIdRef.current} video`) as HTMLVideoElement;
      if (video) { video.setAttribute("playsinline", "true"); video.muted = true; }
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        toast.error("Camera permission denied. Please allow camera access.");
      } else if (msg.includes("NotFound")) {
        toast.error("No camera found on this device.");
      } else {
        toast.error("Could not start camera. Try again.");
      }
    } finally {
      if (mountedRef.current) setStarting(false);
    }
  };

  return (
    <div className={className}>
      {/* Scanner viewport — collapses to 0 when not scanning */}
      <div
        id={scannerIdRef.current}
        className={`w-full max-w-xs mx-auto rounded-2xl overflow-hidden bg-black transition-all duration-300 ${
          scanning ? "h-64 mb-3" : "h-0 overflow-hidden"
        }`}
      />

      {scanning && (
        <p className="text-center text-sm text-muted-foreground mb-3">
          Point at QR code or barcode on the bag
        </p>
      )}

      {!scanning ? (
        <Button onClick={startScanner} size="lg" className="w-full" disabled={starting}>
          {starting
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting…</>
            : <><Camera className="w-4 h-4 mr-2" />Scan with Camera</>
          }
        </Button>
      ) : (
        <Button onClick={stopScanner} size="lg" variant="outline" className="w-full">
          <StopCircle className="w-4 h-4 mr-2" />Stop Scanning
        </Button>
      )}
    </div>
  );
};

export default WebScanner;
