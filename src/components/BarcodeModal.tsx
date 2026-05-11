import { useRef, useEffect, useState } from "react";
import JsBarcode from "jsbarcode";
import { QRCodeCanvas } from "qrcode.react";
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

const BarcodeModal = ({
  open,
  onOpenChange,
  seedId,
  seedName,
  passportUrl,
}: BarcodeModalProps) => {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<"qr" | "barcode">("qr");

  useEffect(() => {
    if (open && mode === "barcode" && barcodeRef.current && seedId) {
      const timer = setTimeout(() => {
        try {
          if (barcodeRef.current) barcodeRef.current.innerHTML = "";
          const w = seedId.length > 24 ? 1.1 : seedId.length > 16 ? 1.4 : seedId.length > 10 ? 1.8 : 2.2;
          JsBarcode(barcodeRef.current, seedId, {
            format: "CODE128",
            width: w,
            height: 56,
            displayValue: true,
            fontSize: 11,
            margin: 8,
            background: "#ffffff",
            lineColor: "#1a1a1a",
            textMargin: 4,
          });
        } catch (err) {
          console.error("Barcode error:", err);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, mode, seedId]);

  const handleDownload = () => {
    if (mode === "qr") {
      const canvas = document.getElementById("seed-qr-canvas") as HTMLCanvasElement;
      if (canvas) {
        const link = document.createElement("a");
        link.download = `${seedId}-qr.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
      }
    } else if (barcodeRef.current) {
      const blob = new Blob([barcodeRef.current.outerHTML], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `${seedId}-barcode.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handlePrint = () => {
    const canvas = document.getElementById("seed-qr-canvas") as HTMLCanvasElement;
    const imgSrc = mode === "qr" && canvas ? canvas.toDataURL() : "";
    const barcodeSvg = mode === "barcode" && barcodeRef.current ? barcodeRef.current.outerHTML : "";

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(`<html><body style="text-align:center;font-family:sans-serif;padding:20px">
        <p style="font-size:16px"><strong>${seedName}</strong></p>
        <p style="font-size:13px;color:#666">ID: ${seedId}</p>
        ${imgSrc ? `<img src="${imgSrc}" style="width:200px;height:200px;margin:12px auto;display:block"/>` : ""}
        ${barcodeSvg}
        <p style="font-size:11px;color:#999;margin-top:8px">Scan to view plant passport</p>
      </body></html>`);
      w.document.close();
      w.print();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-primary" />
            {seedName}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground text-center">ID: {seedId}</p>

        {/* Mode toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setMode("qr")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === "qr" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            QR Code
          </button>
          <button
            onClick={() => setMode("barcode")}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === "barcode" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            Barcode
          </button>
        </div>

        {/* QR Code — links directly to passport */}
        {mode === "qr" && (
          <div className="flex flex-col items-center gap-2">
            <div className="bg-white p-3 rounded-xl border border-border">
              <QRCodeCanvas
                id="seed-qr-canvas"
                value={passportUrl}
                size={200}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Scan to open plant passport
            </p>
            <p className="text-xs text-primary/70 text-center break-all">{passportUrl}</p>
          </div>
        )}

        {/* Barcode — shows seed ID */}
        {mode === "barcode" && (
          <div className="flex flex-col items-center gap-2">
            <div className="bg-white p-3 rounded-xl border border-border w-full overflow-x-auto">
              <svg ref={barcodeRef} className="mx-auto" />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Bag ID: {seedId}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" /> Download
          </Button>
          <Button className="flex-1" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeModal;
