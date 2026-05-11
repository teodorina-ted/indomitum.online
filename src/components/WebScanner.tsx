import { useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface WebScannerProps {
  onScan: (result: string) => void;
  className?: string;
  autoStart?: boolean;
}

const isTouchDevice = () =>
  /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  navigator.maxTouchPoints > 1;

// Extract seed ID from passport URL if needed
const extractId = (raw: string): string => {
  if (raw.includes("/passport/")) return decodeURIComponent(raw.split("/passport/").pop() || raw);
  return raw.trim();
};

const WebScanner = ({ onScan, className = "" }: WebScannerProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const decodeWithBarcodeDetector = async (blob: Blob): Promise<string | null> => {
    // Native BarcodeDetector API - fastest, no battery drain, built into Chrome/Android
    if (!("BarcodeDetector" in window)) return null;
    try {
      const detector = new (window as any).BarcodeDetector({
        formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "data_matrix", "aztec", "pdf417"],
      });
      const bitmap = await createImageBitmap(blob);
      const results = await detector.detect(bitmap);
      bitmap.close();
      return results[0]?.rawValue || null;
    } catch {
      return null;
    }
  };

  const decodeWithHtml5Qrcode = async (file: File): Promise<string | null> => {
    try {
      const scanner = new Html5Qrcode("qr-hidden-el");
      const result = await scanner.scanFile(file, false);
      await scanner.clear().catch(() => {});
      return result || null;
    } catch {
      return null;
    }
  };

  const decodeFile = async (file: File) => {
    setIsDecoding(true);
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    try {
      // Try native BarcodeDetector first (Chrome/Android - instant)
      let result = await decodeWithBarcodeDetector(file);
      
      // Fallback to Html5Qrcode (iOS Safari, Firefox)
      if (!result) result = await decodeWithHtml5Qrcode(file);

      if (result) {
        onScan(extractId(result));
      } else {
        toast.error("No code detected. Try better lighting, hold steady, and make sure the code fills the frame.");
        setPreview(null);
        URL.revokeObjectURL(previewUrl);
      }
    } catch {
      toast.error("Failed to read code. Please try again.");
      setPreview(null);
    } finally {
      setIsDecoding(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) decodeFile(file);
  };

  // Desktop: return null — manual entry only
  if (!isTouchDevice()) return null;

  return (
    <div className={className}>
      <div id="qr-hidden-el" className="hidden" />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />

      {preview && (
        <div className="w-full max-w-xs mx-auto rounded-2xl overflow-hidden border border-border mb-3 relative">
          <img src={preview} alt="Captured" className="w-full object-cover max-h-48" />
          {isDecoding && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
        </div>
      )}

      <Button
        onClick={() => inputRef.current?.click()}
        size="lg"
        className="w-full"
        disabled={isDecoding}
      >
        <Camera className="w-4 h-4 mr-2" />
        {isDecoding ? "Reading Code..." : "Scan with Camera"}
      </Button>

      <p className="text-xs text-muted-foreground text-center mt-2">
        Take a clear photo of the QR code or barcode
      </p>
    </div>
  );
};

export default WebScanner;
