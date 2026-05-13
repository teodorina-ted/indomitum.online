import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Leaf, Loader2, ShoppingBag, Search, ArrowLeft, ChevronRight,
  Package, Truck, CheckCircle, Clock, FileText, MapPin, CreditCard,
  PackageCheck, Home, History, Settings, RotateCcw, Plus, RefreshCw,
  LogOut, User, Menu, X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import appBackground from "@/assets/app-background.jpg";

interface Order {
  id: string;
  status: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  buyer_address: string | null;
  delivery_method: string | null;
  notes: string | null;
  collector_notes: string | null;
  invoice_amount: number | null;
  created_at: string;
  updated_at: string;
  buyer_id: string | null;
}

interface OrderItem {
  id: string;
  order_id: string;
  seed_id: string;
  quantity: number;
  seeds?: { name: string; seed_id: string };
}

const STATUS_OPTIONS = [
  { value: "requested",    label: "Request Sent" },
  { value: "invoice_sent", label: "Invoice Sent" },
  { value: "confirmed",    label: "Confirmed" },
  { value: "preparing",    label: "Preparing" },
  { value: "shipped",      label: "Shipped" },
  { value: "ready_pickup", label: "Ready for Pickup" },
  { value: "delivered",    label: "Delivered" },
  { value: "completed",    label: "Completed" },
  { value: "cancelled",    label: "Cancelled" },
];

const CollectorOrders = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, isLoading: authLoading, isCollector } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
    if (!authLoading && !isCollector) navigate("/buyer");
  }, [user, authLoading, isCollector]);

  useEffect(() => {
    if (user && isCollector) fetchOrders();
  }, [user, isCollector]);

  const fetchOrders = async () => {
    setIsLoading(true);
    const { data, error } = await api.getCollectorOrders();
    if (error) toast.error("Failed to load orders");
    else setOrders(data || []);
    setIsLoading(false);
  };

  const openDetails = async (order: Order) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setTrackingCode("");
    setTrackingUrl("");
    const { data } = await api.getOrderItems(order.id);
    setOrderItems(data || []);
    setDetailsOpen(true);
  };

  const updateStatus = async () => {
    if (!selectedOrder || !newStatus) return;
    setUpdating(true);
    const { error } = await api.updateOrderStatus(
      selectedOrder.id, newStatus,
      trackingCode || undefined,
      undefined
    );
    if (error) { toast.error("Failed to update status"); }
    else {
      toast.success("Status updated!");
      setDetailsOpen(false);
      fetchOrders();
    }
    setUpdating(false);
  };

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const filteredOrders = orders.filter(o =>
    o.buyer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.buyer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const newOrdersCount = orders.filter(o => o.status === "requested").length;

  if (authLoading || isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background flex relative">
      <div className="fixed inset-0 z-0 pointer-events-none" style={{ backgroundImage: `url(${appBackground})`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.08 }} />

      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col border-r border-border bg-card/95 backdrop-blur-sm transition-all duration-300 relative z-10 ${sidebarCollapsed ? "w-16" : "w-64"}`}>
        <div className="p-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center"><Leaf className="w-5 h-5 text-primary-foreground" /></div>
            {!sidebarCollapsed && <span className="text-lg font-semibold text-foreground">Indomitum</span>}
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          <Link to="/dashboard" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${sidebarCollapsed ? "justify-center" : ""}`} title="Dashboard">
            <Home className="w-5 h-5 flex-shrink-0" />{!sidebarCollapsed && <span>Dashboard</span>}
          </Link>
          <Link to="/dashboard/add" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${sidebarCollapsed ? "justify-center" : ""}`} title="Add Plant">
            <Plus className="w-5 h-5 flex-shrink-0" />{!sidebarCollapsed && <span>Add Plant</span>}
          </Link>
          {/* Orders — active, with badge */}
          <Link to="/dashboard/orders" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg bg-accent text-accent-foreground font-medium ${sidebarCollapsed ? "justify-center" : ""}`} title="Orders">
            <div className="relative flex-shrink-0">
              <ShoppingBag className="w-5 h-5" />
              {newOrdersCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {newOrdersCount > 9 ? "9+" : newOrdersCount}
                </span>
              )}
            </div>
            {!sidebarCollapsed && <span>Orders {newOrdersCount > 0 && <span className="ml-1 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">{newOrdersCount}</span>}</span>}
          </Link>
          <Link to="/dashboard/bin" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${sidebarCollapsed ? "justify-center" : ""}`} title="Recycle Bin">
            <RotateCcw className="w-5 h-5 flex-shrink-0" />{!sidebarCollapsed && <span>Recycle Bin</span>}
          </Link>
          <Link to="/dashboard/history" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${sidebarCollapsed ? "justify-center" : ""}`} title="History">
            <History className="w-5 h-5 flex-shrink-0" />{!sidebarCollapsed && <span>History</span>}
          </Link>
          <Link to="/dashboard/tracking" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${sidebarCollapsed ? "justify-center" : ""}`} title="Tracking">
            <MapPin className="w-5 h-5 flex-shrink-0" />{!sidebarCollapsed && <span>Tracking</span>}
          </Link>
          <Link to="/dashboard/settings" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${sidebarCollapsed ? "justify-center" : ""}`} title="Settings">
            <Settings className="w-5 h-5 flex-shrink-0" />{!sidebarCollapsed && <span>Settings</span>}
          </Link>
        </nav>
        <div className="p-2 border-t border-border space-y-2">
          {!sidebarCollapsed && <ProfileSwitcher />}
          <div className={`flex items-center gap-3 px-2 py-2 ${sidebarCollapsed ? "justify-center" : ""}`}>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><User className="w-4 h-4 text-primary" /></div>
            {!sidebarCollapsed && <div className="flex-1 min-w-0"><div className="text-sm font-medium text-foreground truncate">{profile?.full_name || user?.email}</div><div className="text-xs text-muted-foreground">Collector</div></div>}
          </div>
          <Button variant="ghost" size="sm" className={`w-full text-muted-foreground ${sidebarCollapsed ? "justify-center px-0" : "justify-start"}`} onClick={handleSignOut} title="Sign out">
            <LogOut className="w-4 h-4 flex-shrink-0" />{!sidebarCollapsed && <span className="ml-2">Sign out</span>}
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button className="lg:hidden p-2 text-foreground" onClick={() => setSidebarOpen(true)}><Menu className="w-5 h-5" /></button>
              <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
                Orders
                {newOrdersCount > 0 && <span className="text-sm bg-red-500 text-white px-2 py-0.5 rounded-full font-normal">{newOrdersCount} new</span>}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={fetchOrders}><RefreshCw className="w-4 h-4" /></Button>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by buyer name, email, or order ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">{orders.length === 0 ? "No orders yet. Buyers will send orders from their dashboard." : "No orders match your search."}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map(order => (
                <div key={order.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => openDetails(order)}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground">#{order.id?.slice(0, 8)}</p>
                        {order.status === "requested" && <span className="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">New</span>}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{order.buyer_name} · {order.buyer_email}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          order.status === "requested" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
                          order.status === "completed" || order.status === "delivered" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          order.status === "cancelled" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}>{STATUS_OPTIONS.find(s => s.value === order.status)?.label || order.status}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Order Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.id?.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Buyer</span><p className="font-medium">{selectedOrder.buyer_name}</p></div>
                <div><span className="text-muted-foreground">Email</span><p className="font-medium truncate">{selectedOrder.buyer_email}</p></div>
                {selectedOrder.buyer_phone && <div><span className="text-muted-foreground">Phone</span><p className="font-medium">{selectedOrder.buyer_phone}</p></div>}
                {selectedOrder.buyer_address && <div className="col-span-2"><span className="text-muted-foreground">Address</span><p className="font-medium">{selectedOrder.buyer_address}</p></div>}
                {selectedOrder.notes && <div className="col-span-2"><span className="text-muted-foreground">Notes</span><p className="font-medium italic">"{selectedOrder.notes}"</p></div>}
              </div>

              {orderItems.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Items</p>
                  <div className="bg-muted/30 rounded-lg divide-y divide-border">
                    {orderItems.map((item, i) => (
                      <div key={i} className="flex justify-between px-3 py-2 text-sm">
                        <span>{item.seeds?.name || item.seeds?.seed_id || item.seed_id}</span>
                        <span className="text-muted-foreground">×{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-2 border-t border-border">
                <p className="text-sm font-medium">Update Status</p>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input placeholder="Tracking code (optional)" value={trackingCode} onChange={e => setTrackingCode(e.target.value)} />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setDetailsOpen(false)}>Cancel</Button>
                  <Button className="flex-1" onClick={updateStatus} disabled={updating}>
                    {updating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CollectorOrders;
