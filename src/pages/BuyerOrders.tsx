import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Leaf, Loader2, ShoppingBag } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

const BuyerOrders = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) navigate("/login");
  }, [user, isLoading]);

  useEffect(() => {
    api.getBuyerOrders().then(({ data }) => {
      setOrders(data || []);
      setLoading(false);
    });
  }, []);

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
            <h1 className="text-lg font-semibold">Order History</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {orders.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No orders yet</p>
            <p className="text-sm text-muted-foreground">Build your seed list and send it to a collector</p>
            <Button onClick={() => navigate("/buyer")}>Back to My Seeds</Button>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">Order #{order.id?.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              {order.items?.length > 0 && (
                <div className="space-y-1">
                  {order.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm text-muted-foreground">
                      <span>{item.name || item.seed_id}</span>
                      <span>×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              )}

              {order.tracking_code && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-300">📦 Tracking</p>
                  <p className="text-blue-600 dark:text-blue-400">{order.tracking_code}</p>
                  {order.tracking_url && (
                    <a href={order.tracking_url} target="_blank" rel="noreferrer"
                      className="text-xs underline text-blue-500">Track package →</a>
                  )}
                </div>
              )}

              {order.delivery_address && (
                <p className="text-xs text-muted-foreground">📍 {order.delivery_address}</p>
              )}

              {order.notes && (
                <p className="text-xs text-muted-foreground italic">"{order.notes}"</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BuyerOrders;
