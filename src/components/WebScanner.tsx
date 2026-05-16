import { useState, useRef, useCallback, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, StopCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface WebScannerProps {
  onScan: (result: string) => void;
  className?: string;
  autoStart?: boolean;
}

const WebScanner = ({ onScan, className = "", autoStart = false }: WebScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const containerIdRef = useRef(`scanner-${Math.random().toString(36).substr(2, 9)}`);

  // Auto-start on mount
  useEffect(() => {
    if (autoStart) {
      startScanner();
    }
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (!containerRef.current || isScanning) return;

    setIsStarting(true);

    try {
      // Clean up any existing scanner
      await stopScanner();

      // Create new scanner instance
      scannerRef.current = new Html5Qrcode(containerIdRef.current, {
        verbose: false,
      });

      const config = { fps: 15, qrbox: { width: 220, height: 220 }, aspectRatio: 1 };
      const onSuccess = (decodedText: string) => { stopScanner(); onScan(decodedText); };

      // Try back camera, fall back to front/any if rejected
      try {
        await scannerRef.current.start({ facingMode: { ideal: "environment" } }, config, onSuccess, () => {});
      } catch {
        await scannerRef.current.start({ facingMode: "user" }, config, onSuccess, () => {});
      }

      setIsScanning(true);

      // iOS Safari fix: ensure video has playsinline and muted
      const videoElement = containerRef.current?.querySelector("video");
      if (videoElement) {
        videoElement.setAttribute("playsinline", "true");
        videoElement.setAttribute("muted", "true");
        videoElement.playsInline = true;
        videoElement.muted = true;
      }
    } catch (error) {
      console.error("Scanner error:", error);
      if (error instanceof Error) {
        if (error.message.includes("Permission")) {
          toast.error("Camera permission denied. Please allow camera access.");
        } else {
          toast.error("Failed to start scanner. Try again.");
        }
      }
    } finally {
      setIsStarting(false);
    }
  }, [isScanning, onScan, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return (
    <div className={className}>
      {/* Scanner Container */}
      <div
        id={containerIdRef.current}
        ref={containerRef}
        className="w-full aspect-square max-w-xs mx-auto rounded-2xl overflow-hidden bg-muted/30 border-2 border-dashed border-border"
        style={{ minHeight: isScanning ? "250px" : "0" }}
      />

      {/* Controls */}
      <div className="flex justify-center mt-4">
        {!isScanning ? (
          <Button onClick={startScanner} size="lg" disabled={isStarting}>
            {isStarting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                Scan with Camera
              </>
            )}
          </Button>
        ) : (
          <Button onClick={stopScanner} variant="destructive" size="lg">
            <StopCircle className="w-4 h-4 mr-2" />
            Stop Scanner
          </Button>
        )}
      </div>

      {isScanning && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Point camera at QR code or barcode
        </p>
      )}
    </div>
  );
};

export default WebScanner;
