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

  const handleSend = async () => {
    if (seeds.length === 0) { toast.error("Your list is empty"); return; }
    setSending(true);
    try {
      const { error } = await api.createBuyerOrder({
        items: seeds.map(s => ({ seed_id: s.seed_id || s.id, quantity: s.quantity || 1, name: s.name })),
        notes,
        delivery_address: address,
      });
      if (error) { toast.error(error); return; }
      setSent(true);
      toast.success("Order sent to collector!");
      onOrderSent?.();
    } catch { toast.error("Failed to send order"); }
    finally { setSending(false); }
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
      body: seeds.map(s => [s.seed_id || s.id, s.name || "—", s.quantity || 1]),
      theme: "striped",
      headStyles: { fillColor: [45, 80, 22] },
    });

    doc.save("indomitum-order.pdf");
    toast.success("PDF downloaded!");
  };

  const exportCSV = () => {
    const rows = [["Seed ID", "Name", "Quantity"], ...seeds.map(s => [s.seed_id || s.id, s.name || "", s.quantity || 1])];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "indomitum-order.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded!");
  };

  const exportJSON = () => {
    const data = { date: new Date().toISOString(), delivery_address: address, notes, items: seeds };
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

        {sent ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h3 className="text-lg font-semibold">Order Sent!</h3>
            <p className="text-muted-foreground text-sm">The collector has been notified and will review your order.</p>
            <Button onClick={() => { setSent(false); onOpenChange(false); }} className="w-full">Close</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Seeds summary */}
            <div className="bg-muted/30 rounded-xl p-3 max-h-32 overflow-y-auto space-y-1">
              {seeds.map((s, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="font-medium">{s.name || s.seed_id}</span>
                  <span className="text-muted-foreground">×{s.quantity || 1}</span>
                </div>
              ))}
            </div>

            <Input placeholder="Delivery address (optional)" value={address} onChange={e => setAddress(e.target.value)} />
            <Textarea placeholder="Notes for the collector (optional)" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />

            {/* Send button */}
            <Button className="w-full" onClick={handleSend} disabled={sending}>
              {sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : <><Send className="w-4 h-4 mr-2" /> Send to Collector</>}
            </Button>

            <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or export locally</span></div>
            </div>

            {/* Export buttons */}
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
