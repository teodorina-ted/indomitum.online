import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, History as HistoryIcon, Loader2, Leaf } from "lucide-react";

interface HistoryRow {
  id: string;
  seed_id: string | null;
  action: string;
  created_at: string;
  performed_by: string | null;
  changes: any;
}

const HistoryPage = () => {
  const { user, isLoading: authLoading, isCollector } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const [seedIdMap, setSeedIdMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!authLoading && user && !isCollector) navigate("/dashboard");
  }, [authLoading, user, isCollector, navigate]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setIsLoading(true);

      const { data, error } = await api.getSeedHistory("all");

      if (error) {
        console.error(error);
        toast.error("Failed to load history");
        setRows([]);
      } else {
        setRows(data || []);
      }

      setIsLoading(false);
    };

    if (user && isCollector) load();
  }, [user, isCollector, authLoading]);

  // Fetch profile names for performed_by
  useEffect(() => {
    const loadProfiles = async () => {
      const userIds = Array.from(
        new Set(rows.map((r) => r.performed_by).filter(Boolean) as string[])
      );
      if (userIds.length === 0) {
        setProfileMap({});
        return;
      }

      const { data, error } = await api.getProfilesByIds(userIds);

      if (error) {
        console.error(error);
        return;
      }

      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => {
        if (p.user_id) map[p.user_id] = p.full_name;
      });
      setProfileMap(map);
    };

    if (rows.length > 0) loadProfiles();
  }, [rows]);

  // Fetch seed_id (text) from seeds table
  useEffect(() => {
    const loadSeeds = async () => {
      const seedUuids = Array.from(
        new Set(rows.map((r) => r.seed_id).filter(Boolean) as string[])
      );
      if (seedUuids.length === 0) {
        setSeedIdMap({});
        return;
      }

      const { data, error } = await api.lookupSeedIds(seedUuids);

      if (error) {
        console.error(error);
        return;
      }

      // Invert the map (api returns seedId -> uuid, we need uuid -> seedId)
      const map: Record<string, string> = {};
      if (data) {
        Object.entries(data).forEach(([seedId, uuid]) => {
          map[uuid as string] = seedId;
        });
      }
      setSeedIdMap(map);
    };

    if (rows.length > 0) loadSeeds();
  }, [rows]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 lg:px-6 py-4">
        <div className="flex items-center gap-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" aria-label="Back to dashboard">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <HistoryIcon className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">History</h1>
              <p className="text-sm text-muted-foreground">Recent actions on seeds</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 lg:p-6">
        {rows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No history yet.</div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">When</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Action</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Seed ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Performed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground capitalize">{r.action}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground font-mono">
                        {r.seed_id ? seedIdMap[r.seed_id] || r.seed_id.slice(0, 8) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {r.performed_by
                          ? profileMap[r.performed_by] || r.performed_by.slice(0, 8)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default HistoryPage;
