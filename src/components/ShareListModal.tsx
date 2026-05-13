import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Send, FileText, Table, Code, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api"; // v2.1: used for createBuyerOrder
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ShareListModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seeds: any[];
  onOrderSent?: () => void;
}

export const ShareListModal = ({ open, onOpenChange, seeds, onOrderSent }: ShareListModalProps) => {
  const [notes, setNotes] = useState("");
  const [address, setAddress] = useState("");
  const [sending, setSending] = useState(false); // v2.1
  const [sent, setSent] = useState(false);       // v2.1

  // Per-item quantities — buyer sets how many they want
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const getQty = (s: any) => quantities[s.seed_id || s.id] ?? 1;
  const setQty = (s: any, val: number) =>
    setQuantities(q => ({ ...q, [s.seed_id || s.id]: Math.max(1, val) }));

  // ── v2.1: uncomment to enable direct order sending ──────────────────────
  // const handleSend = async () => {
  //   if (seeds.length === 0) { toast.error("Your list is empty"); return; }
  //   setSending(true);
  //   try {
  //     const { error } = await api.createBuyerOrder({
  //       items: seeds.map(s => ({ seed_id: s.seed_id || s.id, quantity: getQty(s), name: s.name })),
  //       notes,
  //       delivery_address: address,
  //     });
  //     if (error) { toast.error(error); return; }
  //     setSent(true);
  //     toast.success("Order sent to collector!");
  //     onOrderSent?.();
  //   } catch { toast.error("Failed to send order"); }
  //   finally { setSending(false); }
  // };
  // ────────────────────────────────────────────────────────────────────────

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Indomitum — Seed Order", 14, 20);
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 30);
    if (address) doc.text(`Delivery: ${address}`, 14, 37);
    if (notes) doc.text(`Notes: ${notes}`, 14, 44);

    autoTable(doc, {
      startY: address || notes ? 52 : 38,
      head: [["Seed ID", "Name", "Qty"]],
      body: seeds.map(s => [s.seed_id || s.id, s.name || "—", getQty(s)]),
      theme: "striped",
      headStyles: { fillColor: [45, 80, 22] },
    });

    doc.save("indomitum-order.pdf");
    toast.success("PDF downloaded!");
  };

  const exportCSV = () => {
    const rows = [["Seed ID", "Name", "Quantity"], ...seeds.map(s => [s.seed_id || s.id, s.name || "", getQty(s)])];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "indomitum-order.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded!");
  };

  const exportJSON = () => {
    const data = { date: new Date().toISOString(), delivery_address: address, notes, items: seeds.map(s => ({ ...s, quantity: getQty(s) })) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "indomitum-order.json"; a.click();
    URL.revokeObjectURL(url);
    toast.success("JSON downloaded!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share List ({seeds.length} seeds)</DialogTitle>
        </DialogHeader>

        {/* v2.1: swap back to sent success screen when order sending is live
        {sent ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h3 className="text-lg font-semibold">Order Sent!</h3>
            <p className="text-muted-foreground text-sm">The collector has been notified and will review your order.</p>
            <Button onClick={() => { setSent(false); onOpenChange(false); }} className="w-full">Close</Button>
          </div>
        ) : ( */}
          <div className="space-y-4">
            {/* Seeds summary with editable quantities */}
            <div className="bg-muted/30 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
              {seeds.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium flex-1 truncate">{s.name || s.seed_id}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setQty(s, getQty(s) - 1)}
                      className="w-6 h-6 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center font-bold text-base leading-none"
                    >−</button>
                    <span className="w-6 text-center font-mono text-sm">{getQty(s)}</span>
                    <button
                      onClick={() => setQty(s, getQty(s) + 1)}
                      className="w-6 h-6 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center font-bold text-base leading-none"
                    >+</button>
                  </div>
                </div>
              ))}
            </div>

            <Input placeholder="Delivery address (optional)" value={address} onChange={e => setAddress(e.target.value)} />
            <Textarea placeholder="Notes for the collector (optional)" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />

            {/* v2.1: replace this banner with the Send button below when order flow is ready */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center space-y-1">
              <p className="text-sm font-semibold text-primary">🚀 Direct ordering — coming in v2.1</p>
              <p className="text-xs text-muted-foreground">
                Soon you'll send this list directly to your collector and track it to delivery.
                For now, export below and share it with them manually.
              </p>
            </div>

            {/* v2.1: uncomment Send button when handleSend is live
            <Button className="w-full" onClick={handleSend} disabled={sending}>
              {sending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                : <><Send className="w-4 h-4 mr-2" /> Send to Collector</>
              }
            </Button>
            */}

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">export locally</span></div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={exportPDF}>
                <FileText className="w-3 h-3 mr-1" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Table className="w-3 h-3 mr-1" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportJSON}>
                <Code className="w-3 h-3 mr-1" /> JSON
              </Button>
            </div>
          </div>
        {/* )} */}
      </DialogContent>
    </Dialog>
  );
};
