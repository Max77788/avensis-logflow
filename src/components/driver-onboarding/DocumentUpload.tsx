import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DocumentUploadProps {
  label: string;
  documentType: "dl" | "medical_card" | "ssn";
  candidateId: string;
  complianceId: string;
  currentFileUrl?: string;
  isVerified?: boolean;
  onUploadComplete: (fileUrl: string) => void;
  onVerificationChange: (verified: boolean) => void;
}

export const DocumentUpload = ({
  label,
  documentType,
  candidateId,
  complianceId,
  currentFileUrl,
  isVerified = false,
  onUploadComplete,
  onVerificationChange,
}: DocumentUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      // Auto-upload immediately
      await handleUpload(selectedFile);
    }
  };

  const handleUpload = async (fileToUpload?: File) => {
    const uploadFile = fileToUpload || file;
    if (!uploadFile) return;

    setIsUploading(true);
    try {
      const fileExt = uploadFile.name.split(".").pop();
      const fileName = `${candidateId}/${documentType}_${Date.now()}.${fileExt}`;
      const filePath = `driver-documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("driver-documents")
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("driver-documents").getPublicUrl(filePath);

      onUploadComplete(publicUrl);
      setFile(null);
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">{label}</Label>
        {currentFileUrl && (
          <div className="flex items-center gap-2">
            <Checkbox
              id={`verify-${documentType}`}
              checked={isVerified}
              onCheckedChange={(checked) =>
                onVerificationChange(checked as boolean)
              }
            />
            <label
              htmlFor={`verify-${documentType}`}
              className="text-sm font-medium cursor-pointer"
            >
              Verified
            </label>
          </div>
        )}
      </div>

      {currentFileUrl && (
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <a
            href={currentFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            View Current Document
          </a>
        </div>
      )}

      <div className="flex gap-2">
        <Input
          type="file"
          onChange={handleFileChange}
          accept="image/*,.pdf"
          disabled={isUploading}
          className="flex-1"
        />
        {isUploading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </div>
        )}
      </div>
    </div>
  );
};
