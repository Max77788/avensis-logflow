import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Upload,
  AlertCircle,
  CheckCircle,
  X,
  Image as ImageIcon,
  Camera,
  ChevronDown,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TicketImageUploadProps {
  onImageSelected?: (file: File) => void;
}

export const TicketImageUpload = ({
  onImageSelected,
}: TicketImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
    []
  );
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");

  // Enumerate available cameras
  const enumerateCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );
      setAvailableCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCameraId) {
        setSelectedCameraId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error("Failed to enumerate cameras:", err);
    }
  };

  // Get cameras when component mounts
  useEffect(() => {
    enumerateCameras();
  }, []);

  const startCamera = async () => {
    try {
      const constraints: MediaStreamConstraints = {
        video: selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode: "environment" },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to access camera";
      setError(errorMessage);
      toast({
        title: "Camera Access Denied",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);

        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "ticket-photo.jpg", {
              type: "image/jpeg",
            });
            setSelectedFile(file);
            setPreview(canvasRef.current!.toDataURL("image/jpeg"));
            stopCamera();
            onImageSelected?.(file);
            setError(null);
          }
        }, "image/jpeg");
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      toast({
        title: "Invalid File",
        description: "Please select an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setError(null);
    onImageSelected?.(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Show success message
    toast({
      title: "Image Selected",
      description: "Image will be stored with your ticket",
    });
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="overflow-hidden shadow-md">
      <div className="bg-blue-50 p-4">
        <div className="flex items-center gap-2 text-blue-600">
          <ImageIcon className="h-5 w-5" />
          <h3 className="font-semibold">Upload Ticket Image</h3>
        </div>
        <p className="mt-1 text-xs text-blue-600/70">
          Upload a photo of the ticket to auto-fill details
        </p>
      </div>

      <div className="space-y-4 p-4">
        {/* Camera or File Input */}
        {!showCamera ? (
          <div className="space-y-3">
            <div>
              <Label htmlFor="ticket-image" className="text-sm font-medium">
                Select Image
              </Label>
              <Input
                ref={fileInputRef}
                id="ticket-image"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="mt-2"
              />
            </div>

            {/* Camera Selection */}
            {availableCameras.length > 0 && (
              <div>
                <Label htmlFor="camera-select" className="text-sm font-medium">
                  Select Camera
                </Label>
                <Select
                  value={selectedCameraId}
                  onValueChange={setSelectedCameraId}
                >
                  <SelectTrigger id="camera-select" className="mt-2">
                    <SelectValue placeholder="Choose a camera" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCameras.map((camera) => (
                      <SelectItem key={camera.deviceId} value={camera.deviceId}>
                        {camera.label ||
                          `Camera ${availableCameras.indexOf(camera) + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Camera Button */}
            <Button
              type="button"
              onClick={startCamera}
              variant="outline"
              className="w-full"
            >
              <Camera className="mr-2 h-4 w-4" />
              Take Photo
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Camera View */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="h-64 w-full rounded border border-border bg-black object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Camera Controls */}
            <div className="flex gap-2">
              <Button type="button" onClick={capturePhoto} className="flex-1">
                <Camera className="mr-2 h-4 w-4" />
                Capture
              </Button>
              <Button
                type="button"
                onClick={stopCamera}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="relative">
            <img
              src={preview}
              alt="Ticket preview"
              className="h-48 w-full rounded border border-border object-cover"
            />
            <button
              onClick={handleClear}
              className="absolute right-2 top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex gap-2 rounded border border-red-200 bg-red-50 p-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Image Selected Success */}
        {selectedFile && (
          <div className="flex gap-2 rounded border border-green-200 bg-green-50 p-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-700">
              <p className="font-medium">Image selected</p>
              <p>{selectedFile.name}</p>
            </div>
          </div>
        )}

        {/* Clear Button */}
        {selectedFile && (
          <Button onClick={handleClear} variant="outline" className="w-full">
            Clear Image
          </Button>
        )}
      </div>
    </Card>
  );
};
