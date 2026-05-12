import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:   { label: "⏳ Pending",   className: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400" },
  approved:  { label: "✅ Approved",  className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400" },
  rejected:  { label: "❌ Rejected",  className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400" },
  shipped:   { label: "🚚 Shipped",   className: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400" },
  delivered: { label: "📦 Delivered", className: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400" },
};

export const OrderStatusBadge = ({ status }: { status: string }) => {
  const config = STATUS_CONFIG[status?.toLowerCase()] || { label: status, className: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={`text-xs font-medium ${config.className}`}>{config.label}</Badge>;
};
