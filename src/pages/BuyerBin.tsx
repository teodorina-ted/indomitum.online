import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, RotateCcw, Leaf, Loader2, PackageX } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

const BuyerBin = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoading && !user) navigate("/login");
  }, [user, isLoading]);

  useEffect(() => {
    api.getBuyerBin().then(({ data }) => {
      setItems(data || []);
      setLoading(false);
    });
  }, []);

  const handleRestore = async (id: string) => {
    const { error } = await api.restoreFromBuyerBin(id);
    if (error) { toast.error(error); return; }
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success("Restored to My Seeds!");
  };

  const handleDelete = async (id: string) => {
    const { error } = await api.deleteFromBuyerBin(id);
    if (error) { toast.error(error); return; }
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success("Permanently deleted");
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/buyer")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Leaf className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold">Removed Seeds</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {items.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <PackageX className="w-16 h-16 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Your bin is empty</p>
            <Button variant="outline" onClick={() => navigate("/buyer")}>Back to My Seeds</Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Items removed from your collection. Restore or permanently delete.</p>
            {items.map(item => (
              <div key={item.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                {item.seed_data?.image_url && (
                  <img src={item.seed_data.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.seed_data?.name || "Unknown Plant"}</p>
                  <p className="text-xs text-muted-foreground">ID: {item.seed_data?.seed_id}</p>
                  <p className="text-xs text-muted-foreground">
                    Removed {new Date(item.deleted_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleRestore(item.id)}>
                    <RotateCcw className="w-3 h-3 mr-1" /> Restore
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => handleDelete(item.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default BuyerBin;
