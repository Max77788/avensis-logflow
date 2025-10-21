import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScanLine, Camera, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export const QRScanner = ({ onScan, onClose }: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const startScanner = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();

        if (!devices || devices.length === 0) {
          throw new Error("No cameras found");
        }

        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        let cameraId = devices[0].id;

        const backCamera = devices.find(device =>
          device.label.toLowerCase().includes('back') ||
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );

        if (backCamera) {
          cameraId = backCamera.id;
        } else if (devices.length > 1) {
          cameraId = devices[devices.length - 1].id;
        }

        await scanner.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            console.log("QR Code detected:", decodedText);
            onScan(decodedText);
            stopScanner();
          },
          (errorMessage) => {
            if (!errorMessage.includes("NotFoundException")) {
              console.warn("QR Scan error:", errorMessage);
            }
          }
        );
        setIsScanning(true);
      } catch (err: any) {
        console.error("Failed to start scanner:", err);
        const errorMsg = err.message || "Camera access denied or unavailable";
        setError(errorMsg);
        toast({
          title: "Camera Error",
          description: "Please allow camera access in your browser settings and reload the page",
          variant: "destructive",
        });
      }
    };

    startScanner();

    return () => {
      stopScanner();
    };
  }, []);

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      setIsScanning(false);
    }
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="container mx-auto flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-lg overflow-hidden shadow-lg">
          <div className="relative bg-card p-6">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={handleClose}
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Camera className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Scan QR Code</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Position the QR code within the frame
              </p>
            </div>

            {error ? (
              <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-8 text-center">
                <p className="text-destructive">{error}</p>
                <Button onClick={handleClose} className="mt-4" variant="outline">
                  Close
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div
                  id="qr-reader"
                  className="overflow-hidden rounded-lg border-2 border-primary"
                />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <ScanLine className="h-8 w-8 animate-pulse text-primary" />
                </div>
              </div>
            )}

            <div className="mt-4 text-center">
              <Button onClick={handleClose} variant="secondary" className="w-full">
                Cancel Scan
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
