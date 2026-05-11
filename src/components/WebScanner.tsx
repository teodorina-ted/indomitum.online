import { useState, useEffect, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, StopCircle, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

interface WebScannerProps {
  onScan: (result: string) => void;
  className?: string;
  autoStart?: boolean;
}

const isMobile = () =>
  /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  navigator.maxTouchPoints > 1;

const extractId = (raw: string): string => {
  try {
    if (raw.includes("/passport/")) {
      return decodeURIComponent(raw.split("/passport/").pop()!.split("?")[0]);
    }
    if (raw.startsWith("http")) {
      const url = new URL(raw);
      const parts = url.pathname.split("/").filter(Boolean);
      return parts[parts.length - 1] || raw;
    }
  } catch {}
  return raw.trim();
};

const SCANNER_ID = "html5qr-scanner-region";

const WebScanner = ({ onScan, className = "" }: WebScannerProps) => {
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

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
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
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
      const scanner = new Html5Qrcode(SCANNER_ID, {
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

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
        (decodedText) => {
          stopScanner();
          onScan(extractId(decodedText));
        },
        () => {}
      );

      if (mountedRef.current) setScanning(true);
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

  const handleGalleryChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStarting(true);
    try {
      const scanner = new Html5Qrcode("__gallery_decoder__");
      const result = await scanner.scanFile(file, true);
      await scanner.clear().catch(() => {});
      if (result) onScan(extractId(result));
      else toast.error("No code found in image.");
    } catch {
      toast.error("Could not read code from image.");
    } finally {
      setStarting(false);
      if (galleryRef.current) galleryRef.current.value = "";
    }
  };

  if (!isMobile()) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      <div id="__gallery_decoder__" className="hidden" />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryChange} />

      {/* Video scanner container */}
      <div
        id={SCANNER_ID}
        className={`w-full max-w-xs mx-auto rounded-2xl overflow-hidden bg-black transition-all ${
          scanning ? "h-64" : "h-0"
        }`}
      />

      {!scanning ? (
        <div className="space-y-2">
          <Button onClick={startScanner} size="lg" className="w-full" disabled={starting}>
            {starting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting camera...</>
            ) : (
              <><Camera className="w-4 h-4 mr-2" /> Scan with Camera</>
            )}
          </Button>
          <Button onClick={() => galleryRef.current?.click()} size="lg" variant="outline" className="w-full" disabled={starting}>
            <Upload className="w-4 h-4 mr-2" /> Choose from Gallery
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-center text-sm text-muted-foreground">Point at QR code or barcode</p>
          <Button onClick={stopScanner} size="lg" variant="outline" className="w-full">
            <StopCircle className="w-4 h-4 mr-2" /> Stop Scanning
          </Button>
        </div>
      )}
    </div>
  );
};

export default WebScanner;
