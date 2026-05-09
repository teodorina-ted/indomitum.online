import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Leaf,
  Plus,
  Search,
  Download,
  Upload,
  Trash2,
  Edit,
  Eye,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MapPin,
  Calendar,
  User,
  Package,
  Menu,
  X,
  Home,
  History,
  Settings,
  LogOut,
  RotateCcw,
  Loader2,
  ExternalLink,
  Navigation,
  Barcode,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import BarcodeModal from "@/components/BarcodeModal";
import BulkBarcodeModal from "@/components/BulkBarcodeModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GuidedTour, TourStep } from "@/components/GuidedTour";
import appBackground from "@/assets/app-background.jpg";

const PUBLISHED_URL = "https://indomitum.online";

interface Seed {
  id: string;
  seed_id: string;
  name: string;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  country: string | null;
  city: string | null;
  street: string | null;
  zip_code: string | null;
  notes: string | null;
  quantity: number;
  created_at: string;
  added_by: string | null;
}

type SortField = "seed_id" | "name" | "created_at" | "quantity" | "city" | "country";
type SortDirection = "asc" | "desc";
type ExportFormat = "csv" | "json" | "xlsx" | "pdf";

const DEFAULT_ROWS_PER_PAGE = 20;

const Dashboard = () => {
  const { user, profile, signOut, isLoading: authLoading, isCollector } = useAuth();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeeds, setSelectedSeeds] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_ROWS_PER_PAGE);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const tourStorageKey = isCollector
    ? "indomitum_collector_tour_completed"
    : "indomitum_tour_completed";
  const [tourOpen, setTourOpen] = useState(false);

  // Column widths for resizable columns
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    checkbox: 50,
    seed_id: 100,
    name: 180,
    created_at: 140,
    city: 100,
    country: 100,
    zip_code: 80,
    geolocation: 140,
    added_by: 120,
    quantity: 70,
    actions: 120,
  });
  const [resizing, setResizing] = useState<string | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const [profilesByUserId, setProfilesByUserId] = useState<Record<string, string>>({});

  // Passport modal
  const [passportOpen, setPassportOpen] = useState(false);
  const [currentPassport, setCurrentPassport] = useState<Seed | null>(null);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editingSeed, setEditingSeed] = useState<Seed | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    quantity: "",
    notes: "",
    street: "",
    city: "",
    zip_code: "",
    country: "",
    latitude: "",
    longitude: "",
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Export modal
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const defaultExportName = useMemo(() => {
    const d = new Date().toISOString().split("T")[0];
    return `seeds-export-${d}`;
  }, []);
  const [exportFileName, setExportFileName] = useState(defaultExportName);

  // Barcode modal
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [barcodeSeed, setBarcodeSeed] = useState<Seed | null>(null);

  // Bulk Barcode modal
  const [bulkBarcodeOpen, setBulkBarcodeOpen] = useState(false);

  // File import
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openBarcode = (seed: Seed) => {
    setBarcodeSeed(seed);
    setBarcodeOpen(true);
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [user, authLoading, navigate]);

  // Fetch seeds
  useEffect(() => {
    const fetchSeeds = async () => {
      if (!user) return;

      setIsLoading(true);
      const { data, error } = await api.getSeeds();

      if (error) {
        toast.error("Failed to load seeds");
        console.error(error);
        setSeeds([]);
      } else {
        setSeeds(data || []);
      }
      setIsLoading(false);
    };

    if (user) fetchSeeds();
  }, [user]);

  // Fetch "added by" names for the currently loaded seeds
  useEffect(() => {
    const loadNames = async () => {
      const ids = Array.from(
        new Set(seeds.map((s) => s.added_by).filter(Boolean) as string[])
      );

      if (ids.length === 0) {
        setProfilesByUserId({});
        return;
      }

      const { data, error } = await api.getProfilesByIds(ids);

      if (error) {
        console.error(error);
        return;
      }

      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => {
        if (p.user_id) map[p.user_id] = p.full_name;
      });
      setProfilesByUserId(map);
    };

    if (seeds.length) loadNames();
  }, [seeds]);

  // Handle column resize
  const handleResizeStart = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    setResizing(columnId);
    startX.current = e.clientX;
    startWidth.current = columnWidths[columnId] || 150;

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startX.current;
      const newWidth = Math.max(60, startWidth.current + diff);
      setColumnWidths((prev) => ({ ...prev, [columnId]: newWidth }));
    };

    const handleMouseUp = () => {
      setResizing(null);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) setSelectedSeeds(paginatedSeeds.map((s) => s.id));
    else setSelectedSeeds([]);
  };

  const handleSelectSeed = (id: string, checked: boolean) => {
    if (checked) setSelectedSeeds([...selectedSeeds, id]);
    else setSelectedSeeds(selectedSeeds.filter((s) => s !== id));
  };

  const handleDelete = async () => {
    if (selectedSeeds.length === 0) return;

    const seedsToDelete = seeds.filter((s) => selectedSeeds.includes(s.id));

    // Move to deleted_seeds (bin) and add history
    for (const seed of seedsToDelete) {
      await api.deleteSeed(seed.id);
    }

    const hasError = false; // errors handled inside deleteSeed

    if (hasError) {
      toast.error("Failed to delete seeds");
    } else {
      toast.success(`${selectedSeeds.length} seed(s) moved to bin`);
      setSeeds(seeds.filter((s) => !selectedSeeds.includes(s.id)));
      setSelectedSeeds([]);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  // Filter data
  const filteredSeeds = useMemo(() => {
    let result = seeds.filter(
      (seed) =>
        seed.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seed.seed_id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply column filters
    Object.entries(columnFilters).forEach(([key, value]) => {
      if (!value) return;
      const query = value.toLowerCase();
      result = result.filter((seed) => {
        const fieldValue = (seed as any)[key];
        return fieldValue != null && String(fieldValue).toLowerCase().includes(query);
      });
    });

    return result;
  }, [seeds, searchQuery, columnFilters]);

  // Sort data
  const sortedSeeds = useMemo(() => {
    return [...filteredSeeds].sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "seed_id") {
        comparison = a.seed_id.localeCompare(b.seed_id);
      } else if (sortField === "created_at") {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === "quantity") {
        comparison = a.quantity - b.quantity;
      } else if (sortField === "city") {
        comparison = (a.city || "").localeCompare(b.city || "");
      } else if (sortField === "country") {
        comparison = (a.country || "").localeCompare(b.country || "");
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredSeeds, sortField, sortDirection]);

  // Pagination
  const effectiveRowsPerPage = rowsPerPage <= 0 ? sortedSeeds.length || 1 : rowsPerPage;
  const totalPages = Math.ceil(sortedSeeds.length / effectiveRowsPerPage);
  const paginatedSeeds = useMemo(() => {
    const start = (currentPage - 1) * effectiveRowsPerPage;
    return sortedSeeds.slice(start, start + effectiveRowsPerPage);
  }, [sortedSeeds, currentPage, effectiveRowsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, columnFilters]);

  // Onboarding/tour: show once per role
  useEffect(() => {
    try {
      const completed = localStorage.getItem(tourStorageKey) === "true";
      if (!completed) setTourOpen(true);
    } catch {
      // ignore
    }
  }, [tourStorageKey]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  const totalQuantity = seeds.reduce((acc, s) => acc + s.quantity, 0);
  const uniqueLocations = new Set(seeds.map((s) => s.city).filter(Boolean)).size;

  const openPassport = (seed: Seed) => {
    setCurrentPassport(seed);
    setPassportOpen(true);
  };

  const openEdit = (seed: Seed) => {
    setEditingSeed(seed);
    setEditForm({
      name: seed.name || "",
      quantity: String(seed.quantity ?? ""),
      notes: seed.notes || "",
      street: seed.street || "",
      city: seed.city || "",
      zip_code: seed.zip_code || "",
      country: seed.country || "",
      latitude: seed.latitude == null ? "" : String(seed.latitude),
      longitude: seed.longitude == null ? "" : String(seed.longitude),
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editingSeed) return;

    const quantity = Number(editForm.quantity);
    if (!editForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!Number.isFinite(quantity) || quantity < 0) {
      toast.error("Quantity must be a valid number");
      return;
    }

    setIsSavingEdit(true);
    const updatePayload: Partial<Seed> = {
      name: editForm.name.trim(),
      quantity,
      notes: editForm.notes.trim() ? editForm.notes.trim() : null,
      street: editForm.street.trim() ? editForm.street.trim() : null,
      city: editForm.city.trim() ? editForm.city.trim() : null,
      zip_code: editForm.zip_code.trim() ? editForm.zip_code.trim() : null,
      country: editForm.country.trim() ? editForm.country.trim() : null,
      latitude: editForm.latitude.trim() ? Number(editForm.latitude) : null,
      longitude: editForm.longitude.trim() ? Number(editForm.longitude) : null,
    };

    const { data, error } = await api.updateSeed(editingSeed.id, updatePayload);

    if (error) {
      console.error(error);
      toast.error("Failed to save changes");
      setIsSavingEdit(false);
      return;
    }

    setSeeds((prev) => prev.map((s) => (s.id === editingSeed.id ? (data as any) : s)));
    setEditOpen(false);
    setEditingSeed(null);
    setIsSavingEdit(false);
    toast.success("Seed updated");
  };

  const startExport = () => {
    if (selectedSeeds.length === 0) {
      toast.error("Select at least one seed to export");
      return;
    }
    setExportFileName(defaultExportName);
    setExportFormat("csv");
    setExportOpen(true);
  };

  // Download individual passport as PDF
  const downloadPassportPDF = async (seed: Seed) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

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
    doc.text(`ID: ${seed.seed_id}`, pageWidth / 2, 30, { align: "center" });

    doc.setTextColor(0, 0, 0);

    // Plant name
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(seed.name, pageWidth / 2, 50, { align: "center" });

    // Try to add image
    if (seed.image_url) {
      try {
        doc.addImage(seed.image_url, "JPEG", (pageWidth - 80) / 2, 55, 80, 60);
      } catch (e) {
        // Image couldn't be loaded
      }
    }

    // Details table
    const startY = seed.image_url ? 125 : 60;
    const details = [
      ["Seed ID", seed.seed_id],
      ["Quantity", String(seed.quantity)],
      ["Collection Date", new Date(seed.created_at).toLocaleDateString()],
      ["Street", seed.street || "—"],
      ["City", seed.city || "—"],
      ["ZIP Code", seed.zip_code || "—"],
      ["Country", seed.country || "—"],
      ["Coordinates", seed.latitude && seed.longitude ? `${seed.latitude}, ${seed.longitude}` : "—"],
      ["Added By", seed.added_by ? (profilesByUserId[seed.added_by] || "—") : "—"],
    ];

    autoTable(doc, {
      body: details,
      startY: startY,
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
    if (seed.notes) {
      const finalY = (doc as any).lastAutoTable.finalY || startY + 80;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text("Notes:", 30, finalY + 10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);
      const notesLines = doc.splitTextToSize(seed.notes, pageWidth - 60);
      doc.text(notesLines, 30, finalY + 18);
    }

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("Verified by Indomitum • Digital Plant Passport", pageWidth / 2, pageHeight - 10, { align: "center" });
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 5, { align: "center" });

    doc.save(`plant-passport-${seed.seed_id}.pdf`);
    toast.success("Passport downloaded!");
  };

  const doExport = () => {
    const selectedData = seeds.filter((s) => selectedSeeds.includes(s.id));

    const fileName = (exportFileName || defaultExportName).trim();
    const safeBase = fileName.replace(/[^a-zA-Z0-9-_]+/g, "-");

    const passportBaseUrl = `${window.location.origin}/passport/`;

    const header = [
      "ID",
      "Passport URL",
      "Name",
      "Quantity",
      "Latitude",
      "Longitude",
      "Street",
      "City",
      "ZIP",
      "Country",
      "Added By",
      "Created At",
      "Image URL",
      "Notes",
    ];

    const dataRows = selectedData.map((s) => {
      const passportUrl = `${passportBaseUrl}${encodeURIComponent(s.seed_id)}`;
      return [
        s.seed_id,
        passportUrl,
        s.name,
        String(s.quantity),
        s.latitude ?? "",
        s.longitude ?? "",
        s.street ?? "",
        s.city ?? "",
        s.zip_code ?? "",
        s.country ?? "",
        s.added_by ? (profilesByUserId[s.added_by] || s.added_by) : "",
        new Date(s.created_at).toISOString(),
        s.image_url ?? "",
        s.notes ?? "",
      ];
    });

    if (exportFormat === "json") {
      const blob = new Blob([JSON.stringify(selectedData, null, 2)], { type: "application/json" });
      downloadBlob(blob, `${safeBase}.json`);
    } else if (exportFormat === "xlsx") {
      const xlsxRows = dataRows.map((r) => {
        const id = String(r[0] ?? "");
        const url = String(r[1] ?? "");
        const linkedId = url ? `=HYPERLINK("${url}","${id}")` : id;
        return [linkedId, ...r.slice(1)];
      });

      const ws = XLSX.utils.aoa_to_sheet([header, ...xlsxRows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Seeds");
      const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbOut], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      downloadBlob(blob, `${safeBase}.xlsx`);
    } else if (exportFormat === "pdf") {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Header with branding
      doc.setFillColor(34, 139, 34);
      doc.rect(0, 0, pageWidth, 25, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("INDOMITUM", 14, 15);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Digital Plant Passport Collection", 14, 21);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, 15, { align: "right" });
      doc.text(`${selectedData.length} seed(s)`, pageWidth - 14, 21, { align: "right" });

      doc.setTextColor(0, 0, 0);

      const pdfHeader = ["#", "ID", "Name", "Qty", "City", "Country", "ZIP", "Added By", "Created"];
      const pdfRows = selectedData.map((s, idx) => [
        String(idx + 1),
        s.seed_id,
        s.name,
        String(s.quantity),
        s.city ?? "—",
        s.country ?? "—",
        s.zip_code ?? "—",
        s.added_by ? (profilesByUserId[s.added_by] || "—") : "—",
        new Date(s.created_at).toLocaleDateString(),
      ]);

      autoTable(doc, {
        head: [pdfHeader],
        body: pdfRows,
        startY: 32,
        theme: "striped",
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: "linebreak",
          halign: "left",
        },
        headStyles: {
          fillColor: [34, 139, 34],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 10,
        },
        alternateRowStyles: { fillColor: [245, 250, 245] },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { cellWidth: 35, fontStyle: "bold" },
          2: { cellWidth: 40 },
          3: { halign: "center", cellWidth: 15 },
          4: { cellWidth: 30 },
          5: { cellWidth: 30 },
          6: { cellWidth: 20 },
          7: { cellWidth: 30 },
          8: { cellWidth: 25 },
        },
        margin: { left: 10, right: 10 },
        didDrawPage: (data) => {
          const pageNum = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(
            `Page ${data.pageNumber} of ${pageNum}`,
            pageWidth / 2,
            pageHeight - 8,
            { align: "center" }
          );
        },
      });

      doc.save(`${safeBase}.pdf`);
      toast.success(`Exported ${selectedData.length} seed(s)`);
      setExportOpen(false);
      return;
    } else {
      const csvEscape = (v: any) => {
        const str = String(v ?? "");
        if (/[\n",]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
        return str;
      };
      const csvContent = [
        header.map(csvEscape).join(","),
        ...dataRows.map((r) => r.map(csvEscape).join(",")),
      ].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      downloadBlob(blob, `${safeBase}.csv`);
    }

    toast.success(`Exported ${selectedData.length} seed(s)`);
    setExportOpen(false);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const processImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();

    try {
      let importedData: any[] = [];

      if (ext === "json") {
        const text = await file.text();
        importedData = JSON.parse(text);
      } else if (ext === "csv") {
        const text = await file.text();
        const lines = text.split("\n");
        const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
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
        return;
      }

      if (importedData.length === 0) {
        toast.error("No data found in file");
        return;
      }

      // Process and insert seeds
      let imported = 0;
      let skipped = 0;

      for (const row of importedData) {
        const seedId = row.ID || row.seed_id || row.id || row.artifact_id || row.batch_no;
        const name = row.Name || row.name || row.item_name;

        if (!seedId || !name) {
          skipped++;
          continue;
        }

        // Check if seed already exists
        const { data: existing } = await api.checkSeedExists(seedId);

        if (existing) {
          skipped++;
          continue;
        }

        const { error } = await api.createSeed({
          seed_id: seedId,
          name: name,
          quantity: Number(row.Quantity || row.quantity || row.Qty || row.qty_sent || 1),
          city: row.City || row.city || null,
          country: row.Country || row.country || null,
          zip_code: row.ZIP || row.zip_code || row["ZIP Code"] || row.zip_postal || null,
          street: row.Street || row.street || row.address || null,
          latitude: row.Latitude || row.latitude ? Number(row.Latitude || row.latitude) : null,
          longitude: row.Longitude || row.longitude ? Number(row.Longitude || row.longitude) : null,
          notes: row.Notes || row.notes || null,
          image_url: row["Image URL"] || row.image_url || row.image_data_base64 || null,
        });

        if (!error) {
          imported++;
        } else {
          skipped++;
        }
      }

      toast.success(`Imported ${imported} seed(s). ${skipped > 0 ? `${skipped} skipped.` : ""}`);

      // Refresh seeds
      const { data } = await api.getSeeds();
      if (data) setSeeds(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to import file");
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Open geolocation in map app
  const openInMaps = (lat: number | null, lng: number | null) => {
    if (lat == null || lng == null) return;
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, "_blank");
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
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url(${appBackground})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.08,
        }}
      />

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col border-r border-border bg-card/95 backdrop-blur-sm transition-all duration-300 relative z-10 ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <>
                <Link to="/" className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                    <Leaf className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="text-lg font-semibold text-foreground">Indomitum</span>
                </Link>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label="Collapse sidebar"
                >
                  <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                </button>
              </>
            )}
            {sidebarCollapsed && (
              <div className="flex flex-col items-center gap-2 w-full">
                <Link to="/">
                  <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                    <Leaf className="w-5 h-5 text-primary-foreground" />
                  </div>
                </Link>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label="Expand sidebar"
                >
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          <Link
            to="/dashboard"
            data-tour="nav-dashboard"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg bg-accent text-accent-foreground font-medium ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
            title="Dashboard"
          >
            <Home className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>Dashboard</span>}
          </Link>
          {isCollector && (
            <Link
              to="/dashboard/add"
              data-tour="nav-add-plant"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${
                sidebarCollapsed ? "justify-center" : ""
              }`}
              title="Add Plant"
            >
              <Plus className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>Add Plant</span>}
            </Link>
          )}
          <Link
            to="/dashboard/bin"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
            title="Recycle Bin"
          >
            <RotateCcw className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>Recycle Bin</span>}
          </Link>
          <Link
            to="/dashboard/history"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
            title="History"
          >
            <History className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>History</span>}
          </Link>
          <Link
            to="/dashboard/tracking"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
            title="Tracking"
          >
            <MapPin className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>Tracking</span>}
          </Link>
          <Link
            to="/dashboard/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
            title="Settings"
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>Settings</span>}
          </Link>
          <button
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full ${
              sidebarCollapsed ? "justify-center" : ""
            }`}
            onClick={() => {
              localStorage.removeItem("indomitum_tour_completed");
              localStorage.removeItem("indomitum_collector_tour_completed");
              toast.success("Tour restarted");
              setTourOpen(true);
            }}
            title="Restart Tour"
          >
            <RefreshCw className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span>Restart Tour</span>}
          </button>
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-border space-y-2">
          {!sidebarCollapsed && <ProfileSwitcher />}

          <div className={`flex items-center gap-3 px-2 py-2 ${sidebarCollapsed ? "justify-center" : ""}`}>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {profile?.full_name || user?.email}
                </div>
                <div className="text-xs text-muted-foreground capitalize">
                  {isCollector ? "Collector" : "Buyer"}
                </div>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className={`w-full text-muted-foreground ${sidebarCollapsed ? "justify-center px-0" : "justify-start"}`}
            onClick={handleSignOut}
            title="Sign out"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!sidebarCollapsed && <span className="ml-2">Sign out</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0 [&>button]:hidden">
          <div className="flex flex-col h-full">
            <SheetHeader className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <SheetTitle className="flex-1">
                  <Link to="/" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
                    <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                      <Leaf className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <span className="text-lg font-semibold text-foreground">Indomitum</span>
                  </Link>
                </SheetTitle>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </SheetHeader>

            <nav className="flex-1 p-4 space-y-1">
              <Link
                to="/dashboard"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-accent text-accent-foreground font-medium"
              >
                <Home className="w-5 h-5" />
                Dashboard
              </Link>
              {isCollector && (
                <Link
                  to="/dashboard/add"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Add Plant
                </Link>
              )}
              <Link
                to="/dashboard/bin"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                Recycle Bin
              </Link>
              <Link
                to="/dashboard/history"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <History className="w-5 h-5" />
                History
              </Link>
              <Link
                to="/dashboard/tracking"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <MapPin className="w-5 h-5" />
                Tracking
              </Link>
              <Link
                to="/dashboard/settings"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Settings className="w-5 h-5" />
                Settings
              </Link>
              <button
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full"
                onClick={() => {
                  localStorage.removeItem("indomitum_tour_completed");
                  localStorage.removeItem("indomitum_collector_tour_completed");
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
              <ProfileSwitcher />

              <div className="flex items-center gap-3">
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
                onClick={() => {
                  setSidebarOpen(false);
                  handleSignOut();
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button className="lg:hidden p-2 text-foreground" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-xl lg:text-2xl font-bold text-foreground">Seed Collection</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {isCollector && (
                <Link to="/dashboard/add">
                  <Button size="default" className="hidden sm:flex">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Plant
                  </Button>
                  <Button size="icon" className="sm:hidden">
                    <Plus className="w-5 h-5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-6 pb-safe">
          {/* Stats */}
          <div data-tour="stats-cards" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{seeds.length}</div>
                  <div className="text-sm text-muted-foreground">Total Seeds</div>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Leaf className="w-5 h-5 text-success" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{totalQuantity}</div>
                  <div className="text-sm text-muted-foreground">Total Quantity</div>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">{uniqueLocations}</div>
                  <div className="text-sm text-muted-foreground">Locations</div>
                </div>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">
                    {seeds.length > 0
                      ? new Date(seeds[0].created_at).toLocaleDateString("en-US", { month: "short" })
                      : "—"}
                  </div>
                  <div className="text-sm text-muted-foreground">Last Added</div>
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div data-tour="toolbar" className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {isCollector && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json,.xlsx,.xls"
                    className="hidden"
                    onChange={processImportFile}
                  />
                  <Button
                    variant="outline"
                    size="default"
                    onClick={handleImport}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </Button>
                  <Button variant="outline" size="default" onClick={startExport}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button
                    variant="outline"
                    size="default"
                    onClick={() => setBulkBarcodeOpen(true)}
                    disabled={selectedSeeds.length === 0}
                  >
                    <Barcode className="w-4 h-4 mr-2" />
                    Bulk Barcodes ({selectedSeeds.length})
                  </Button>
                  <Button
                    variant="destructive"
                    size="default"
                    onClick={handleDelete}
                    disabled={selectedSeeds.length === 0}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete ({selectedSeeds.length})
                  </Button>
                </>
              )}
              {Object.keys(columnFilters).length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setColumnFilters({})}
                  className="text-muted-foreground"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto" style={{ maxHeight: "65vh" }}>
              <table className="w-full" style={{ minWidth: "1200px" }}>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted">
                    <th
                      className="px-4 py-3 text-left sticky left-0 bg-muted border-b border-border"
                      style={{ width: columnWidths.checkbox }}
                    >
                      <Checkbox
                        checked={selectedSeeds.length === paginatedSeeds.length && paginatedSeeds.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all seeds"
                      />
                    </th>
                    <th
                      className="px-4 py-3 text-left relative group bg-muted border-b border-border"
                      style={{ width: columnWidths.seed_id }}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSort("seed_id")}
                          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                        >
                          ID <SortIcon field="seed_id" />
                        </button>
                      </div>
                      <div
                        className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 ${resizing === "seed_id" ? "bg-primary" : ""}`}
                        onMouseDown={(e) => handleResizeStart(e, "seed_id")}
                      />
                    </th>
                    <th
                      className="px-4 py-3 text-left relative group bg-muted border-b border-border"
                      style={{ width: columnWidths.name }}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSort("name")}
                          className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                        >
                          Name <SortIcon field="name" />
                        </button>
                      </div>
                      <div
                        className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 ${resizing === "name" ? "bg-primary" : ""}`}
                        onMouseDown={(e) => handleResizeStart(e, "name")}
                      />
                    </th>
                    <th className="px-4 py-3 text-left relative group bg-muted border-b border-border" style={{ width: columnWidths.created_at }}>
                      <button onClick={() => handleSort("created_at")} className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
                        Date <SortIcon field="created_at" />
                      </button>
                      <div className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 ${resizing === "created_at" ? "bg-primary" : ""}`} onMouseDown={(e) => handleResizeStart(e, "created_at")} />
                    </th>
                    <th className="px-4 py-3 text-left relative group bg-muted border-b border-border" style={{ width: columnWidths.city }}>
                      <button onClick={() => handleSort("city")} className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
                        City <SortIcon field="city" />
                      </button>
                      <div className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 ${resizing === "city" ? "bg-primary" : ""}`} onMouseDown={(e) => handleResizeStart(e, "city")} />
                    </th>
                    <th className="px-4 py-3 text-left relative group bg-muted border-b border-border" style={{ width: columnWidths.country }}>
                      <button onClick={() => handleSort("country")} className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
                        Country <SortIcon field="country" />
                      </button>
                      <div className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 ${resizing === "country" ? "bg-primary" : ""}`} onMouseDown={(e) => handleResizeStart(e, "country")} />
                    </th>
                    <th className="px-4 py-3 text-left relative group bg-muted border-b border-border" style={{ width: columnWidths.zip_code }}>
                      <span className="text-sm font-medium text-muted-foreground">ZIP</span>
                      <div className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 ${resizing === "zip_code" ? "bg-primary" : ""}`} onMouseDown={(e) => handleResizeStart(e, "zip_code")} />
                    </th>
                    <th className="px-4 py-3 text-left relative group bg-muted border-b border-border" style={{ width: columnWidths.geolocation }}>
                      <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                        <Navigation className="w-3.5 h-3.5" />
                        Map
                      </span>
                      <div className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 ${resizing === "geolocation" ? "bg-primary" : ""}`} onMouseDown={(e) => handleResizeStart(e, "geolocation")} />
                    </th>
                    <th className="px-4 py-3 text-left relative group bg-muted border-b border-border" style={{ width: columnWidths.added_by }}>
                      <span className="text-sm font-medium text-muted-foreground">Added By</span>
                      <div className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 ${resizing === "added_by" ? "bg-primary" : ""}`} onMouseDown={(e) => handleResizeStart(e, "added_by")} />
                    </th>
                    <th className="px-4 py-3 text-left relative group bg-muted border-b border-border" style={{ width: columnWidths.quantity }}>
                      <button onClick={() => handleSort("quantity")} className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
                        Qty <SortIcon field="quantity" />
                      </button>
                      <div className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 ${resizing === "quantity" ? "bg-primary" : ""}`} onMouseDown={(e) => handleResizeStart(e, "quantity")} />
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground sticky right-0 bg-muted border-b border-border" style={{ width: columnWidths.actions }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedSeeds.map((seed) => (
                    <tr key={seed.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 sticky left-0 bg-card">
                        <Checkbox
                          checked={selectedSeeds.includes(seed.id)}
                          onCheckedChange={(checked) => handleSelectSeed(seed.id, checked as boolean)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`${PUBLISHED_URL}/passport/${encodeURIComponent(seed.seed_id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex items-center gap-1 text-sm font-mono text-muted-foreground hover:text-primary transition-colors"
                          title="Open passport"
                        >
                          {seed.seed_id}
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {seed.image_url ? (
                            <img
                              src={seed.image_url}
                              alt={seed.name}
                              className="w-10 h-10 rounded-lg object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <Leaf className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium text-foreground">{seed.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(seed.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {seed.city || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {seed.country || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {seed.zip_code || "—"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {seed.latitude != null && seed.longitude != null ? (
                          <button
                            onClick={() => openInMaps(seed.latitude, seed.longitude)}
                            className="inline-flex items-center gap-1 text-primary hover:underline font-mono text-xs"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {seed.latitude?.toFixed(4)}, {seed.longitude?.toFixed(4)}
                          </button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {seed.added_by
                          ? profilesByUserId[seed.added_by] || (seed.added_by === user?.id ? "You" : seed.added_by)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{seed.quantity}</td>
                      <td className="px-4 py-3 sticky right-0 bg-card">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label="View passport"
                            onClick={() => openPassport(seed)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {isCollector && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label="Generate barcode"
                                onClick={() => openBarcode(seed)}
                              >
                                <Barcode className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label="Edit seed"
                                onClick={() => openEdit(seed)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {paginatedSeeds.length === 0 && (
              <div className="py-12 text-center">
                <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {seeds.length === 0 ? "No seeds yet. Add your first plant!" : "No seeds found"}
                </p>
                {seeds.length === 0 && isCollector && (
                  <Link to="/dashboard/add">
                    <Button className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Plant
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * effectiveRowsPerPage + 1}-
                {Math.min(currentPage * effectiveRowsPerPage, sortedSeeds.length)} of {sortedSeeds.length}
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      {rowsPerPage <= 0 ? "All" : rowsPerPage} / page
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {[20, 50, 100].map((n) => (
                      <DropdownMenuItem
                        key={n}
                        onClick={() => {
                          setRowsPerPage(n);
                          setCurrentPage(1);
                        }}
                      >
                        {n} / page
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem
                      onClick={() => {
                        setRowsPerPage(0);
                        setCurrentPage(1);
                      }}
                    >
                      Show all
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  <ChevronsLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronsRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Passport Modal */}
      <Dialog open={passportOpen} onOpenChange={setPassportOpen}>
        <DialogContent className="max-w-md">
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
                  className="w-full h-48 object-cover rounded-lg"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                  <Leaf className="w-16 h-16 text-muted-foreground" />
                </div>
              )}

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
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">Collected</span>
                    <p className="text-sm text-foreground">{new Date(currentPassport.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Location</span>
                  <p className="text-sm text-foreground">
                    {currentPassport.city || currentPassport.country
                      ? [currentPassport.street, currentPassport.zip_code, currentPassport.city, currentPassport.country]
                          .filter(Boolean)
                          .join(", ")
                      : "—"}
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

                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Notes</span>
                  <p className="text-sm text-foreground">{currentPassport.notes || "—"}</p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => downloadPassportPDF(currentPassport)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" />
              Edit Seed
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Plant Name</label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Quantity</label>
                <Input
                  type="number"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">ZIP</label>
                <Input
                  value={editForm.zip_code}
                  onChange={(e) => setEditForm({ ...editForm, zip_code: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Street</label>
                <Input
                  value={editForm.street}
                  onChange={(e) => setEditForm({ ...editForm, street: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">City</label>
                <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Country</label>
                <Input
                  value={editForm.country}
                  onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Latitude</label>
                <Input
                  value={editForm.latitude}
                  onChange={(e) => setEditForm({ ...editForm, latitude: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Longitude</label>
                <Input
                  value={editForm.longitude}
                  onChange={(e) => setEditForm({ ...editForm, longitude: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">Notes</label>
                <Input value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)} disabled={isSavingEdit}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={saveEdit} disabled={isSavingEdit}>
                {isSavingEdit ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Modal */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Export
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">File name</label>
              <Input value={exportFileName} onChange={(e) => setExportFileName(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Format</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={exportFormat === "csv" ? "default" : "outline"}
                  onClick={() => setExportFormat("csv")}
                >
                  CSV
                </Button>
                <Button
                  type="button"
                  variant={exportFormat === "json" ? "default" : "outline"}
                  onClick={() => setExportFormat("json")}
                >
                  JSON
                </Button>
                <Button
                  type="button"
                  variant={exportFormat === "xlsx" ? "default" : "outline"}
                  onClick={() => setExportFormat("xlsx")}
                >
                  Excel
                </Button>
                <Button
                  type="button"
                  variant={exportFormat === "pdf" ? "default" : "outline"}
                  onClick={() => setExportFormat("pdf")}
                >
                  PDF
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Exporting {selectedSeeds.length} seed(s)
            </p>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setExportOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={doExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Barcode Modal */}
      {barcodeSeed && (
        <BarcodeModal
          open={barcodeOpen}
          onOpenChange={(open) => {
            setBarcodeOpen(open);
            if (!open) setBarcodeSeed(null);
          }}
          seedId={barcodeSeed.seed_id}
          seedName={barcodeSeed.name}
          passportUrl={`${PUBLISHED_URL}/passport/${barcodeSeed.seed_id}`}
        />
      )}

      {/* Bulk Barcode Modal */}
      <BulkBarcodeModal
        open={bulkBarcodeOpen}
        onOpenChange={setBulkBarcodeOpen}
        seeds={selectedSeeds.map(id => {
          const seed = seeds.find(s => s.id === id);
          return seed ? { id: seed.id, seed_id: seed.seed_id, name: seed.name } : null;
        }).filter(Boolean) as { id: string; seed_id: string; name: string }[]}
        baseUrl={PUBLISHED_URL}
      />

      <GuidedTour
        storageKey={tourStorageKey}
        open={tourOpen}
        onFinish={() => setTourOpen(false)}
        steps={
          isCollector
            ? [
                { target: "[data-tour='stats-cards']", title: "Dashboard Overview", description: "Your command center — see total seeds, quantities, unique locations, and recent activity at a glance.", placement: "bottom" },
                { target: "[data-tour='nav-add-plant']", title: "Add New Plants", description: "Register a new seed entry — scan its barcode, snap a photo, tag GPS coordinates, and fill in the details.", placement: "right" },
                { target: "[data-tour='toolbar']", title: "Search, Import & Export", description: "Find any seed instantly with search. Bulk import from CSV/XLSX or export your data. Use 'Show all' to see everything.", placement: "bottom" },
                { target: "[data-tour='nav-dashboard']", title: "Navigation", description: "Use the sidebar to access History, Recycle Bin, Order Tracking, Settings, and more.", placement: "right" },
              ]
            : [
                { target: "[data-tour='stats-cards']", title: "Your Collection", description: "An overview of your seed collection — total items, quantity, and how many locations they span.", placement: "bottom" },
                { target: "[data-tour='toolbar']", title: "Search & Filter", description: "Quickly find seeds by name or ID. Sort columns by clicking their headers.", placement: "bottom" },
              ]
        }
      />
    </div>
  );
};

export default Dashboard;
