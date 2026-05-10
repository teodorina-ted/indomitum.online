import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Leaf,
  ArrowLeft,
  QrCode,
  Camera,
  MapPin,
  FileText,
  Check,
  Upload,
  X,
  Loader2,
  ScanLine
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useNativeCamera } from "@/hooks/useNativeCamera";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import WebScanner from "@/components/WebScanner";

type Step = 1 | 2 | 3 | 4;

const steps = [
  { number: 1, title: "Scan ID", icon: QrCode },
  { number: 2, title: "Photo", icon: Camera },
  { number: 3, title: "Location", icon: MapPin },
  { number: 4, title: "Details", icon: FileText }
];

const AddPlant = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading, isCollector } = useAuth();
  const { isNative, takePhoto, pickFromGallery } = useNativeCamera();
  const { isNative: canScan, scanBarcode } = useBarcodeScanner();
  const [isScanning, setIsScanning] = useState(false);
  const [showWebScanner, setShowWebScanner] = useState(false);
  
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    image: null as File | null,
    imagePreview: "",
    location: {
      lat: "",
      lng: "",
      country: "",
      city: "",
      zip: "",
      street: ""
    },
    quantity: "",
    notes: ""
  });

  // Redirect if not collector
  useEffect(() => {
    if (!authLoading && (!user || !isCollector)) {
      navigate("/dashboard");
    }
  }, [user, authLoading, isCollector, navigate]);

  const validateDuplicateId = async (scannedId: string): Promise<boolean> => {
    try {
      const { data: existingSeed } = await api.checkSeedExists(scannedId.trim());

      if (existingSeed) {
        toast.error("This ID is already registered! Please use a different ID.");
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error checking duplicate:", error);
      return true; // Allow to proceed on error, will check again on submit
    }
  };

  const handleScanQR = async () => {
    if (canScan) {
      // Native scanning
      setIsScanning(true);
      try {
        const scannedValue = await scanBarcode();
        if (scannedValue) {
          const isValid = await validateDuplicateId(scannedValue);
          if (isValid) {
            setFormData({ ...formData, id: scannedValue });
            toast.success("Code scanned!");
          }
        }
      } finally {
        setIsScanning(false);
      }
    } else {
      // Web scanning - show the web scanner
      setShowWebScanner(true);
    }
  };

  const handleWebScan = async (result: string) => {
    const isValid = await validateDuplicateId(result);
    if (isValid) {
      setFormData(prev => ({ ...prev, id: result }));
      toast.success("Code scanned!");
      setTimeout(() => setCurrentStep(2), 500);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({
        ...formData,
        image: file,
        imagePreview: URL.createObjectURL(file)
      });
    }
  };

  const handleNativePhoto = async () => {
    const result = await takePhoto();
    if (result.file && result.dataUrl) {
      setFormData({
        ...formData,
        image: result.file,
        imagePreview: result.dataUrl
      });
      toast.success("Photo captured!");
    }
  };

  const handleNativeGallery = async () => {
    const result = await pickFromGallery();
    if (result.file && result.dataUrl) {
      setFormData({
        ...formData,
        image: result.file,
        imagePreview: result.dataUrl
      });
      toast.success("Photo selected!");
    }
  };

  const [gettingLocation, setGettingLocation] = useState(false);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        const latFixed = lat.toFixed(6);
        const lngFixed = lng.toFixed(6);

        // Save coordinates first
        setFormData((prev) => ({
          ...prev,
          location: {
            ...prev.location,
            lat: latFixed,
            lng: lngFixed,
          },
        }));

        // Reverse-geocode to keep address in sync with GPS
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
              String(lat)
            )}&lon=${encodeURIComponent(String(lng))}`,
            {
              headers: {
                // Helps avoid being blocked by some deployments
                "Accept": "application/json",
              },
            }
          );

          if (res.ok) {
            const json = await res.json();
            const addr = json?.address || {};

            const city = addr.city || addr.town || addr.village || addr.hamlet || "";
            const zip = addr.postcode || "";
            const country = addr.country || "";
            const streetParts = [addr.road, addr.house_number].filter(Boolean);
            const street = streetParts.join(" ");

            setFormData((prev) => ({
              ...prev,
              location: {
                ...prev.location,
                lat: latFixed,
                lng: lngFixed,
                city: prev.location.city || city,
                zip: prev.location.zip || zip,
                country: prev.location.country || country,
                street: prev.location.street || street,
              },
            }));
          }
        } catch (e) {
          // Non-blocking: GPS coordinates still saved
          console.warn("Reverse geocode failed", e);
        } finally {
          setGettingLocation(false);
          toast.success("Location captured!");
        }
      },
      (error) => {
        setGettingLocation(false);
        let message = "Could not get location.";
        if (error.code === error.PERMISSION_DENIED) {
          message = "Location permission denied. Please enable GPS in your browser settings.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Location unavailable. Please try again.";
        } else if (error.code === error.TIMEOUT) {
          message = "Location request timed out. Please try again.";
        }
        toast.error(message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    setIsSubmitting(true);

    try {
      // Check if seed_id already exists
      const { data: existingSeed } = await api.checkSeedExists(formData.id.trim());

      if (existingSeed) {
        toast.error("This ID is already registered! Please use a different ID.");
        setIsSubmitting(false);
        return;
      }

      let imageUrl = null;

      // Upload image if exists
      if (formData.image) {
        const { url, error: uploadError } = await api.uploadImage(formData.image, formData.id);
        if (uploadError) {
          console.error("Upload error:", uploadError);
        } else {
          imageUrl = url;
        }
      }

      // Insert seed
      const { error, data } = await api.createSeed({
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

      if (error) {
        toast.error("Failed to add plant: " + error);
        return;
      }

      toast.success("Plant added successfully!");
      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.id.trim() !== "";
      case 2:
        return true; // Photo optional
      case 3:
        return true; // Location optional but encouraged
      case 4:
        return formData.name.trim() !== "" && formData.quantity !== "";
      default:
        return false;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border px-4 lg:px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Leaf className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold text-foreground">Add New Plant</h1>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all
                    ${currentStep >= step.number 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                    }
                  `}>
                    {currentStep > step.number ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`
                    text-xs mt-1 font-medium
                    ${currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'}
                  `}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`
                    h-0.5 w-12 sm:w-20 mx-2
                    ${currentStep > step.number ? 'bg-primary' : 'bg-border'}
                  `} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Step 1: Scan ID */}
        {currentStep === 1 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-foreground mb-2">Scan Bag ID</h2>
            <p className="text-muted-foreground mb-6">
              Point your camera at a QR code or barcode, or enter the ID manually.
            </p>

            <div className="space-y-6">
              {/* Scanner always visible, auto-starts */}
              <WebScanner onScan={handleWebScan} autoStart />

              {/* Show scanned result */}
              {formData.id && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-medium text-primary">Scanned: {formData.id}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-6 px-2"
                    onClick={() => setFormData({ ...formData, id: "" })}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-4 text-sm text-muted-foreground">or enter manually</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Bag ID
                </label>
                <Input
                  placeholder="e.g., SEED-ABC123"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Photo */}
        {currentStep === 2 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-foreground mb-2">Capture Photo</h2>
            <p className="text-muted-foreground mb-8">
              Take a photo of the plant or upload from your gallery.
            </p>

            <div className="space-y-6">
              {formData.imagePreview ? (
                <div className="relative">
                  <img
                    src={formData.imagePreview}
                    alt="Plant preview"
                    className="w-full aspect-square object-cover rounded-2xl"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-4 right-4"
                    onClick={() => setFormData({ ...formData, image: null, imagePreview: "" })}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="block">
                  <div className="aspect-square rounded-2xl border-2 border-dashed border-border bg-muted/30 flex flex-col items-center justify-center p-8 cursor-pointer hover:border-primary/50 transition-colors">
                    <Camera className="w-16 h-16 text-muted-foreground mb-4" />
                    <span className="text-lg font-medium text-foreground mb-2">Add Photo</span>
                    <span className="text-sm text-muted-foreground">Click to capture or upload</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              )}

              <div className="flex gap-3">
                {isNative ? (
                  <>
                    <Button variant="outline" size="lg" className="flex-1" onClick={handleNativePhoto}>
                      <Camera className="w-4 h-4 mr-2" />
                      Take Photo
                    </Button>
                    <Button variant="outline" size="lg" className="flex-1" onClick={handleNativeGallery}>
                      <Upload className="w-4 h-4 mr-2" />
                      Gallery
                    </Button>
                  </>
                ) : (
                  <>
                    <label className="flex-1">
                      <Button variant="outline" size="lg" className="w-full" asChild>
                        <span>
                          <Camera className="w-4 h-4 mr-2" />
                          Take Photo
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                    <label className="flex-1">
                      <Button variant="outline" size="lg" className="w-full" asChild>
                        <span>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </label>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Location */}
        {currentStep === 3 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-foreground mb-2">Capture Location</h2>
            <p className="text-muted-foreground mb-8">
              Get GPS coordinates automatically or enter the address details.
            </p>

            <div className="space-y-6">
              <Button onClick={handleGetLocation} size="lg" className="w-full" disabled={gettingLocation}>
                {gettingLocation ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Getting Location...
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 mr-2" />
                    Get Current Location
                  </>
                )}
              </Button>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Latitude</label>
                  <Input
                    placeholder="43.7696"
                    value={formData.location.lat}
                    onChange={(e) => setFormData({
                      ...formData,
                      location: { ...formData.location, lat: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Longitude</label>
                  <Input
                    placeholder="11.2558"
                    value={formData.location.lng}
                    onChange={(e) => setFormData({
                      ...formData,
                      location: { ...formData.location, lng: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Country</label>
                  <Input
                    placeholder="Italy"
                    value={formData.location.country}
                    onChange={(e) => setFormData({
                      ...formData,
                      location: { ...formData.location, country: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">City</label>
                  <Input
                    placeholder="Florence"
                    value={formData.location.city}
                    onChange={(e) => setFormData({
                      ...formData,
                      location: { ...formData.location, city: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">ZIP Code</label>
                  <Input
                    placeholder="50123"
                    value={formData.location.zip}
                    onChange={(e) => setFormData({
                      ...formData,
                      location: { ...formData.location, zip: e.target.value }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Street</label>
                  <Input
                    placeholder="Via Roma 1"
                    value={formData.location.street}
                    onChange={(e) => setFormData({
                      ...formData,
                      location: { ...formData.location, street: e.target.value }
                    })}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Details */}
        {currentStep === 4 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold text-foreground mb-2">Final Details</h2>
            <p className="text-muted-foreground mb-8">
              Add the plant name, quantity, and any additional notes.
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Plant Name *
                </label>
                <Input
                  placeholder="e.g., Lavandula angustifolia"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Quantity *
                </label>
                <Input
                  type="number"
                  placeholder="150"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Notes (optional)
                </label>
                <Textarea
                  placeholder="Add any additional observations..."
                  rows={4}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              {/* Summary */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <h3 className="font-medium text-foreground">Summary</h3>

                <dl className="space-y-2 text-sm">
                  <div className="grid grid-cols-[110px_1fr] gap-3">
                    <dt className="text-muted-foreground">ID</dt>
                    <dd className="text-foreground font-mono break-all">{formData.id}</dd>
                  </div>

                  <div className="grid grid-cols-[110px_1fr] gap-3">
                    <dt className="text-muted-foreground">Plant</dt>
                    <dd className="text-foreground">{formData.name || "—"}</dd>
                  </div>

                  <div className="grid grid-cols-[110px_1fr] gap-3">
                    <dt className="text-muted-foreground">Quantity</dt>
                    <dd className="text-foreground">{formData.quantity || "—"}</dd>
                  </div>

                  <div className="grid grid-cols-[110px_1fr] gap-3">
                    <dt className="text-muted-foreground">Coordinates</dt>
                    <dd className="text-foreground font-mono break-all">
                      {formData.location.lat && formData.location.lng
                        ? `${formData.location.lat}, ${formData.location.lng}`
                        : "—"}
                    </dd>
                  </div>

                  <div className="grid grid-cols-[110px_1fr] gap-3">
                    <dt className="text-muted-foreground">Street</dt>
                    <dd className="text-foreground break-words">{formData.location.street || "—"}</dd>
                  </div>

                  <div className="grid grid-cols-[110px_1fr] gap-3">
                    <dt className="text-muted-foreground">City</dt>
                    <dd className="text-foreground break-words">{formData.location.city || "—"}</dd>
                  </div>

                  <div className="grid grid-cols-[110px_1fr] gap-3">
                    <dt className="text-muted-foreground">ZIP</dt>
                    <dd className="text-foreground break-words">{formData.location.zip || "—"}</dd>
                  </div>

                  <div className="grid grid-cols-[110px_1fr] gap-3">
                    <dt className="text-muted-foreground">Country</dt>
                    <dd className="text-foreground break-words">{formData.location.country || "—"}</dd>
                  </div>

                  <div className="grid grid-cols-[110px_1fr] gap-3">
                    <dt className="text-muted-foreground">Added by</dt>
                    <dd className="text-foreground break-words">{user?.email || "—"}</dd>
                  </div>

                  <div className="grid grid-cols-[110px_1fr] gap-3">
                    <dt className="text-muted-foreground">Date/Time</dt>
                    <dd className="text-foreground">{new Date().toLocaleString()}</dd>
                  </div>
                </dl>

                {formData.imagePreview && (
                  <div className="pt-2">
                    <span className="text-muted-foreground text-sm">Photo:</span>
                    <img
                      src={formData.imagePreview}
                      alt="Preview"
                      className="w-20 h-20 rounded-lg object-cover mt-1"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {currentStep > 1 && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setCurrentStep((currentStep - 1) as Step)}
              className="flex-1"
            >
              Back
            </Button>
          )}
          {currentStep < 4 ? (
            <Button
              size="lg"
              onClick={() => setCurrentStep((currentStep + 1) as Step)}
              disabled={!canProceed()}
              className="flex-1"
            >
              Continue
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Submit Plant
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddPlant;
