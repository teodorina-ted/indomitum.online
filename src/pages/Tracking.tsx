import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  FileText,
  MapPin,
  Bell,
  Plus,
  Search,
  Loader2,
  ChevronRight,
  CreditCard,
  PackageCheck,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";
import { format } from "date-fns";

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
  invoice_details: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  buyer_id: string | null;
  collector_id: string | null;
}

interface OrderItem {
  id: string;
  order_id: string;
  seed_id: string;
  quantity: number;
  seeds?: {
    name: string;
    seed_id: string;
  };
}

const ORDER_STATUSES = [
  { value: "requested", label: "Request Sent", icon: ShoppingBag, color: "bg-yellow-500" },
  { value: "invoice_sent", label: "Invoice Sent", icon: FileText, color: "bg-blue-500" },
  { value: "confirmed", label: "Confirmed", icon: CreditCard, color: "bg-green-500" },
  { value: "preparing", label: "Preparing", icon: Package, color: "bg-purple-500" },
  { value: "shipped", label: "Shipped", icon: Truck, color: "bg-indigo-500" },
  { value: "ready_pickup", label: "Ready for Pickup", icon: MapPin, color: "bg-orange-500" },
  { value: "delivered", label: "Delivered", icon: CheckCircle, color: "bg-emerald-500" },
  { value: "completed", label: "Completed", icon: PackageCheck, color: "bg-teal-500" },
  { value: "cancelled", label: "Cancelled", icon: Clock, color: "bg-red-500" },
];

const Tracking = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isCollector, isBuyer } = useAuth();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [newOrderOpen, setNewOrderOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(true);

  // New order form state
  const [newOrder, setNewOrder] = useState({
    buyer_name: "",
    buyer_email: "",
    buyer_phone: "",
    buyer_address: "",
    delivery_method: "shipping" as "shipping" | "pickup",
    notes: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await api.getOrders();

      if (error) throw new Error(error);
      setOrders(data || []);
    } catch (error: any) {
      toast.error("Failed to load orders: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrderDetails = async (order: Order) => {
    try {
      // Fetch order items with seed details
      const { data: items } = await api.getOrderItems(order.id);
      setOrderItems(items || []);

      const { data: history } = await api.getOrderHistory(order.id);
      setStatusHistory(history || []);
      setSelectedOrder(order);
      setDetailsOpen(true);
    } catch (error: any) {
      toast.error("Failed to load order details");
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      setUpdating(true);
      
      const { error: updateError } = await api.updateOrderStatus(orderId, newStatus);

      if (updateError) throw new Error(updateError);

      toast.success("Order status updated!");
      fetchOrders();
      
      if (selectedOrder?.id === orderId) {
        fetchOrderDetails({ ...selectedOrder, status: newStatus });
      }
    } catch (error: any) {
      toast.error("Failed to update status: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const createOrder = async () => {
    if (!newOrder.buyer_name || !newOrder.buyer_email) {
      toast.error("Please fill in required fields");
      return;
    }

    try {
      setUpdating(true);
      const { error } = await api.createOrder({
        buyer_name: newOrder.buyer_name,
        buyer_email: newOrder.buyer_email,
        buyer_phone: newOrder.buyer_phone,
        buyer_address: newOrder.buyer_address,
        delivery_method: newOrder.delivery_method,
        notes: newOrder.notes,
      });

      if (error) throw new Error(error);

      toast.success("Order created successfully!");
      setNewOrderOpen(false);
      setNewOrder({
        buyer_name: "",
        buyer_email: "",
        buyer_phone: "",
        buyer_address: "",
        delivery_method: "shipping",
        notes: "",
      });
      fetchOrders();
    } catch (error: any) {
      toast.error("Failed to create order: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusInfo = (status: string) => {
    return ORDER_STATUSES.find(s => s.value === status) || ORDER_STATUSES[0];
  };

  const getCurrentStep = (status: string) => {
    return ORDER_STATUSES.findIndex(s => s.value === status);
  };

  const filteredOrders = orders.filter(order =>
    order.buyer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.buyer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    order.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Coming Soon Banner */}
      {showComingSoon && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-3">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium text-foreground">
                🚀 <span className="font-semibold">Coming Soon!</span> Order tracking is under active development. Stay tuned for updates.
              </p>
            </div>
            <button onClick={() => setShowComingSoon(false)} className="text-muted-foreground hover:text-foreground text-sm ml-4 shrink-0">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 lg:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={isCollector ? "/dashboard" : "/buyer"}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Package className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="text-lg font-semibold text-foreground">Order Tracking</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {isBuyer && (
            <Dialog open={newOrderOpen} onOpenChange={setNewOrderOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Order Request
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Order Request</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Name *</label>
                    <Input
                      value={newOrder.buyer_name}
                      onChange={(e) => setNewOrder({ ...newOrder, buyer_name: e.target.value })}
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email *</label>
                    <Input
                      type="email"
                      value={newOrder.buyer_email}
                      onChange={(e) => setNewOrder({ ...newOrder, buyer_email: e.target.value })}
                      placeholder="your@email.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={newOrder.buyer_phone}
                      onChange={(e) => setNewOrder({ ...newOrder, buyer_phone: e.target.value })}
                      placeholder="+1 234 567 890"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Delivery Method</label>
                    <Select
                      value={newOrder.delivery_method}
                      onValueChange={(v) => setNewOrder({ ...newOrder, delivery_method: v as "shipping" | "pickup" })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="shipping">Shipping</SelectItem>
                        <SelectItem value="pickup">Pickup</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {newOrder.delivery_method === "shipping" && (
                    <div>
                      <label className="text-sm font-medium">Delivery Address</label>
                      <Textarea
                        value={newOrder.buyer_address}
                        onChange={(e) => setNewOrder({ ...newOrder, buyer_address: e.target.value })}
                        placeholder="Full delivery address"
                        rows={3}
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <Textarea
                      value={newOrder.notes}
                      onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                      placeholder="Additional notes or special requests"
                      rows={2}
                    />
                  </div>
                  <Button onClick={createOrder} disabled={updating} className="w-full">
                    {updating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Submit Order Request
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No orders found</h3>
              <p className="text-muted-foreground">
                {isBuyer ? "Create a new order request to get started." : "Orders will appear here when buyers submit requests."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              const StatusIcon = statusInfo.icon;
              
              return (
                <Card key={order.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => fetchOrderDetails(order)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full ${statusInfo.color} flex items-center justify-center`}>
                          <StatusIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-medium">{order.buyer_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {order.buyer_email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                          <Badge variant="secondary">{statusInfo.label}</Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(order.created_at), "MMM d, yyyy")}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </div>
                    
                    {/* Mobile badge */}
                    <div className="mt-3 flex items-center justify-between sm:hidden">
                      <Badge variant="secondary">{statusInfo.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Status Timeline */}
              <div>
                <h3 className="font-medium mb-4">Order Progress</h3>
                <div className="flex items-center overflow-x-auto pb-2">
                  {ORDER_STATUSES.filter(s => s.value !== "cancelled").map((status, index) => {
                    const isActive = getCurrentStep(selectedOrder.status) >= index;
                    const isCurrent = selectedOrder.status === status.value;
                    const StatusIcon = status.icon;
                    
                    return (
                      <div key={status.value} className="flex items-center">
                        <div className="flex flex-col items-center min-w-[80px]">
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center transition-all
                            ${isCurrent ? status.color : isActive ? "bg-primary" : "bg-muted"}
                          `}>
                            <StatusIcon className={`w-4 h-4 ${isActive ? "text-white" : "text-muted-foreground"}`} />
                          </div>
                          <span className={`text-xs mt-1 text-center ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                            {status.label}
                          </span>
                        </div>
                        {index < ORDER_STATUSES.length - 2 && (
                          <div className={`h-0.5 w-8 ${isActive ? "bg-primary" : "bg-muted"}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Buyer Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><span className="text-muted-foreground">Name:</span> {selectedOrder.buyer_name}</div>
                    <div><span className="text-muted-foreground">Email:</span> {selectedOrder.buyer_email}</div>
                    {selectedOrder.buyer_phone && (
                      <div><span className="text-muted-foreground">Phone:</span> {selectedOrder.buyer_phone}</div>
                    )}
                    {selectedOrder.buyer_address && (
                      <div><span className="text-muted-foreground">Address:</span> {selectedOrder.buyer_address}</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Order Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div><span className="text-muted-foreground">Delivery:</span> {selectedOrder.delivery_method === "pickup" ? "Pickup" : "Shipping"}</div>
                    <div><span className="text-muted-foreground">Created:</span> {format(new Date(selectedOrder.created_at), "PPp")}</div>
                    {selectedOrder.invoice_amount && (
                      <div><span className="text-muted-foreground">Invoice:</span> ${selectedOrder.invoice_amount}</div>
                    )}
                    {selectedOrder.notes && (
                      <div><span className="text-muted-foreground">Notes:</span> {selectedOrder.notes}</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Order Items */}
              {orderItems.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {orderItems.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm">
                          <span>{item.seeds?.name || "Unknown Seed"}</span>
                          <Badge variant="outline">x{item.quantity}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Status History */}
              {statusHistory.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Status History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {statusHistory.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between text-sm">
                          <span>{getStatusInfo(entry.status).label}</span>
                          <span className="text-muted-foreground">
                            {format(new Date(entry.created_at), "PPp")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Collector Actions */}
              {isCollector && selectedOrder.status !== "completed" && selectedOrder.status !== "cancelled" && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Update Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={selectedOrder.status}
                      onValueChange={(value) => updateOrderStatus(selectedOrder.id, value)}
                      disabled={updating}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tracking;
