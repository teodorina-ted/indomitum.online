import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Leaf,
  Search,
  Trash2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  User,
  Package,
  Menu,
  X,
  Home,
  Plus,
  History,
  Settings,
  LogOut,
  Loader2,
  AlertTriangle,
  ArrowLeft
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface DeletedSeed {
  id: string;
  original_id: string;
  seed_id: string;
  name: string;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  country: string | null;
  city: string | null;
  quantity: number;
  original_created_at: string;
  deleted_at: string;
  expires_at: string;
  deleted_by: string | null;
}

type SortField = "name" | "deleted_at" | "expires_at";
type SortDirection = "asc" | "desc";

const RecycleBin = () => {
  const { user, profile, signOut, isLoading: authLoading, isCollector } = useAuth();
  const navigate = useNavigate();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeeds, setSelectedSeeds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>("deleted_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [deletedSeeds, setDeletedSeeds] = useState<DeletedSeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchDeletedSeeds = async () => {
      if (!user) return;
      
      setIsLoading(true);
      const { data, error } = await api.getBin();
      
      if (error) {
        toast.error("Failed to load recycle bin");
        console.error(error);
      } else {
        setDeletedSeeds(data || []);
      }
      setIsLoading(false);
    };

    if (user) {
      fetchDeletedSeeds();
    }
  }, [user]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSeeds(deletedSeeds.map(s => s.id));
    } else {
      setSelectedSeeds([]);
    }
  };

  const handleSelectSeed = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedSeeds([...selectedSeeds, id]);
    } else {
      setSelectedSeeds(selectedSeeds.filter(s => s !== id));
    }
  };

  const handleRestore = async () => {
    if (selectedSeeds.length === 0 || !user) return;

    const seedsToRestore = deletedSeeds.filter(s => selectedSeeds.includes(s.id));
    
    const { error } = await api.restoreSeeds(selectedSeeds);

    if (error) {
      toast.error("Failed to restore seeds");
    } else {
      toast.success(`${selectedSeeds.length} seed(s) restored`, { duration: 2000 });
      setDeletedSeeds(deletedSeeds.filter(s => !selectedSeeds.includes(s.id)));
      setSelectedSeeds([]);
    }
  };

  const handlePermanentDelete = async () => {
    if (selectedSeeds.length === 0) return;

    const confirmed = window.confirm(
      `Permanently delete ${selectedSeeds.length} seed(s)? This cannot be undone.`
    );
    if (!confirmed) return;

    const { error } = await api.permanentDeleteSeeds(selectedSeeds);

    if (error) {
      toast.error("Failed to permanently delete seeds");
    } else {
      toast.success(`${selectedSeeds.length} seed(s) permanently deleted`, { duration: 2000 });
      setDeletedSeeds(deletedSeeds.filter(s => !selectedSeeds.includes(s.id)));
      setSelectedSeeds([]);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const filteredSeeds = deletedSeeds
    .filter(seed => 
      seed.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seed.seed_id.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "deleted_at") {
        comparison = new Date(a.deleted_at).getTime() - new Date(b.deleted_at).getTime();
      } else if (sortField === "expires_at") {
        comparison = new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  const getDaysUntilExpiry = (expiresAt: string) => {
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Leaf className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-foreground">Indomitum</span>
            </Link>
            <button 
              className="lg:hidden p-1 text-muted-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            <Link 
              to="/dashboard" 
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Home className="w-5 h-5" />
              Dashboard
            </Link>
            {isCollector && (
              <Link 
                to="/dashboard/add" 
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Plant
              </Link>
            )}
            <Link 
              to="/dashboard/bin" 
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-accent text-accent-foreground font-medium"
            >
              <RotateCcw className="w-5 h-5" />
              Recycle Bin
            </Link>
            <Link 
              to="/dashboard/history" 
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <History className="w-5 h-5" />
              History
            </Link>
            <Link 
              to="/dashboard/settings" 
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Settings className="w-5 h-5" />
              Settings
            </Link>
          </nav>

          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {profile?.full_name || user?.email}
                </div>
                <div className="text-xs text-muted-foreground capitalize">
                  {isCollector ? "Collector" : "Buyer"}
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-muted-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 lg:px-6 py-4">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden p-2 text-foreground"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" aria-label="Back to dashboard">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-foreground">Recycle Bin</h1>
              <p className="text-sm text-muted-foreground">Items are permanently deleted after 90 days</p>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-6">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search deleted items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              {isCollector && (
                <>
                  <Button 
                    variant="outline" 
                    size="default"
                    disabled={selectedSeeds.length === 0}
                    onClick={handleRestore}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restore
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="default"
                    disabled={selectedSeeds.length === 0}
                    onClick={handlePermanentDelete}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Forever
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="w-12 px-4 py-3 text-left">
                      <Checkbox 
                        checked={selectedSeeds.length === deletedSeeds.length && deletedSeeds.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">ID</th>
                    <th className="px-4 py-3 text-left">
                      <button 
                        onClick={() => handleSort("name")}
                        className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                      >
                        Name <SortIcon field="name" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button 
                        onClick={() => handleSort("deleted_at")}
                        className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                      >
                        Deleted <SortIcon field="deleted_at" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left">
                      <button 
                        onClick={() => handleSort("expires_at")}
                        className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                      >
                        Expires <SortIcon field="expires_at" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground hidden lg:table-cell">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSeeds.map((seed) => {
                    const daysLeft = getDaysUntilExpiry(seed.expires_at);
                    return (
                      <tr key={seed.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <Checkbox 
                            checked={selectedSeeds.includes(seed.id)}
                            onCheckedChange={(checked) => handleSelectSeed(seed.id, checked as boolean)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-mono text-muted-foreground">{seed.seed_id}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {seed.image_url ? (
                              <img 
                                src={seed.image_url} 
                                alt={seed.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                <Leaf className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <span className="font-medium text-foreground">{seed.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(seed.deleted_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {daysLeft <= 7 && (
                              <AlertTriangle className="w-4 h-4 text-destructive" />
                            )}
                            <span className={`text-sm ${daysLeft <= 7 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                              {daysLeft} days
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                          {seed.city && seed.country ? `${seed.city}, ${seed.country}` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {filteredSeeds.length === 0 && (
              <div className="py-12 text-center">
                <Trash2 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {deletedSeeds.length === 0 ? "Recycle bin is empty" : "No deleted items found"}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default RecycleBin;
