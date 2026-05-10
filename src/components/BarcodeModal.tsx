import { useRef, useEffect } from "react";
import { escHtml } from "@/lib/escapeHtml";
import JsBarcode from "jsbarcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer, Leaf } from "lucide-react";

interface BarcodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seedId: string;
  seedName: string;
  passportUrl: string;
}

// Helper to extract clean ID from potential HYPERLINK formula
const cleanSeedId = (rawId: string): string => {
  // Handle =HYPERLINK("url","text") format
  const hyperlinkMatch = rawId.match(/=HYPERLINK\s*\(\s*"[^"]*"\s*,\s*"([^"]*)"\s*\)/i);
  if (hyperlinkMatch) {
    return hyperlinkMatch[1];
  }
  // Handle =HYPERLINK("url") format
  const simpleMatch = rawId.match(/=HYPERLINK\s*\(\s*"([^"]*)"\s*\)/i);
  if (simpleMatch) {
    // Extract ID from URL if possible
    const urlParts = simpleMatch[1].split('/');
    return urlParts[urlParts.length - 1] || rawId;
  }
  return rawId;
};

const BarcodeModal = ({
  open,
  onOpenChange,
  seedId,
  seedName,
  passportUrl,
}: BarcodeModalProps) => {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clean the seed ID in case it contains a HYPERLINK formula
  const displayId = cleanSeedId(seedId);
  const displayName = cleanSeedId(seedName);

  useEffect(() => {
    if (open && barcodeRef.current && displayId) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        try {
          // Clear previous content
          if (barcodeRef.current) {
            barcodeRef.current.innerHTML = '';
          }
          
          // Calculate width based on barcode length (long IDs need thinner bars)
          const barcodeWidth =
            displayId.length > 24 ? 1.1 : displayId.length > 16 ? 1.4 : displayId.length > 10 ? 1.8 : 2.2;
          
          JsBarcode(barcodeRef.current, displayId, {
            format: "CODE128",
            width: barcodeWidth,
            height: displayId.length > 24 ? 46 : 56,
            displayValue: true,
            fontSize: 11,
            margin: 8,
            // Theme-safe colors (HSL tokens)
            background: "hsl(var(--card))",
            lineColor: "hsl(var(--card-foreground))",
            textMargin: 4,
          });
        } catch (error) {
          console.error("Barcode generation error:", error);
        }
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [open, displayId]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const svg = barcodeRef.current;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode - ${displayName}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, -apple-system, sans-serif;
              background: white;
            }
            .container {
              text-align: center;
              padding: 40px;
              border: 2px solid #e5e7eb;
              border-radius: 16px;
            }
            .logo {
              width: 48px;
              height: 48px;
              margin: 0 auto 16px;
              background: #22c55e;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            h1 {
              margin: 0 0 8px;
              font-size: 24px;
              color: #111827;
            }
            .id {
              font-family: monospace;
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 24px;
            }
            img {
              max-width: 300px;
              height: auto;
            }
            .scan-text {
              margin-top: 24px;
              font-size: 14px;
              color: #6b7280;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
            </div>
            <h1>${escHtml(displayName)}</h1>
            <div class="id">ID: ${escHtml(displayId)}</div>
            <img src="${svgUrl}" alt="Barcode" />
            <div class="scan-text">Scan to view Plant Passport</div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = () => {
    const svg = barcodeRef.current;
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const pngUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `barcode-${displayId}.png`;
      link.href = pngUrl;
      link.click();

      URL.revokeObjectURL(svgUrl);
    };
    img.src = svgUrl;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-primary" />
            Barcode
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-center">
            <h3 className="font-semibold text-foreground text-sm truncate">{displayName}</h3>
            <p className="text-xs text-muted-foreground font-mono truncate">{displayId}</p>
          </div>

          <div
            ref={containerRef}
            className="flex justify-center items-center p-3 bg-card rounded-lg border border-border min-h-[120px] overflow-hidden"
          >
            <svg
              ref={barcodeRef}
              className="w-full h-auto max-w-[280px]"
              preserveAspectRatio="xMidYMid meet"
            />
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Scan to view passport
          </p>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
            <Button size="sm" className="flex-1" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1" />
              Print
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeModal;
