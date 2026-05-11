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

const WebScanner = ({ onScan, className = "" }: WebScannerProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const decodeFile = async (file: File) => {
    setIsDecoding(true);
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);

    try {
      // Try multiple times with different settings for better detection
      const scanner = new Html5Qrcode("qr-decoder-hidden");
      
      let result: string | null = null;
      
      // First attempt - default
      try {
        result = await scanner.scanFile(file, false);
      } catch {
        // Second attempt - with verbose for better detection
        try {
          result = await scanner.scanFile(file, true);
        } catch {
          result = null;
        }
      }
      
      await scanner.clear().catch(() => {});

      if (result) {
        // Extract just the seed ID if it's a full URL
        let finalResult = result;
        if (result.includes("/passport/")) {
          finalResult = result.split("/passport/").pop() || result;
        }
        onScan(finalResult);
      } else {
        toast.error("No QR or barcode detected. Try better lighting or hold steady.");
        setPreview(null);
        URL.revokeObjectURL(previewUrl);
      }
    } catch {
      toast.error("Could not read code. Make sure QR/barcode fills the frame.");
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

  // On desktop - show nothing (manual entry only)
  if (!isTouchDevice()) return null;

  return (
    <div className={className}>
      <div id="qr-decoder-hidden" className="hidden" />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />

      {preview && (
        <div className="w-full max-w-xs mx-auto rounded-2xl overflow-hidden border border-border mb-4 relative">
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
        className="w-full max-w-xs mx-auto flex"
        disabled={isDecoding}
      >
        <Camera className="w-4 h-4 mr-2" />
        {isDecoding ? "Reading Code..." : "Scan with Camera"}
      </Button>

      <p className="text-xs text-muted-foreground text-center mt-2">
        Point camera at QR code or barcode on the bag
      </p>
    </div>
  );
};

export default WebScanner;
