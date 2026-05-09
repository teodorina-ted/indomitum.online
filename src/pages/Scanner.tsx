import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Camera, StopCircle, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const Scanner = () => {
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanner = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      // Create scanner instance
      scannerRef.current = new Html5Qrcode("scanner-container", {
        verbose: false,
        formatsToSupport: undefined, // Support all formats
      });

      // Request camera and start scanning
      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          // On successful scan
          setScanResult(decodedText);
          toast.success("Code scanned successfully!");
          stopScanner();
        },
        () => {
          // QR code not detected - this is called frequently, no action needed
        }
      );

      setIsScanning(true);

      // iOS Safari fix: ensure video has playsinline and muted
      const videoElement = containerRef.current?.querySelector("video");
      if (videoElement) {
        videoElement.setAttribute("playsinline", "true");
        videoElement.setAttribute("muted", "true");
        videoElement.playsInline = true;
        videoElement.muted = true;
      }
    } catch (error) {
      console.error("Scanner error:", error);
      if (error instanceof Error) {
        if (error.message.includes("Permission")) {
          toast.error("Camera permission denied. Please allow camera access.");
        } else {
          toast.error(`Failed to start scanner: ${error.message}`);
        }
      }
    }
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
    }
    setIsScanning(false);
  }, []);

  const copyToClipboard = async () => {
    if (scanResult) {
      await navigator.clipboard.writeText(scanResult);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setCopied(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              stopScanner();
              navigate(-1);
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-lg">Scanner</h1>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Scanner Area */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {isScanning ? "Point at a QR/Barcode" : "Barcode & QR Scanner"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Scanner Container */}
            <div
              id="scanner-container"
              ref={containerRef}
              className="w-full aspect-square max-w-sm mx-auto rounded-lg overflow-hidden bg-muted"
              style={{ minHeight: isScanning ? "300px" : "0" }}
            />

            {/* Controls */}
            <div className="flex justify-center gap-4">
              {!isScanning && !scanResult && (
                <Button onClick={startScanner} size="lg" className="gap-2">
                  <Camera className="h-5 w-5" />
                  Start Scanner
                </Button>
              )}

              {isScanning && (
                <Button
                  onClick={stopScanner}
                  variant="destructive"
                  size="lg"
                  className="gap-2"
                >
                  <StopCircle className="h-5 w-5" />
                  Stop Scanner
                </Button>
              )}

              {scanResult && !isScanning && (
                <Button onClick={resetScanner} size="lg" className="gap-2">
                  <Camera className="h-5 w-5" />
                  Scan Again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Result Display */}
        {scanResult && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-primary">
                Scan Result
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={scanResult}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* If it's a URL, show open button */}
              {scanResult.startsWith("http") && (() => {
                const isAllowedUrl = (url: string) => {
                  try {
                    const parsed = new URL(url);
                    const allowedDomains = [
                      'indomitum.lovable.app',
                      window.location.hostname,
                    ];
                    return allowedDomains.some(domain =>
                      parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
                    );
                  } catch {
                    return false;
                  }
                };
                const allowed = isAllowedUrl(scanResult);
                return (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      if (allowed) {
                        window.open(scanResult, "_blank");
                      } else if (window.confirm(`This link goes to an external site:\n${scanResult}\n\nContinue?`)) {
                        window.open(scanResult, "_blank");
                      }
                    }}
                  >
                    {allowed ? "Open Link" : "Open External Link ⚠️"}
                  </Button>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Tap "Start Scanner" to request camera access</li>
              <li>• Point your camera at any QR code or barcode</li>
              <li>• Supports QR codes, EAN, UPC, Code 128, and more</li>
              <li>• Works best in good lighting conditions</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Scanner;
