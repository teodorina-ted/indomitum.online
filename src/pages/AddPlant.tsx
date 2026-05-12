import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Leaf, ArrowLeft, QrCode, Camera, MapPin, FileText, Check, Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useNativeCamera } from "@/hooks/useNativeCamera";
import WebScanner from "@/components/WebScanner";

type Step = 1 | 2 | 3 | 4;

const steps = [
  { number: 1, title: "Scan ID", icon: QrCode },
  { number: 2, title: "Photo", icon: Camera },
  { number: 3, title: "Location", icon: MapPin },
  { number: 4, title: "Details", icon: FileText },
];

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 800;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.onerror = reject;
    img.src = url;
  });
};

const AddPlant = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isCollector } = useAuth();
  const { takePhoto, pickFromGallery } = useNativeCamera();

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const [formData, setFormData] = useState({
    id: "",
    name: "",
    image: null as File | null,
    imagePreview: "",
    location: { lat: "", lng: "", country: "", city: "", zip: "", street: "" },
    quantity: "",
    notes: "",
  });

  useEffect(() => {
    if (!authLoading && (!user || !isCollector)) navigate("/dashboard");
  }, [user, authLoading, isCollector, navigate]);

  const validateDuplicateId = async (id: string): Promise<boolean> => {
    try {
      const { data } = await api.checkSeedExists(id.trim());
      if (data) {
        toast.error("This ID is already registered in your collection!");
        return false;
      }
      return true;
    } catch { return true; }
  };

  const handleWebScan = async (result: string) => {
    const isValid = await validateDuplicateId(result);
    if (isValid) {
      setFormData(p => ({ ...p, id: result }));
      toast.success("Code scanned!");
      setCurrentStep(2); // Auto-advance on successful scan
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFormData(p => ({ ...p, image: file, imagePreview: URL.createObjectURL(file) }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`, { headers: { "Accept-Language": "en" } });
          const data = await res.json();
          const addr = data.address || {};
          setFormData(p => ({
            ...p,
            location: {
              ...p.location, lat, lng,
              street: [addr.road, addr.house_number].filter(Boolean).join(" ") || "",
              city: addr.city || addr.town || addr.village || "",
              zip: addr.postcode || "",
              country: addr.country || "",
            }
          }));
          toast.success("Location captured!");
        } catch { toast.error("Location captured, but address lookup failed."); }
        setGettingLocation(false);
      },
      () => { setGettingLocation(false); toast.error("Could not get location"); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);

    try {
      let finalImageUrl = "";
      if (formData.image) {
        const base64 = await compressImage(formData.image);
        // Upload logic depends on your api.ts, assuming it handles base64 or you have an upload endpoint
        const uploadRes = await api.uploadImage(base64); 
        finalImageUrl = uploadRes.url;
      }

      const { error } = await api.createSeed({
        seed_id: formData.id.trim(),
        name: formData.name,
        quantity: parseInt(formData.quantity),
        notes: formData.notes,
        image_url: finalImageUrl,
        location: formData.location
      });

      if (error) throw new Error(error);

      toast.success("Plant added successfully!");
      navigate("/buyer-dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to add plant");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    if (currentStep === 1) return formData.id.trim() !== "";
    if (currentStep === 4) return formData.name.trim() !== "" && formData.quantity.trim() !== "";
    return true;
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link to="/buyer-dashboard"><Button variant="ghost" size="icon"><ArrowLeft /></Button></Link>
          <h1 className="text-lg font-semibold">Add New Plant</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 border-b">
        <div className="flex items-center justify-between">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep >= step.number ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <step.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-1 uppercase tracking-wider">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {currentStep === 1 && (
          <div className="space-y-6">
            <WebScanner onScan={handleWebScan} />
            <div className="space-y-2">
              <label className="text-sm font-medium">Manual ID Entry</label>
              <Input placeholder="Enter Bag ID" value={formData.id} onChange={e => setFormData(p => ({ ...p, id: e.target.value }))} />
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="aspect-video bg-muted rounded-xl flex items-center justify-center overflow-hidden border-2 border-dashed">
              {formData.imagePreview ? (
                <img src={formData.imagePreview} className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-12 h-12 text-muted-foreground" />
              )}
            </div>
            <Input type="file" accept="image/*" onChange={handleImageUpload} />
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <Button onClick={handleGetLocation} className="w-full" disabled={gettingLocation}>
              {gettingLocation ? <Loader2 className="animate-spin mr-2" /> : <MapPin className="mr-2" />} Get Location
            </Button>
            <Input placeholder="City" value={formData.location.city} onChange={e => setFormData(p => ({ ...p, location: { ...p.location, city: e.target.value } }))} />
            <Input placeholder="Country" value={formData.location.country} onChange={e => setFormData(p => ({ ...p, location: { ...p.location, country: e.target.value } }))} />
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <Input placeholder="Plant Name" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
            <Input type="number" placeholder="Quantity" value={formData.quantity} onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} />
            <Textarea placeholder="Notes" value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} />
          </div>
        )}

        <div className="flex gap-3 mt-8">
          {currentStep > 1 && <Button variant="outline" className="flex-1" onClick={() => setCurrentStep(prev => (prev - 1) as Step)}>Back</Button>}
          {currentStep < 4 ? (
            <Button className="flex-1" disabled={!canProceed()} onClick={async () => {
              if (currentStep === 1 && !(await validateDuplicateId(formData.id))) return;
              setCurrentStep(prev => (prev + 1) as Step);
            }}>Continue</Button>
          ) : (
            <Button className="flex-1" disabled={isSubmitting} onClick={handleSubmit}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : "Submit Plant"}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default AddPlant;