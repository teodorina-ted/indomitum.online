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


// Compress image to max 800px and ~500KB before base64
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

const isTouchDevice = () =>
  /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
  navigator.maxTouchPoints > 1;

const AddPlant = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isCollector } = useAuth();
  const { isNative, takePhoto, pickFromGallery } = useNativeCamera();

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
      if (data) { toast.error("This ID is already registered! Use a different one."); return false; }
      return true;
    } catch { return true; }
  };

  const handleWebScan = async (result: string) => {
    const isValid = await validateDuplicateId(result);
    if (isValid) {
      setFormData(p => ({ ...p, id: result }));
      toast.success("Code scanned!");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFormData(p => ({ ...p, image: file, imagePreview: URL.createObjectURL(file) }));
  };

  const handleNativePhoto = async () => {
    const result = await takePhoto();
    if (result.file && result.dataUrl) {
      setFormData(p => ({ ...p, image: result.file, imagePreview: result.dataUrl }));
    }
  };

  const handleNativeGallery = async () => {
    const result = await pickFromGallery();
    if (result.file && result.dataUrl) {
      setFormData(p => ({ ...p, image: result.file, imagePreview: result.dataUrl }));
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported"); return; }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setFormData(p => ({ ...p, location: { ...p.location, lat, lng } }));
        // Reverse geocode to fill address fields
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const addr = data.address || {};
          setFormData(p => ({
            ...p,
            location: {
              ...p.location,
              lat,
              lng,
              street: [addr.road, addr.house_number].filter(Boolean).join(" ") || "",
              city: addr.city || addr.town || addr.village || addr.municipality || "",
              zip: addr.postcode || "",
              country: addr.country || "",
            }
          }));
        } catch {}
        setGettingLocation(false);
        toast.success("Location captured!");
      },
      () => { setGettingLocation(false); toast.error("Could not get location"); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      // Double-check duplicate
      const { data: existing } = await api.checkSeedExists(formData.id.trim());
      if (existing) { toast.error("This ID already exists"); return; }

      // Compress and convert image to base64
      let imageUrl: string | null = null;
      if (formData.image) {
        imageUrl = await compressImage(formData.image);
      }

      const { error } = await api.createSeed({
        seed_id: formData.id,
        name: formData.name,
        image_url: imageUrl,
        latitude: formData.location.lat ? parseFloat(formData.location.lat) : null,
        longitude: formData.location.lng ? parseFloat(formData.location.lng) : null,
        country: formData.location.country || null,
        city: formData.location.city || null,
        zip_code: formData.location.zip || null,
        street: formData.location.street || null,
        quantity: parseInt(formData.quantity) || 0,
        notes: formData.notes || null,
      });

      if (error) { toast.error(`Failed to add plant: ${error}`); return; }
      toast.success("Plant added!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    if (currentStep === 1) return formData.id.trim() !== "";
    if (currentStep === 4) return formData.name.trim() !== "" && formData.quantity.trim() !== "";
    return true;
  };

  if (authLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Leaf className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold">Add New Plant</h1>
          </div>
        </div>
      </header>

      <div className="border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStep >= step.number ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {currentStep > step.number ? <Check className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                  </div>
                  <span className="text-xs mt-1 font-medium">{step.title}</span>
                </div>
                {index < steps.length - 1 && <div className="h-0.5 w-12 sm:w-20 mx-2 bg-border" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Scan Bag ID</h2>
              <p className="text-muted-foreground">Scan a QR code or enter the ID manually.</p>
            </div>
            {!formData.id && <WebScanner onScan={handleWebScan} />}
            {formData.id ? (
              <div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">ID Scanned</p>
                  <p className="font-mono text-sm text-foreground">{formData.id}</p>
                </div>
                <button onClick={() => setFormData(p => ({ ...p, id: "" }))} className="text-muted-foreground hover:text-foreground p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or enter manually</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Bag ID</label>
                  <Input placeholder="e.g., SEED-ABC123" value={formData.id}
                    onChange={e => setFormData(p => ({ ...p, id: e.target.value }))} />
                </div>
              </>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Plant Photo</h2>
              <p className="text-muted-foreground">Add a photo of your plant (optional).</p>
            </div>
            {formData.imagePreview && (
              <img src={formData.imagePreview} alt="Preview" className="w-full rounded-2xl max-h-64 object-cover" />
            )}
            <div className="flex gap-3">
              {isTouchDevice() && isNative ? (
                <>
                  <Button variant="outline" className="flex-1" onClick={handleNativePhoto}>
                    <Camera className="w-4 h-4 mr-2" /> Take Photo
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={handleNativeGallery}>
                    <Upload className="w-4 h-4 mr-2" /> Gallery
                  </Button>
                </>
              ) : isTouchDevice() ? (
                <label className="block w-full">
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                  <Button variant="outline" className="w-full" asChild>
                    <span><Camera className="w-4 h-4 mr-2" /> Take Photo</span>
                  </Button>
                </label>
              ) : null}
              <label className="block flex-1">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <Button variant="outline" className="w-full" asChild>
                  <span><Upload className="w-4 h-4 mr-2" /> Upload Image</span>
                </Button>
              </label>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Location</h2>
              <p className="text-muted-foreground">Capture where the plant was collected.</p>
            </div>
            <Button onClick={handleGetLocation} className="w-full" disabled={gettingLocation}>
              {gettingLocation ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Getting Location...</> : <><MapPin className="w-4 h-4 mr-2" /> Get Current Location</>}
            </Button>
            {formData.location.lat && (
              <p className="text-sm text-center text-muted-foreground">
                📍 {formData.location.lat}, {formData.location.lng}
              </p>
            )}
            <Input placeholder="Street address" value={formData.location.street}
              onChange={e => setFormData(p => ({ ...p, location: { ...p.location, street: e.target.value } }))} />
            <div className="flex gap-3">
              <Input placeholder="City" value={formData.location.city}
                onChange={e => setFormData(p => ({ ...p, location: { ...p.location, city: e.target.value } }))} />
              <Input placeholder="ZIP" value={formData.location.zip}
                onChange={e => setFormData(p => ({ ...p, location: { ...p.location, zip: e.target.value } }))} />
            </div>
            <Input placeholder="Country" value={formData.location.country}
              onChange={e => setFormData(p => ({ ...p, location: { ...p.location, country: e.target.value } }))} />
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Final Details</h2>
              <p className="text-muted-foreground">Almost done!</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Plant Name *</label>
              <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Quantity *</label>
              <Input type="number" min="1" value={formData.quantity}
                onChange={e => setFormData(p => ({ ...p, quantity: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Textarea rows={4} value={formData.notes}
                onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} />
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-8">
          {currentStep > 1 && (
            <Button variant="outline" className="flex-1"
              onClick={() => setCurrentStep((currentStep - 1) as Step)}>Back</Button>
          )}
          {currentStep < 4 ? (
            <Button className="flex-1" disabled={!canProceed()}
              onClick={async () => {
                if (currentStep === 1) {
                  const valid = await validateDuplicateId(formData.id);
                  if (!valid) return;
                }
                setCurrentStep((currentStep + 1) as Step);
              }}>
              Continue
            </Button>
          ) : (
            <Button className="flex-1" disabled={!canProceed() || isSubmitting} onClick={handleSubmit}>
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : <><Check className="w-4 h-4 mr-2" /> Submit Plant</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddPlant;
