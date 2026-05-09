import { useRef } from "react";
import { escHtml } from "@/lib/escapeHtml";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Leaf, QrCode } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SeedForQR {
  id: string;
  seed_id: string;
  name: string;
}

interface BulkQRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seeds: SeedForQR[];
  baseUrl: string;
}

const BulkQRCodeModal = ({
  open,
  onOpenChange,
  seeds,
  baseUrl,
}: BulkQRCodeModalProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handleBulkPrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const qrItems = seeds.map((seed) => {
      const passportUrl = `${baseUrl}/passport/${seed.seed_id}`;
      return `
        <div class="qr-item">
          <div class="logo">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
          </div>
          <h2>${escHtml(seed.name)}</h2>
          <div class="id">ID: ${escHtml(seed.seed_id)}</div>
          <svg id="qr-${seed.seed_id}" class="qr-code"></svg>
          <div class="scan-text">Scan to view Plant Passport</div>
        </div>
      `;
    }).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bulk QR Codes - Indomitum</title>
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              background: white;
              padding: 20px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
              gap: 20px;
            }
            .qr-item {
              text-align: center;
              padding: 20px;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              page-break-inside: avoid;
            }
            .logo {
              width: 36px;
              height: 36px;
              margin: 0 auto 12px;
              background: #22c55e;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            h2 {
              font-size: 16px;
              color: #111827;
              margin-bottom: 4px;
            }
            .id {
              font-family: monospace;
              font-size: 11px;
              color: #6b7280;
              margin-bottom: 12px;
            }
            .qr-code {
              width: 140px;
              height: 140px;
              margin: 0 auto;
              display: block;
            }
            .scan-text {
              margin-top: 12px;
              font-size: 11px;
              color: #6b7280;
            }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .grid { gap: 15px; }
              .qr-item { padding: 15px; }
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${qrItems}
          </div>
          <script>
            const seeds = ${JSON.stringify(seeds.map(s => ({ id: s.seed_id, url: `${baseUrl}/passport/${s.seed_id}` })))};
            seeds.forEach(seed => {
              const container = document.getElementById('qr-' + seed.id);
              if (container) {
                QRCode.toCanvas(container.parentElement.insertBefore(document.createElement('canvas'), container), seed.url, {
                  width: 140,
                  margin: 0,
                  errorCorrectionLevel: 'H'
                });
                container.remove();
              }
            });
            
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (seeds.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            Bulk QR Codes ({seeds.length} items)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Preview of QR codes for selected seeds. Click Print All to open a print-ready page.
          </p>

          <ScrollArea className="h-[300px] border rounded-lg p-4">
            <div ref={printRef} className="grid grid-cols-2 gap-4">
              {seeds.map((seed) => {
                const passportUrl = `${baseUrl}/passport/${seed.seed_id}`;
                return (
                  <div
                    key={seed.id}
                    className="flex flex-col items-center p-3 bg-white rounded-lg border border-border"
                  >
                    <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center mb-2">
                      <Leaf className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <p className="text-xs font-medium text-foreground text-center truncate w-full">
                      {seed.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-mono mb-2">
                      {seed.seed_id}
                    </p>
                    <QRCodeSVG
                      value={passportUrl}
                      size={80}
                      level="H"
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <Button className="w-full" onClick={handleBulkPrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print All QR Codes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkQRCodeModal;
