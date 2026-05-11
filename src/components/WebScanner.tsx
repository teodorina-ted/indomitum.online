import { useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface WebScannerProps {
  onScan: (result: string) => void;
  className?: string;
  autoStart?: boolean;
}

const WebScanner = ({ onScan, className = "" }: WebScannerProps) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const decodeFile = async (file: File) => {
    setIsDecoding(true);
    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    try {
      const scanner = new Html5Qrcode("qr-file-decoder");
      const result = await scanner.scanFile(file, false);
      await scanner.clear().catch(() => {});
      if (result) {
        onScan(result);
      }
    } catch {
      toast.error("No QR or barcode found. Make sure the code is clear and try again.");
      setPreview(null);
      URL.revokeObjectURL(previewUrl);
    } finally {
      setIsDecoding(false);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) decodeFile(file);
  };

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  return (
    <div className={className}>
      <div id="qr-file-decoder" className="hidden" />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChange} />
      <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />

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

      <div className="flex flex-col gap-3 max-w-xs mx-auto">
        {isMobile && (
          <Button onClick={() => cameraInputRef.current?.click()} size="lg" className="w-full" disabled={isDecoding}>
            <Camera className="w-4 h-4 mr-2" />
            {isDecoding ? "Reading Code..." : "Scan with Camera"}
          </Button>
        )}
        <Button onClick={() => galleryInputRef.current?.click()} size="lg" variant="outline" className="w-full" disabled={isDecoding}>
          <Upload className="w-4 h-4 mr-2" /> Upload from Gallery
        </Button>
      </div>
    </div>
  );
};

export default WebScanner;
