import { useState, useEffect } from "react";
import { escHtml } from "@/lib/escapeHtml";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Leaf, 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Package, 
  Loader2,
  QrCode,
  User,
  Printer,
  Heart,
  Plus,
  Check
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { PassportBarcode } from "@/components/passport/PassportBarcode";

interface SeedData {
  id: string;
  seed_id: string;
  name: string;
  image_url: string | null;
  country: string | null;
  city: string | null;
  street: string | null;
  zip_code: string | null;
  latitude: number | null;
  longitude: number | null;
  quantity: number;
  notes: string | null;
  created_at: string;
}

const SeedPassport = () => {
  const { seedId } = useParams<{ seedId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [seed, setSeed] = useState<SeedData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [barcodeSvg, setBarcodeSvg] = useState<string>("");

  const [isFavorite, setIsFavorite] = useState(false);
  const [inOrderList, setInOrderList] = useState(false);

  useEffect(() => {
    // Public page - no auth required
    const fetchSeed = async () => {
      if (!seedId) return;
      setIsLoading(true);
      // Try public endpoint first, fall back to authenticated
      const { data, error } = await api.getSeedBySeedId(seedId);
      if (error || !data) {
        setNotFound(true);
      } else {
        setSeed(data);
        // Check if in favorites/order list if logged in
        if (user) {
          const favorites = JSON.parse(localStorage.getItem("buyer_favorites") || "[]");
          setIsFavorite(favorites.includes(seedId));
          const orderList = JSON.parse(localStorage.getItem("buyer_order_list") || "[]");
          setInOrderList(orderList.some((s: any) => s.seed_id === seedId));
        }
      }
      setIsLoading(false);
    };
    fetchSeed();
  }, [seedId, user]);

  const handleToggleFavorite = () => {
    if (!user) { navigate(`/login?redirect=/passport/${seedId}`); return; }
    const favorites = JSON.parse(localStorage.getItem("buyer_favorites") || "[]");
    if (isFavorite) {
      localStorage.setItem("buyer_favorites", JSON.stringify(favorites.filter((id: string) => id !== seedId)));
      setIsFavorite(false);
      import("sonner").then(({ toast }) => toast.success("Removed from favorites"));
    } else {
      localStorage.setItem("buyer_favorites", JSON.stringify([...favorites, seedId]));
      setIsFavorite(true);
      import("sonner").then(({ toast }) => toast.success("Added to favorites ❤️"));
    }
  };

  const handleAddToList = () => {
    if (!user) { navigate(`/login?redirect=/passport/${seedId}`); return; }
    const orderList = JSON.parse(localStorage.getItem("buyer_order_list") || "[]");
    if (inOrderList) {
      localStorage.setItem("buyer_order_list", JSON.stringify(orderList.filter((s: any) => s.seed_id !== seedId)));
      setInOrderList(false);
      import("sonner").then(({ toast }) => toast.success("Removed from order list"));
    } else {
      localStorage.setItem("buyer_order_list", JSON.stringify([...orderList, { seed_id: seedId, name: seed?.name, quantity: 1 }]));
      setInOrderList(true);
      import("sonner").then(({ toast }) => toast.success("Added to order list ✅"));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <QrCode className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Seed Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The seed passport you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  if (!seed) return null;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const imageHtml = seed.image_url
      ? `<img src="${escHtml(seed.image_url)}" alt="${escHtml(seed.name)}" class="photo" />`
      : `<div class="photo placeholder">No photo</div>`;

    const locationText = [seed.street, seed.city, seed.zip_code, seed.country]
      .filter(Boolean)
      .map(s => escHtml(s))
      .join(", ") || "Not specified";

    const mapsUrl =
      seed.latitude != null && seed.longitude != null
        ? `https://www.google.com/maps?q=${seed.latitude},${seed.longitude}`
        : "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Plant Passport - ${escHtml(seed.seed_id)}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            *{box-sizing:border-box}
            body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:24px;background:#fff;color:#111}
            .wrap{max-width:720px;margin:0 auto}
            .header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
            .brand{font-weight:800;letter-spacing:.08em}
            .title{font-size:22px;font-weight:800;margin:0 0 6px}
            .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:12px;color:#444}
            .photo{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:16px;border:1px solid #e5e7eb;margin:12px 0 16px}
            .photo.placeholder{display:flex;align-items:center;justify-content:center;background:#f3f4f6;color:#6b7280}
            .card{border:1px solid #e5e7eb;border-radius:16px;padding:16px}
            .row{display:flex;gap:12px;flex-wrap:wrap}
            .item{flex:1 1 240px}
            .label{font-size:12px;color:#6b7280;margin-bottom:4px}
            .value{font-size:14px;color:#111}
            .barcode{display:flex;justify-content:center;margin:12px 0 0}
            a{color:#111;text-decoration:underline}
            @media print{
              body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
            }
          </style>
        </head>
        <body>
          <div class="wrap">
            <div class="header">
              <div class="brand">INDOMITUM</div>
              <div class="mono">Digital Plant Passport</div>
            </div>
            ${imageHtml}
            <h1 class="title">${escHtml(seed.name)}</h1>
            <div class="mono">${escHtml(seed.seed_id)}</div>
            <div class="barcode">${barcodeSvg || ""}</div>
            <div class="card" style="margin-top:16px">
              <div class="row">
                <div class="item">
                  <div class="label">Collected</div>
                  <div class="value">${new Date(seed.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</div>
                </div>
                <div class="item">
                  <div class="label">Quantity</div>
                  <div class="value">${seed.quantity} units</div>
                </div>
                <div class="item">
                  <div class="label">Origin</div>
                  <div class="value">${locationText}</div>
                </div>
                <div class="item">
                  <div class="label">Map</div>
                  <div class="value">${mapsUrl ? `<a href="${mapsUrl}" target="_blank" rel="noopener noreferrer">Open location</a>` : "—"}</div>
                </div>
              </div>
              ${seed.notes ? `<div style="margin-top:12px"><div class="label">Notes</div><div class="value">${escHtml(seed.notes)}</div></div>` : ""}
            </div>
            <script>
              window.onload = function(){ setTimeout(function(){ window.print(); }, 200); };
            </script>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 lg:px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Leaf className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">Plant Passport</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 lg:p-6">
        {/* Image */}
        {seed.image_url ? (
          <img
            src={seed.image_url}
            alt={seed.name}
            className="w-full aspect-video object-cover rounded-2xl mb-6"
          />
        ) : (
          <div className="w-full aspect-video bg-muted rounded-2xl flex items-center justify-center mb-6">
            <Leaf className="w-16 h-16 text-muted-foreground" />
          </div>
        )}

        {/* Details Card */}
        <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{seed.name}</h2>
            <p className="text-sm font-mono text-muted-foreground mt-1">{seed.seed_id}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3">
            <PassportBarcode
              value={seed.seed_id}
              className="w-full h-auto"
              onRendered={(svg) => {
                try {
                  setBarcodeSvg(new XMLSerializer().serializeToString(svg));
                } catch {
                  // ignore
                }
              }}
            />
            <div className="mt-3 flex gap-2">
              {/* Buyer action buttons */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={isFavorite ? "default" : "outline"}
              className={`flex-1 ${isFavorite ? "bg-red-500 hover:bg-red-600 border-red-500" : ""}`}
              onClick={handleToggleFavorite}
            >
              <Heart className={`w-4 h-4 mr-2 ${isFavorite ? "fill-white" : ""}`} />
              {isFavorite ? "Favorited" : "Favorite"}
            </Button>
            <Button
              variant={inOrderList ? "default" : "outline"}
              className="flex-1"
              onClick={handleAddToList}
            >
              {inOrderList ? <Check className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              {inOrderList ? "In List" : "Add to List"}
            </Button>
          </div>

          <Button variant="outline" className="flex-1" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Origin</div>
                <div className="text-sm text-muted-foreground">
                  {[seed.street, seed.city, seed.zip_code, seed.country].filter(Boolean).join(", ") || "Not specified"}
                </div>
                {seed.latitude && seed.longitude && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {seed.latitude.toFixed(4)}, {seed.longitude.toFixed(4)}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Collected</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(seed.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Quantity</div>
                <div className="text-sm text-muted-foreground">{seed.quantity} units</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Verified By</div>
                <div className="text-sm text-muted-foreground">Indomitum</div>
              </div>
            </div>
          </div>

          {seed.notes && (
            <div className="pt-4 border-t border-border">
              <div className="text-sm font-medium text-foreground mb-2">Notes</div>
              <p className="text-sm text-muted-foreground">{seed.notes}</p>
            </div>
          )}
        </div>

        {/* Branding */}
        <div className="mt-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Leaf className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium">Powered by Indomitum</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SeedPassport;
