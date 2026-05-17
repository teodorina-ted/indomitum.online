import { useState, useEffect, useRef, useMemo } from "react";
import { escHtml } from "@/lib/escapeHtml";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { z } from "zod";
import {
  Leaf,
  QrCode,
  Search,
  Package,
  Calendar,
  User,
  Menu,
  X,
  Home,
  LogOut,
  Loader2,
  Camera,
  MapPin,
  ExternalLink,
  ScanLine,
  Plus,
  Send,
  ShoppingBag,
  Trash2,
  Download,
  Upload,
  Heart,
  FileText,
  Star,
  Settings,
  Printer,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import WebScanner from "@/components/WebScanner";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GuidedTour, TourStep } from "@/components/GuidedTour";
import { ShareListModal } from "@/components/ShareListModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import appBackground from "@/assets/app-background.jpg";

interface BuyerSeed {
  id: string;
  seed_id: string;
  quantity: number;
  assigned_at: string;
  seeds: {
    id: string;
    seed_id: string;
    name: string;
    image_url: string | null;
    country: string | null;
    city: string | null;
    street: string | null;
    zip_code: string | null;
    notes: string | null;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
    quantity: number;
  };
}

interface SeedPassport {
  id: string;
  seed_id: string;
  name: string;
  image_url: string | null;
  country: string | null;
  city: string | null;
  street: string | null;
  zip_code: string | null;
  notes: string | null;
  quantity: number;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

// Favorites stored locally
const FAVORITES_KEY = "indomitum_buyer_favorites";

const BuyerDashboard = () => {
  const { user, profile, signOut, isLoading: authLoading, isCollector } = useAuth();
  const navigate = useNavigate();
  const [scanInput, setScanInput] = useState("");  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"scan" | "seeds" | "favorites">("seeds");
  const [searchQuery, setSearchQuery] = useState("");
  const [buyerSeeds, setBuyerSeeds] = useState<BuyerSeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scanInput, setScanInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  const [passportOpen, setPassportOpen] = useState(false);
  const [currentPassport, setCurrentPassport] = useState<SeedPassport | null>(null);
  const [favorites, setFavorites] = useState<SeedPassport[]>([]);
  const [favoritesSortOption, setFavoritesSortOption] = useState<"name" | "date" | "quantity">("name");
  const [selectedSeeds, setSelectedSeeds] = useState<string[]>([]);
  const [selectedFavs, setSelectedFavs] = useState<string[]>([]);
  const [shareListOpen, setShareListOpen] = useState(false);

  const tourStorageKey = "indomitum_buyer_tour_completed";
  const [tourOpen, setTourOpen] = useState(false);

  type ImportPreview = {
    fileName: string;
    detectedColumns: string[];
    totalRows: number;
    rowsWithId: number;
    uniqueIds: number;
    willImport: number;
    alreadyInDashboard: number;
    missingInSystem: number;
    invalidRows: number;
    sampleIds: string[];
  };

  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [pendingImportRows, setPendingImportRows] = useState<any[] | null>(null);
  const [pendingSeedIdToUuid, setPendingSeedIdToUuid] = useState<Record<string, string>>({});
  const [pendingAssignedUuids, setPendingAssignedUuids] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    api.getFavorites().then(({ data }) => {
      if (data) setFavorites(data as SeedPassport[]);
    });
  }, [user]);

  useEffect(() => {
    try {
      const completed = localStorage.getItem(tourStorageKey) === "true";
      if (!completed) setTourOpen(true);
    } catch {}
  }, []);

  const isFavorite = (seedId: string) => favorites.some(f => f.seed_id === seedId);

  const toggleFavorite = async (seed: SeedPassport) => {
    if (isFavorite(seed.seed_id)) {
      setFavorites(prev => prev.filter(f => f.seed_id !== seed.seed_id));
      await api.removeFavorite(seed.seed_id);
      toast.success("Removed from favorites");
    } else {
      setFavorites(prev => [...prev, seed]);
      await api.addFavorite(seed.seed_id);
      toast.success("Added to favorites!");
    }
  };

  // Redirect collectors to full dashboard
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    } else if (!authLoading && isCollector) {
      navigate("/dashboard");
    }
  }, [user, authLoading, isCollector, navigate]);

  // Fetch buyer's seeds
  useEffect(() => {
    const fetchBuyerSeeds = async () => {
      if (!user) return;
      
      setIsLoading(true);
      const { data, error } = await api.getBuyerSeeds();
      
      if (error) {
        console.error(error);
        toast.error("Failed to load your seeds");
      } else {
        setBuyerSeeds(data || []);
      }
      setIsLoading(false);
    };

    if (user && !isCollector) {
      fetchBuyerSeeds();
    }
  }, [user, isCollector]);

  const lookupSeed = async (seedId: string) => {
    if (!seedId.trim()) {
      toast.error("Please enter a seed ID");
      return;
    }

    setIsScanning(true);

    const { data, error } = await api.getSeedBySeedId(seedId.trim());

    setIsScanning(false);

    if (error) {
      toast.error("Failed to look up product");
      return;
    }

    if (!data) {
      toast.error("Product not found. Check the ID and try again.");
      return;
    }

    toast.success("Product found!", { duration: 1000 });
    setCurrentPassport(data);
    setPassportOpen(true);
    setScanInput("");
  };

  const handleScanProduct = () => lookupSeed(scanInput);

  const handleWebScan = async (result: string) => {
    let seedId = result.trim();
    if (seedId.includes("/passport/")) seedId = decodeURIComponent(seedId.split("/passport/").pop()?.split("?")[0] || seedId);
    else if (seedId.startsWith("http")) { try { const p = new URL(seedId).pathname.split("/").filter(Boolean); seedId = p[p.length - 1] || seedId; } catch {} }
    await lookupSeed(seedId);
  };

  const handleAddToMyList = async (seed: SeedPassport) => {
    const already = buyerSeeds.some(bs => bs.seeds?.seed_id === seed.seed_id || bs.seed_id === seed.id);
    if (already) { toast.info("Already in your list!"); setPassportOpen(false); setActiveTab("seeds"); return; }
    const { error } = await api.assignBuyerSeed({ seed_id: seed.id, quantity: 1 });
    if (error) { toast.error("Failed to add: " + error); return; }
    toast.success("Added to My List! ✅");
    setPassportOpen(false);
    const { data } = await api.getBuyerSeeds();
    if (data) setBuyerSeeds(data);
    setActiveTab("seeds");
  };



  const handleExportList = () => {
    if (buyerSeeds.length === 0) { toast.error("No seeds to export"); return; }
    const rows = [["Seed ID", "Name", "City", "Country", "Quantity"]];
    buyerSeeds.forEach(bs => rows.push([bs.seeds?.seed_id || "", bs.seeds?.name || "", bs.seeds?.city || "", bs.seeds?.country || "", String(bs.quantity || 1)]));
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "my-seed-list.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported as CSV!");
  };

  const handleSelectSeed = (id: string, checked: boolean) => {
    if (checked) setSelectedSeeds(prev => [...prev, id]);
    else setSelectedSeeds(prev => prev.filter(s => s !== id));
  };

  const handleSelectAllSeeds = (checked: boolean) => {
    setSelectedSeeds(checked ? filteredSeeds.map(bs => bs.id) : []);
  };

  const handleSelectFav = (seedId: string, checked: boolean) => {
    if (checked) setSelectedFavs(prev => [...prev, seedId]);
    else setSelectedFavs(prev => prev.filter(s => s !== seedId));
  };

  const handleExportSelected = () => {
    const selected = buyerSeeds.filter(bs => selectedSeeds.includes(bs.id));
    if (!selected.length) { toast.error("Select seeds first"); return; }
    const rows = [["Seed ID", "Name", "City", "Country", "Quantity"]];
    selected.forEach(bs => rows.push([bs.seeds?.seed_id || "", bs.seeds?.name || "", bs.seeds?.city || "", bs.seeds?.country || "", String(bs.quantity || 1)]));
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "selected-seeds.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${selected.length} seeds!`);
    setSelectedSeeds([]);
  };

  const handleBulkAddFavsToList = async () => {
    if (!selectedFavs.length) { toast.error("Select favorites first"); return; }
    const toAdd = filteredFavorites.filter(f => selectedFavs.includes(f.seed_id));
    let added = 0;
    for (const seed of toAdd) {
      const already = buyerSeeds.some(bs => bs.seeds?.seed_id === seed.seed_id);
      if (!already) {
        const { error } = await api.assignBuyerSeed({ seed_id: seed.id, quantity: 1 });
        if (!error) added++;
      }
    }
    if (added > 0) {
      toast.success(`Added ${added} seeds to My List!`);
      const { data } = await api.getBuyerSeeds();
      if (data) setBuyerSeeds(data);
    } else {
      toast.info("All selected seeds already in your list");
    }
    setSelectedFavs([]);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const openInMaps = (lat: number | null, lng: number | null) => {
    if (lat == null || lng == null) return;
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, "_blank");
  };

  // Download passport as PDF
  const downloadPassportPDF = (passport: SeedPassport) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(34, 139, 34);
    doc.rect(0, 0, pageWidth, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("INDOMITUM", pageWidth / 2, 15, { align: "center" });
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Digital Plant Passport", pageWidth / 2, 23, { align: "center" });
    doc.setFontSize(9);
    doc.text(`ID: ${passport.seed_id}`, pageWidth / 2, 30, { align: "center" });
    
    doc.setTextColor(0, 0, 0);
    
    // Plant name
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(passport.name, pageWidth / 2, 50, { align: "center" });
    
    // Details table
    const details = [
      ["Seed ID", passport.seed_id],
      ["Quantity", String(passport.quantity)],
      ["Collection Date", new Date(passport.created_at).toLocaleDateString()],
      ["Street", passport.street || "—"],
      ["City", passport.city || "—"],
      ["ZIP Code", passport.zip_code || "—"],
      ["Country", passport.country || "—"],
      ["Coordinates", passport.latitude && passport.longitude ? `${passport.latitude}, ${passport.longitude}` : "—"],
    ];
    
    autoTable(doc, {
      body: details,
      startY: 60,
      theme: "plain",
      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
      columnStyles: {
        0: { fontStyle: "bold", textColor: [100, 100, 100], cellWidth: 40 },
        1: { textColor: [0, 0, 0] },
      },
      margin: { left: 30, right: 30 },
    });
    
    // Notes section
    if (passport.notes) {
      const finalY = (doc as any).lastAutoTable.finalY || 130;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text("Notes:", 30, finalY + 10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const notesLines = doc.splitTextToSize(passport.notes, pageWidth - 60);
      doc.text(notesLines, 30, finalY + 18);
    }
    
    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("Verified by Indomitum • Digital Plant Passport", pageWidth / 2, pageHeight - 10, { align: "center" });
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 5, { align: "center" });
    
    doc.save(`plant-passport-${passport.seed_id}.pdf`);
    toast.success("Passport downloaded!");
  };

  // Import file handling
  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const seedIdSchema = z.string().trim().min(1).max(120);

  const getSeedIdFromRow = (row: any): string | null => {
    const seedIdRaw =
      row?.ID ??
      row?.seed_id ??
      row?.id ??
      row?.artifact_id ??
      row?.batch_no ??
      row?.["Seed ID"] ??
      row?.["seed id"];

    const parsed = seedIdSchema.safeParse(seedIdRaw);
    if (!parsed.success) return null;

    const seedId = String(parsed.data).trim();
    return seedId.length ? seedId : null;
  };

  const parseImportFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    let importedData: any[] = [];
    let detectedColumns: string[] = [];

    if (ext === "json") {
      const text = await file.text();
      const json = JSON.parse(text);
      importedData = Array.isArray(json) ? json : [json];
    } else if (ext === "csv") {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim().length > 0);
      if (lines.length === 0) {
        return { importedData: [], detectedColumns: [] };
      }

      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().replace(/"/g, ""));
      detectedColumns = headers;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i]
          .split(",")
          .map((v) => v.trim().replace(/"/g, ""));
        const row: Record<string, any> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx];
        });
        importedData.push(row);
      }
    } else if (ext === "xlsx" || ext === "xls") {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      importedData = XLSX.utils.sheet_to_json(worksheet);
    } else {
      toast.error("Unsupported file format. Use CSV, JSON, or XLSX.");
      return { importedData: [], detectedColumns: [] };
    }

    if (!detectedColumns.length && importedData.length) {
      detectedColumns = Object.keys(importedData[0] ?? {});
    }

    return { importedData, detectedColumns };
  };

  const cancelImportPreview = () => {
    setImportPreviewOpen(false);
    setImportPreview(null);
    setPendingImportRows(null);
    setPendingSeedIdToUuid({});
    setPendingAssignedUuids(new Set());
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const confirmImport = async () => {
    if (!user || !pendingImportRows || !importPreview) return;

    try {
      let imported = 0;
      let skipped = 0;
      let missingInSystem = 0;

      for (const row of pendingImportRows) {
        const seedId = getSeedIdFromRow(row);
        if (!seedId) {
          skipped++;
          continue;
        }

        const seedUuid = pendingSeedIdToUuid[seedId];
        if (!seedUuid) {
          missingInSystem++;
          continue;
        }

        if (pendingAssignedUuids.has(seedUuid)) {
          skipped++;
          continue;
        }

        const qty = Number(row.Quantity || row.quantity || row.qty_sent || 1);
        const { error: assignError } = await api.assignBuyerSeed({
          seed_id: seedUuid,
          quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
          notes: row.Notes || row.notes || null,
        });

        if (assignError) {
          console.error(assignError);
          skipped++;
        } else {
          imported++;
          pendingAssignedUuids.add(seedUuid);
        }
      }

      if (imported > 0) {
        toast.success(
          `Imported ${imported} seed(s) to your dashboard.` +
            (skipped > 0 ? ` ${skipped} skipped (already added/invalid).` : "") +
            (missingInSystem > 0
              ? ` ${missingInSystem} not found in the system (ask a collector to add them).`
              : "")
        );

        const { data } = await api.getBuyerSeeds();
        if (data) setBuyerSeeds(data);
        setActiveTab("seeds");
      } else {
        toast.info("No new seeds to import.");
      }

      cancelImportPreview();
    } catch (err) {
      console.error(err);
      toast.error("Failed to import file");
    }
  };

  const processImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      const { importedData, detectedColumns } = await parseImportFile(file);

      if (importedData.length === 0) {
        toast.error("No data found in file");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // Build preview stats
      const seedIds: string[] = [];
      let rowsWithId = 0;
      let invalidRows = 0;

      for (const row of importedData) {
        const seedId = getSeedIdFromRow(row);
        if (seedId) {
          rowsWithId++;
          seedIds.push(seedId);
        } else {
          invalidRows++;
        }
      }

      const uniqueSeedIds = Array.from(new Set(seedIds));
      const sampleIds = uniqueSeedIds.slice(0, 6);

      // Fetch which IDs exist in system (batch)
      const { data: seedIdMap, error: lookupError } = await api.lookupSeedIds(uniqueSeedIds.slice(0, 1000));

      if (lookupError) {
        console.error(lookupError);
        toast.error("Could not check seeds in system");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const seedIdToUuid: Record<string, string> = seedIdMap || {};

      // Which are already in the buyer dashboard
      const { data: assignedUuids, error: assignedError } = await api.getAssignedSeedUuids();

      if (assignedError) {
        console.error(assignedError);
        toast.error("Could not check your existing dashboard seeds");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const assignedSet = new Set<string>(assignedUuids || []);

      const existingCount = Object.keys(seedIdToUuid).length;
      const alreadyInDashboard = assignedSet.size;
      const missingInSystem = Math.max(0, uniqueSeedIds.length - existingCount);
      const willImport = Math.max(0, existingCount - alreadyInDashboard);

      setPendingImportRows(importedData);
      setPendingSeedIdToUuid(seedIdToUuid);
      setPendingAssignedUuids(assignedSet);

      setImportPreview({
        fileName: file.name,
        detectedColumns,
        totalRows: importedData.length,
        rowsWithId,
        uniqueIds: uniqueSeedIds.length,
        willImport,
        alreadyInDashboard,
        missingInSystem,
        invalidRows,
        sampleIds,
      });

      setImportPreviewOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to read file");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredSeeds = buyerSeeds.filter(bs => 
    bs.seeds?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bs.seeds?.seed_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort favorites based on option
  const sortedFavorites = useMemo(() => {
    const sorted = [...favorites];
    if (favoritesSortOption === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (favoritesSortOption === "date") {
      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (favoritesSortOption === "quantity") {
      sorted.sort((a, b) => b.quantity - a.quantity);
    }
    return sorted;
  }, [favorites, favoritesSortOption]);

  const filteredFavorites = sortedFavorites.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.seed_id.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Print passport function
  const printPassport = (passport: SeedPassport) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow pop-ups to print");
      return;
    }

    const mapsUrl = passport.latitude && passport.longitude 
      ? `https://www.google.com/maps?q=${passport.latitude},${passport.longitude}` 
      : null;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Plant Passport - ${escHtml(passport.name)}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: system-ui, -apple-system, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
              background: white;
              color: #111;
            }
            .header {
              background: #22c55e;
              color: white;
              padding: 20px;
              border-radius: 12px;
              text-align: center;
              margin-bottom: 24px;
            }
            .header h1 { font-size: 24px; margin-bottom: 4px; }
            .header p { font-size: 14px; opacity: 0.9; }
            .content { display: grid; gap: 20px; }
            .image-container { text-align: center; }
            .image-container img { 
              max-width: 300px; 
              max-height: 200px; 
              object-fit: cover; 
              border-radius: 8px; 
              border: 1px solid #e5e7eb;
            }
            .details { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 16px;
            }
            .detail { padding: 12px; background: #f9fafb; border-radius: 8px; }
            .detail-label { font-size: 11px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px; }
            .detail-value { font-size: 14px; font-weight: 500; }
            .notes { 
              padding: 16px; 
              background: #f9fafb; 
              border-radius: 8px;
            }
            .notes-label { font-size: 11px; color: #6b7280; text-transform: uppercase; margin-bottom: 8px; }
            .notes-value { font-size: 14px; line-height: 1.5; }
            .footer {
              margin-top: 24px;
              padding-top: 16px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
              font-size: 12px;
              color: #6b7280;
            }
            a { color: #22c55e; }
            @media print {
              body { padding: 20px; }
              .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>INDOMITUM</h1>
            <p>Digital Plant Passport</p>
          </div>
          
          <div class="content">
            <h2 style="font-size: 20px; text-align: center;">${escHtml(passport.name)}</h2>
            
            ${passport.image_url ? `
              <div class="image-container">
                <img src="${escHtml(passport.image_url)}" alt="${escHtml(passport.name)}" />
              </div>
            ` : ''}
            
            <div class="details">
              <div class="detail">
                <div class="detail-label">Seed ID</div>
                <div class="detail-value" style="font-family: monospace;">${escHtml(passport.seed_id)}</div>
              </div>
              <div class="detail">
                <div class="detail-label">Collection Date</div>
                <div class="detail-value">${new Date(passport.created_at).toLocaleDateString()}</div>
              </div>
              <div class="detail">
                <div class="detail-label">Quantity</div>
                <div class="detail-value">${passport.quantity}</div>
              </div>
              <div class="detail">
                <div class="detail-label">Origin</div>
                <div class="detail-value">${[passport.city, passport.country].filter(Boolean).map(s => escHtml(s)).join(", ") || "Not specified"}</div>
              </div>
              ${passport.street ? `
                <div class="detail">
                  <div class="detail-label">Street</div>
                  <div class="detail-value">${escHtml(passport.street)}</div>
                </div>
              ` : ''}
              ${passport.zip_code ? `
                <div class="detail">
                  <div class="detail-label">ZIP Code</div>
                  <div class="detail-value">${escHtml(passport.zip_code)}</div>
                </div>
              ` : ''}
              ${mapsUrl ? `
                <div class="detail" style="grid-column: span 2;">
                  <div class="detail-label">Coordinates</div>
                  <div class="detail-value">
                    <a href="${mapsUrl}" target="_blank">${passport.latitude}, ${passport.longitude}</a>
                  </div>
                </div>
              ` : ''}
            </div>
            
            ${passport.notes ? `
              <div class="notes">
                <div class="notes-label">Notes</div>
                <div class="notes-value">${escHtml(passport.notes)}</div>
              </div>
            ` : ''}
          </div>
          
          <div class="footer">
            Verified by Indomitum • Digital Plant Passport<br/>
            Generated: ${new Date().toLocaleString()}
          </div>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 z-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `url(${appBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

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
            <button 
              data-tour="buyer-seeds"
              onClick={() => { setActiveTab("seeds"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                activeTab === "seeds" 
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Home className="w-5 h-5" />
              My Seeds
            </button>
            <button 
              data-tour="buyer-favorites"
              onClick={() => { setActiveTab("favorites"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                activeTab === "favorites" 
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Star className="w-5 h-5" />
              Favorites
              {favorites.length > 0 && (
                <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {favorites.length}
                </span>
              )}
            </button>
            <button 
              data-tour="buyer-scan"
              onClick={() => { setActiveTab("scan"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                activeTab === "scan" 
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <QrCode className="w-5 h-5" />
              Scan Product
            </button>
            <Link
              to="/buyer/tracking"
              onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <MapPin className="w-5 h-5" />
              Tracking
              <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded-full">v2.1</span>
            </Link>
            <Link
              to="/buyer/orders"
              onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ShoppingBag className="w-5 h-5" />
              Order History
              <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded-full">v2.1</span>
            </Link>
            <Link
              to="/buyer/bin"
              onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              Removed Seeds
            </Link>
            <Link
              to="/buyer/settings"
              onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Settings className="w-5 h-5" />
              Settings
            </Link>
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              onClick={() => { 
                localStorage.removeItem('indomitum_tour_completed');
                localStorage.removeItem('indomitum_buyer_tour_completed');
                toast.success("Tour restarted");
                setTourOpen(true);
                setSidebarOpen(false); 
              }}
            >
              <RefreshCw className="w-5 h-5" />
              Restart Tour
            </button>
          </nav>

          <div className="p-4 border-t border-border space-y-3">
            {/* Profile Switcher */}
            <ProfileSwitcher />
            
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {profile?.full_name || user?.email}
                </div>
                <div className="text-xs text-muted-foreground">Buyer</div>
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
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button 
                className="lg:hidden p-2 text-foreground"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-xl lg:text-2xl font-bold text-foreground">
                {activeTab === "scan" ? "Scan Product" : activeTab === "favorites" ? "Favorites" : "My Seeds"}
              </h1>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-6">
          {/* Scan Tab */}
          {activeTab === "scan" && (
            <div className="max-w-md mx-auto animate-fade-in space-y-5">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-foreground mb-1">Scan Your Product</h2>
                <p className="text-sm text-muted-foreground">Point at a QR code or barcode on the seed bag</p>
              </div>
              <WebScanner onScan={handleWebScan} />
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center"><span className="bg-background px-4 text-sm text-muted-foreground">or enter ID manually</span></div>
              </div>
              <div className="space-y-3">
                <Input
                  placeholder="e.g., SEED-ABC123"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScanProduct()}
                  className="text-center font-mono"
                />
                <Button onClick={handleScanProduct} size="lg" className="w-full" disabled={isScanning || !scanInput.trim()}>
                  {isScanning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Looking up...</> : <><Search className="w-4 h-4 mr-2" />View Passport</>}
                </Button>
              </div>
            </div>
          )}

          {/* My Seeds Tab */}
          {activeTab === "seeds" && (
            <div className="animate-fade-in">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">{buyerSeeds.length}</div>
                      <div className="text-sm text-muted-foreground">My Seeds</div>
                    </div>
                  </div>
                </div>
                <div className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <Leaf className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-foreground">
                        {buyerSeeds.reduce((acc, bs) => acc + (bs.quantity || 0), 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Qty</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search & Import */}
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search your seeds..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json,.xlsx,.xls"
                    className="hidden"
                    onChange={processImportFile}
                  />
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90" size="default" onClick={() => setActiveTab("scan")}>
                    <Camera className="w-4 h-4 mr-2" />
                    Scan
                  </Button>
                  <Button variant="secondary" size="icon" onClick={handleImport} title="Import seeds from CSV/JSON">
                    <Upload className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleExportList} title="Export list as CSV">
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button variant="default" size="default" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setShareListOpen(true)}>
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </Button>
                </div>
              </div>

              {/* Import Preview */}
              <Dialog open={importPreviewOpen} onOpenChange={(open) => (open ? setImportPreviewOpen(true) : cancelImportPreview())}>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Import preview</DialogTitle>
                  </DialogHeader>

                  {importPreview ? (
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        File: <span className="text-foreground font-medium">{importPreview.fileName}</span>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium text-foreground">Detected columns</div>
                        <div className="flex flex-wrap gap-2">
                          {importPreview.detectedColumns.slice(0, 12).map((col) => (
                            <Badge key={col} variant="secondary">{col}</Badge>
                          ))}
                          {importPreview.detectedColumns.length > 12 && (
                            <Badge variant="outline">+{importPreview.detectedColumns.length - 12} more</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          We look for an ID column like <span className="font-mono">ID</span> or <span className="font-mono">seed_id</span>.
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg border border-border bg-muted/30 p-3">
                          <div className="text-xs text-muted-foreground">Rows in file</div>
                          <div className="text-lg font-semibold text-foreground">{importPreview.totalRows}</div>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/30 p-3">
                          <div className="text-xs text-muted-foreground">Rows with ID</div>
                          <div className="text-lg font-semibold text-foreground">{importPreview.rowsWithId}</div>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/30 p-3">
                          <div className="text-xs text-muted-foreground">Will import</div>
                          <div className="text-lg font-semibold text-foreground">{importPreview.willImport}</div>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/30 p-3">
                          <div className="text-xs text-muted-foreground">Missing in system</div>
                          <div className="text-lg font-semibold text-foreground">{importPreview.missingInSystem}</div>
                        </div>
                      </div>

                      {importPreview.sampleIds.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-foreground">Sample IDs</div>
                          <div className="space-y-1">
                            {importPreview.sampleIds.map((id) => (
                              <div key={id} className="text-xs font-mono text-muted-foreground truncate">
                                {id}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={cancelImportPreview}>
                          Cancel
                        </Button>
                        <Button onClick={confirmImport} disabled={importPreview.willImport === 0}>
                          Import to dashboard
                        </Button>
                      </div>

                      {importPreview.willImport === 0 && (
                        <div className="text-xs text-muted-foreground">
                          Nothing to import. If IDs are missing in the system, ask a collector to add them first.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Preparing preview…</div>
                  )}
                </DialogContent>
              </Dialog>

              {/* Seeds List */}
              {selectedSeeds.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl mb-3">
                  <span className="text-sm font-medium text-primary">{selectedSeeds.length} selected</span>
                  <Button size="sm" variant="outline" className="ml-auto" onClick={handleExportSelected}>
                    <Download className="w-3.5 h-3.5 mr-1" />Export
                  </Button>
                  <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setSelectedSeeds([])}>
                    Clear
                  </Button>
                </div>
              )}
              {filteredSeeds.length > 0 ? (
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <table className="w-full">
                    <thead><tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 w-10"><Checkbox checked={selectedSeeds.length === filteredSeeds.length && filteredSeeds.length > 0} onCheckedChange={(c) => handleSelectAllSeeds(!!c)} /></th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Plant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Origin</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                      {filteredSeeds.map((bs) => (
                        <tr key={bs.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 w-10"><Checkbox checked={selectedSeeds.includes(bs.id)} onCheckedChange={(c) => handleSelectSeed(bs.id, !!c)} /></td>
                          <td className="px-4 py-3"><div className="flex items-center gap-3">
                            {bs.seeds?.image_url ? <img src={bs.seeds.image_url} alt={bs.seeds?.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" /> : <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0"><Leaf className="w-5 h-5 text-muted-foreground" /></div>}
                            <span className="font-medium text-foreground text-sm truncate max-w-[120px]">{bs.seeds?.name}</span>
                          </div></td>
                          <td className="px-4 py-3 hidden sm:table-cell"><span className="font-mono text-xs text-muted-foreground">{bs.seeds?.seed_id}</span></td>
                          <td className="px-4 py-3 hidden md:table-cell"><span className="text-sm text-muted-foreground">{bs.seeds?.city && bs.seeds?.country ? `${bs.seeds.city}, ${bs.seeds.country}` : "—"}</span></td>
                          <td className="px-4 py-3"><span className="text-sm">{bs.quantity}</span></td>
                          <td className="px-4 py-3"><div className="flex items-center justify-end gap-1">
                            <button onClick={() => bs.seeds && toggleFavorite(bs.seeds)} className={`p-1.5 rounded-lg transition-colors ${isFavorite(bs.seeds?.seed_id) ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"}`}>
                              <Star className={`w-4 h-4 ${isFavorite(bs.seeds?.seed_id) ? "fill-current" : ""}`} />
                            </button>
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => { setCurrentPassport(bs.seeds); setPassportOpen(true); }}>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={async () => {
                                const { error } = await api.removeBuyerSeed(bs.id);
                                if (!error) {
                                  setBuyerSeeds(prev => prev.filter(s => s.id !== bs.id));
                                  toast.success("Removed from your list");
                                }
                              }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>              ) : (
                <div className="py-12 text-center">
                  <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {buyerSeeds.length === 0 
                      ? "No seeds assigned to you yet. Contact your seller!" 
                      : "No seeds found"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Favorites Tab */}
          {activeTab === "favorites" && (
            <div className="animate-fade-in">
              {/* Search & Sort */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search favorites..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={favoritesSortOption}
                    onChange={(e) => setFavoritesSortOption(e.target.value as "name" | "date" | "quantity")}
                    className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="name">Sort by Name</option>
                    <option value="date">Sort by Date</option>
                    <option value="quantity">Sort by Quantity</option>
                  </select>
                </div>
              </div>

              {/* Favorites List */}
              {selectedFavs.length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl mb-3">
                  <span className="text-sm font-medium text-primary">{selectedFavs.length} selected</span>
                  <Button size="sm" variant="outline" className="ml-auto" onClick={handleBulkAddFavsToList}>
                    <Plus className="w-3.5 h-3.5 mr-1" />Add All to List
                  </Button>
                  <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setSelectedFavs([])}>
                    Clear
                  </Button>
                </div>
              )}
              {filteredFavorites.length > 0 ? (
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                  <table className="w-full">
                    <thead><tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 w-10"><Checkbox checked={selectedFavs.length === filteredFavorites.length && filteredFavorites.length > 0} onCheckedChange={(c) => setSelectedFavs(!!c ? filteredFavorites.map(f => f.seed_id) : [])} /></th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Plant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden sm:table-cell">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Origin</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-border">
                      {filteredFavorites.map((seed) => (
                        <tr key={seed.seed_id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 w-10"><Checkbox checked={selectedFavs.includes(seed.seed_id)} onCheckedChange={(c) => handleSelectFav(seed.seed_id, !!c)} /></td>
                          <td className="px-4 py-3"><div className="flex items-center gap-3">
                            {seed.image_url ? <img src={seed.image_url} alt={seed.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" /> : <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0"><Leaf className="w-5 h-5 text-muted-foreground" /></div>}
                            <span className="font-medium text-foreground text-sm truncate max-w-[120px]">{seed.name}</span>
                          </div></td>
                          <td className="px-4 py-3 hidden sm:table-cell"><span className="font-mono text-xs text-muted-foreground">{seed.seed_id}</span></td>
                          <td className="px-4 py-3 hidden md:table-cell"><span className="text-sm text-muted-foreground">{seed.city && seed.country ? `${seed.city}, ${seed.country}` : "—"}</span></td>
                          <td className="px-4 py-3"><span className="text-sm">{seed.quantity}</span></td>
                          <td className="px-4 py-3"><div className="flex items-center justify-end gap-1">
                            <Button size="sm" className="h-8 px-2 text-xs" onClick={() => handleAddToMyList(seed)}>
                              <Plus className="w-3.5 h-3.5 mr-1" />Add
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => { setCurrentPassport(seed); setPassportOpen(true); }}>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                            <button onClick={() => toggleFavorite(seed)} className="p-1.5 rounded-lg text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors">
                              <Star className="w-4 h-4 fill-current" />
                            </button>
                          </div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Star className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    No favorites yet. Scan products and add them to your favorites!
                  </p>
                  <Button variant="outline" onClick={() => setActiveTab("scan")}>
                    <QrCode className="w-4 h-4 mr-2" />
                    Scan Product
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

            {/* Plant Passport Modal */}
      <Dialog open={passportOpen} onOpenChange={setPassportOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-primary" />
              Plant Passport
            </DialogTitle>
          </DialogHeader>
          
          {currentPassport && (
            <div className="space-y-4">
              {currentPassport.image_url ? (
                <img 
                  src={currentPassport.image_url}
                  alt={currentPassport.name}
                  className="w-full h-48 object-cover rounded-lg bg-muted"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-full h-48 bg-muted rounded-lg flex items-center justify-center ${currentPassport.image_url ? 'hidden' : ''}`}>
                <Leaf className="w-16 h-16 text-muted-foreground" />
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Plant Name</span>
                  <p className="text-lg font-semibold text-foreground">{currentPassport.name}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">ID</span>
                    <p className="font-mono text-sm text-foreground">{currentPassport.seed_id}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Collection Date</span>
                    <p className="text-sm text-foreground">
                      {new Date(currentPassport.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Origin</span>
                  <p className="text-sm text-foreground flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {currentPassport.city || currentPassport.country 
                      ? [currentPassport.street, currentPassport.zip_code, currentPassport.city, currentPassport.country].filter(Boolean).join(", ")
                      : "Not specified"}
                  </p>
                  {currentPassport.latitude != null && currentPassport.longitude != null && (
                    <button
                      onClick={() => openInMaps(currentPassport.latitude, currentPassport.longitude)}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-mono mt-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {currentPassport.latitude}, {currentPassport.longitude}
                    </button>
                  )}
                </div>

                {currentPassport.notes && (
                  <div>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Notes</span>
                    <p className="text-sm text-foreground">{currentPassport.notes}</p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <Button className="w-full" onClick={() => currentPassport && handleAddToMyList(currentPassport)}>
                  <Plus className="w-4 h-4 mr-2" />Add to My List
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => toggleFavorite(currentPassport)}
                  >
                    {isFavorite(currentPassport.seed_id) ? (
                      <>
                        <Star className="w-4 h-4 mr-1 fill-yellow-500 text-yellow-500" />
                        Favorited
                      </>
                    ) : (
                      <>
                        <Heart className="w-4 h-4 mr-1" />
                        Favorite
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => downloadPassportPDF(currentPassport)}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => printPassport(currentPassport)}
                  >
                    <Printer className="w-4 h-4 mr-1" />
                    Print
                  </Button>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground text-center">
                  Verified by Indomitum • Digital Plant Passport
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ShareListModal
        open={shareListOpen}
        onOpenChange={setShareListOpen}
        seeds={buyerSeeds.map(bs => ({ seed_id: bs.seeds?.seed_id || "", name: bs.seeds?.name || "", quantity: bs.quantity || 1 }))}
        onOrderSent={() => { setShareListOpen(false); toast.success("Order sent!"); }}
      />
      <GuidedTour
        storageKey={tourStorageKey}
        open={tourOpen}
        onFinish={() => setTourOpen(false)}
        steps={[
          { target: "[data-tour='buyer-seeds']", title: "My Seeds", description: "Browse all seeds assigned to you. Tap any seed to view its full Plant Passport with barcode, photo, and location data.", placement: "right" },
          { target: "[data-tour='buyer-favorites']", title: "Favorites", description: "Bookmark seeds for quick access. Sort them by name, date added, or quantity.", placement: "right" },
          { target: "[data-tour='buyer-scan']", title: "Scan & Lookup", description: "Scan a barcode or type an ID to instantly pull up any plant passport. Print it or download the PDF.", placement: "right" },
        ]}
      />
    </div>
  );
};

export default BuyerDashboard;
