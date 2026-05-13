import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Send, FileText, Table, Code, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
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
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Per-item quantities — direct number input, no +/- buttons
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const getQty = (s: any) => quantities[s.seed_id || s.id] ?? s.quantity ?? 1;
  const setQty = (s: any, val: number) => {
    const clamped = Number.isFinite(val) && val >= 1 ? val : 1;
    setQuantities(q => ({ ...q, [s.seed_id || s.id]: clamped }));
  };

  const handleSend = async () => {
    if (seeds.length === 0) { toast.error("Your list is empty"); return; }
    setSending(true);
    try {
      const { error } = await api.createBuyerOrder({
        items: seeds.map(s => ({ seed_id: s.seed_id || s.id, quantity: getQty(s), name: s.name })),
        notes,
        delivery_address: address,
      });
      if (error) { toast.error(error); return; }
      setSent(true);
      toast.success("Order sent to collector!");
      onOrderSent?.();
    } catch {
      toast.error("Failed to send order");
    } finally {
      setSending(false);
    }
  };

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

  const handleClose = () => {
    setSent(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Send Order ({seeds.length} seeds)</DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h3 className="text-lg font-semibold">Order Sent!</h3>
            <p className="text-muted-foreground text-sm">
              The collector has been notified and will review your order.
            </p>
            <Button onClick={handleClose} className="w-full">Close</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Seeds with editable quantity — direct input, no +/- */}
            <div className="bg-muted/30 rounded-xl p-3 max-h-52 overflow-y-auto space-y-2">
              {seeds.map((s, i) => (
                <div key={i} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium flex-1 truncate">{s.name || s.seed_id}</span>
                  <Input
                    type="number"
                    min={1}
                    value={getQty(s)}
                    onChange={e => setQty(s, parseInt(e.target.value, 10))}
                    className="w-20 h-7 text-center font-mono text-sm px-2"
                  />
                </div>
              ))}
            </div>

            <Input
              placeholder="Delivery address (optional)"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
            <Textarea
              placeholder="Notes for the collector (optional)"
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />

            {/* Send button — live in v2.1 */}
            <Button className="w-full" onClick={handleSend} disabled={sending || seeds.length === 0}>
              {sending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" />Send to Collector</>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or export locally</span>
              </div>
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
        )}
      </DialogContent>
    </Dialog>
  );
};
