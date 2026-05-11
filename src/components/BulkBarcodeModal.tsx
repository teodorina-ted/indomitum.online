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
import { Printer, Barcode } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SeedForBarcode {
  id: string;
  seed_id: string;
  name: string;
}

interface BulkBarcodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seeds: SeedForBarcode[];
  baseUrl: string;
}

const BarcodeItem = ({ seed }: { seed: SeedForBarcode }) => {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current) {
      JsBarcode(barcodeRef.current, seed.seed_id, {
        format: "CODE128",
        width: 1.2,
        height: 35,
        displayValue: true,
        fontSize: 8,
        margin: 2,
        background: "#ffffff",
        lineColor: "#000000",
      });
    }
  }, [seed.seed_id]);

  return (
    <div className="flex flex-col items-center p-2 bg-white rounded-lg border border-border">
      <p className="text-xs font-medium text-foreground text-center truncate w-full mb-1">
        {seed.name}
      </p>
      <svg ref={barcodeRef} className="max-w-full"></svg>
    </div>
  );
};

const BulkBarcodeModal = ({
  open,
  onOpenChange,
  seeds: seedsProp,
  baseUrl,
}: BulkBarcodeModalProps) => {
  const seeds = Array.isArray(seedsProp) ? seedsProp : [];
  const printRef = useRef<HTMLDivElement>(null);

  const handleBulkPrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const barcodeItems = seeds.map((seed) => {
      return `
        <div class="barcode-item">
          <div class="logo">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>
          </div>
          <h2>${escHtml(seed.name)}</h2>
          <div class="id">ID: ${escHtml(seed.seed_id)}</div>
          <svg id="barcode-${seed.seed_id}" class="barcode"></svg>
          <div class="scan-text">Scan to view Plant Passport</div>
        </div>
      `;
    }).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bulk Barcodes - Indomitum</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
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
              grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
              gap: 20px;
            }
            .barcode-item {
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
            .barcode {
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
              .barcode-item { padding: 15px; }
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${barcodeItems}
          </div>
          <script>
            const seeds = ${JSON.stringify(seeds.map(s => ({ id: s.seed_id })))};
            seeds.forEach(seed => {
              const svg = document.getElementById('barcode-' + seed.id);
              if (svg) {
                JsBarcode(svg, seed.id, {
                  format: "CODE128",
                  width: 2,
                  height: 60,
                  displayValue: true,
                  fontSize: 12,
                  margin: 5,
                  background: "#ffffff",
                  lineColor: "#000000"
                });
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

  if (!seeds.length) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Barcode className="w-5 h-5 text-primary" />
            Bulk Barcodes ({seeds.length} items)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {seeds.length} barcode(s) ready to print.
          </p>

          <ScrollArea className="h-[250px] border rounded-lg p-3">
            <div ref={printRef} className="grid grid-cols-2 gap-2">
              {seeds.map((seed) => (
                <BarcodeItem key={seed.id} seed={seed} />
              ))}
            </div>
          </ScrollArea>

          <Button className="w-full" onClick={handleBulkPrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print All
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkBarcodeModal;
