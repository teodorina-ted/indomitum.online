import { useState, useRef, useEffect, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, StopCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface WebScannerProps {
  onScan: (result: string) => void;
  className?: string;
}

const FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
];

const WebScanner = ({ onScan, className = "" }: WebScannerProps) => {
  const [state, setState] = useState<"idle" | "starting" | "scanning">("idle");
  const stateRef = useRef<"idle" | "starting" | "scanning">("idle");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(true);
  // Wrapper that React owns — scanner div lives INSIDE this, created imperatively
  const wrapperRef = useRef<HTMLDivElement>(null);
  const scannerDivId = useRef(`ws-${Math.random().toString(36).slice(2, 9)}`);

  const setS = (s: "idle" | "starting" | "scanning") => {
    stateRef.current = s;
    if (mountedRef.current) setState(s);
  };

  useEffect(() => {
    mountedRef.current = true;

    // Create the scanner div imperatively so React never touches it
    const div = document.createElement("div");
    div.id = scannerDivId.current;
    div.style.cssText = "width:100%;height:100%;";
    wrapperRef.current?.appendChild(div);

    return () => {
      mountedRef.current = false;
      const qr = scannerRef.current;
      scannerRef.current = null;
      if (qr) {
        try { if (qr.isScanning) qr.stop().catch(() => {}); } catch {}
        try { qr.clear().catch(() => {}); } catch {}
      }
      // Remove the imperatively created div safely
      try { div.parentNode?.removeChild(div); } catch {}
    };
  }, []);

  const stop = useCallback(async () => {
    const qr = scannerRef.current;
    scannerRef.current = null;
    if (qr) {
      try { if (qr.isScanning) await qr.stop(); } catch {}
      try { await qr.clear(); } catch {}
    }
    setS("idle");
  }, []);

  const start = useCallback(async () => {
    if (stateRef.current !== "idle") return;
    setS("starting");

    try {
      // Stop any previous instance
      const prev = scannerRef.current;
      scannerRef.current = null;
      if (prev) {
        try { if (prev.isScanning) await prev.stop(); } catch {}
        try { await prev.clear(); } catch {}
      }

      await new Promise(r => setTimeout(r, 120));
      if (!mountedRef.current) return;

      const qr = new Html5Qrcode(scannerDivId.current, {
        verbose: false,
        formatsToSupport: FORMATS,
      });
      scannerRef.current = qr;

      const cfg = { fps: 12, qrbox: { width: 200, height: 200 }, aspectRatio: 1 };

      const onSuccess = (text: string) => {
        stop().then(() => { if (mountedRef.current) onScan(text); });
      };

      try {
        await qr.start({ facingMode: { ideal: "environment" } }, cfg, onSuccess, () => {});
      } catch {
        if (!mountedRef.current) return;
        await qr.start({ facingMode: "user" }, cfg, onSuccess, () => {});
      }

      if (mountedRef.current) setS("scanning");
    } catch (err: any) {
      if (!mountedRef.current) return;
      setS("idle");
      const msg = err?.message || "";
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        toast.error("Camera permission denied. Allow it in browser settings.");
      } else if (msg.includes("NotFound")) {
        toast.error("No camera found on this device.");
      } else if (msg.includes("transition") || msg.includes("removeChild")) {
        // DOM conflict — silent reset
        console.warn("Scanner DOM conflict, reset.");
      } else {
        toast.error("Could not start camera. Try again.");
        console.error("Scanner:", err);
      }
    }
  }, [stop, onScan]);

  return (
    <div className={className}>
      {/* Wrapper React owns — scanner div inside is imperatively managed */}
      <div
        ref={wrapperRef}
        className="w-full aspect-square max-w-xs mx-auto rounded-2xl overflow-hidden bg-muted/30 border-2 border-dashed border-border relative"
      >
        {state === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center p-4 pointer-events-none">
            <Camera className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">Tap below to start camera</p>
          </div>
        )}
        {state === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex justify-center mt-4">
        {state !== "scanning" ? (
          <Button onClick={start} size="lg" disabled={state === "starting"}>
            {state === "starting"
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting...</>
              : <><Camera className="w-4 h-4 mr-2" />Scan with Camera</>
            }
          </Button>
        ) : (
          <Button onClick={stop} variant="destructive" size="lg">
            <StopCircle className="w-4 h-4 mr-2" />Stop
          </Button>
        )}
      </div>

      {state === "scanning" && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Point at a QR code or barcode
        </p>
      )}
    </div>
  );
};

export default WebScanner;
