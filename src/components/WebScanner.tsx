import { useState, useRef, useEffect } from "react";
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
  const scanner = useRef<Html5Qrcode | null>(null);
  const id = useRef(`ws-${Math.random().toString(36).slice(2, 9)}`);
  const busy = useRef(false);

  useEffect(() => {
    return () => { stop(); };
  }, []);

  const stop = async () => {
    if (scanner.current) {
      try {
        if (scanner.current.isScanning) await scanner.current.stop();
        await scanner.current.clear();
      } catch {}
      scanner.current = null;
    }
    setState("idle");
    busy.current = false;
  };

  const start = async () => {
    if (busy.current) return;
    busy.current = true;
    setState("starting");

    try {
      await stop();

      scanner.current = new Html5Qrcode(id.current, {
        verbose: false,
        formatsToSupport: FORMATS,
      });

      const cfg = { fps: 15, qrbox: { width: 220, height: 220 }, aspectRatio: 1 };

      const success = (text: string) => {
        stop();
        onScan(text);
      };

      try {
        await scanner.current.start({ facingMode: { ideal: "environment" } }, cfg, success, () => {});
      } catch {
        await scanner.current.start({ facingMode: "user" }, cfg, success, () => {});
      }

      setState("scanning");
    } catch (err: any) {
      busy.current = false;
      setState("idle");
      const msg = err?.message || "";
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        toast.error("Camera permission denied. Allow it in browser settings.");
      } else if (msg.includes("NotFound")) {
        toast.error("No camera found on this device.");
      } else {
        toast.error("Could not start camera. Try again.");
        console.error("Scanner:", err);
      }
    }
  };

  return (
    <div className={className}>
      <div
        id={id.current}
        className="w-full aspect-square max-w-xs mx-auto rounded-2xl overflow-hidden bg-muted/30 border-2 border-dashed border-border relative"
      >
        {state === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center p-4 pointer-events-none">
            <Camera className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">Tap below to start camera</p>
          </div>
        )}
        {state === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center">
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
          <Button onClick={stop} variant="outline" size="lg">
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
