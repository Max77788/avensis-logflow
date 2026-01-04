import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Camera, Image as ImageIcon, X, Mic, MicOff } from "lucide-react";
import { truckInspectionService, type DailyInspection, type InspectionItem } from "@/lib/truckInspectionService";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { SpeechToTextInput, type SpeechToTextInputRef } from "@/components/SpeechToTextInput";

interface TruckInspectionChecklistProps {
  truckId: string;
  driverId?: string;
  isShiftActive: boolean;
}

export const TruckInspectionChecklist = ({
  truckId,
  driverId,
  isShiftActive,
}: TruckInspectionChecklistProps) => {
  const [inspection, setInspection] = useState<DailyInspection | null>(null);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [notes, setNotes] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isListeningToSpeech, setIsListeningToSpeech] = useState(false);
  const [layoutOption, setLayoutOption] = useState<1 | 2>(2); // Default to Option 2 (recommended)
  const speechInputRef = useRef<SpeechToTextInputRef>(null);

  useEffect(() => {
    if (isShiftActive && truckId) {
      loadInspection();
    }
  }, [truckId, driverId, isShiftActive]);

  // Load notes and images when item changes
  useEffect(() => {
    if (inspection?.items && inspection.items[currentItemIndex]) {
      const item = inspection.items[currentItemIndex];
      setNotes(item.status?.notes || "");
      setUploadedImages(item.status?.image_urls || []);
    }
  }, [currentItemIndex, inspection]);

  const loadInspection = async () => {
    if (!truckId) return;

    setIsLoading(true);
    const result = await truckInspectionService.getOrCreateTodayInspection(
      truckId,
      driverId
    );

    if (result.success && result.data) {
      setInspection(result.data);
      // Find first unchecked item or start at 0
      const firstUncheckedIndex = result.data.items?.findIndex(
        (item) => !item.status
      );
      setCurrentItemIndex(firstUncheckedIndex >= 0 ? firstUncheckedIndex : 0);
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to load inspection",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleStatusChange = async (status: "working" | "not_working") => {
    if (!inspection?.items) return;

    const currentItem = inspection.items[currentItemIndex];
    if (!currentItem) return;

    // Toggle: if clicking the same status, clear it (set to null/unchecked)
    const currentStatus = currentItem?.status?.status;
    if (currentStatus === status) {
      // Clear the status by deleting the status record
      setIsUpdating(true);
      try {
        if (currentItem.status?.id) {
          const { error } = await supabase
            .from("truck_inspection_item_status")
            .delete()
            .eq("id", currentItem.status.id);

          if (error) throw error;
        }

        const updatedItems = inspection.items.map((item, idx) => {
          if (idx === currentItemIndex) {
            return {
              ...item,
              status: undefined,
            };
          }
          return item;
        });

        setInspection({
          ...inspection,
          items: updatedItems,
        });
        setNotes("");
        setUploadedImages([]);
        setIsUpdating(false);
      } catch (error: any) {
        console.error("Error clearing status:", error);
        toast({
          title: "Error",
          description: "Failed to clear status",
          variant: "destructive",
        });
        setIsUpdating(false);
      }
      return;
    }

    setIsUpdating(true);

    // Upload images if status is not_working
    let imageUrls = uploadedImages;
    if (status === "not_working" && uploadedImages.length > 0) {
      // Images already uploaded, just use existing URLs
    } else if (status === "working") {
      // Clear images if marking as working
      imageUrls = [];
    }

    const result = await truckInspectionService.updateItemStatus(
      inspection.id,
      currentItem.id,
      status,
      notes || undefined,
      imageUrls.length > 0 ? imageUrls : undefined
    );

    if (result.success) {
      // Update local state
      const updatedItems = inspection.items.map((item, idx) => {
        if (idx === currentItemIndex) {
          return {
            ...item,
            status: {
              id: item.status?.id || "",
              item_id: currentItem.id,
              status,
              notes: notes || undefined,
              image_urls: imageUrls,
              checked_at: new Date().toISOString(),
            },
          };
        }
        return item;
      });

      setInspection({
        ...inspection,
        items: updatedItems,
      });

      // Auto-advance to next item only if marked as "working"
      // Stay on current item if "not_working" to allow adding notes/photos
      if (status === "working") {
        if (currentItemIndex < inspection.items.length - 1) {
          setTimeout(() => {
            setCurrentItemIndex(currentItemIndex + 1);
          }, 500);
        } else {
          toast({
            title: "Inspection Complete!",
            description: "You have completed all inspection items for today.",
          });
        }
      }
    } else {
      toast({
        title: "Error",
        description: result.error || "Failed to update item",
        variant: "destructive",
      });
    }

    setIsUpdating(false);
  };

  const handleImageUpload = async (file: File) => {
    if (!inspection?.items || !inspection.items[currentItemIndex]) return;

    setIsUploadingImage(true);
    try {
      const timestamp = Date.now();
      const filename = `inspection-${inspection.id}-${inspection.items[currentItemIndex].id}-${timestamp}.${file.name.split('.').pop()}`;
      const filepath = `truck-inspections/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from("ticket-images") // Reuse existing bucket or create new one
        .upload(filepath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("ticket-images")
        .getPublicUrl(filepath);

      const newImageUrls = [...uploadedImages, publicData.publicUrl];
      setUploadedImages(newImageUrls);

      // Auto-save images
      if (inspection.items[currentItemIndex].status?.status === "not_working") {
        await truckInspectionService.updateItemStatus(
          inspection.id,
          inspection.items[currentItemIndex].id,
          "not_working",
          notes || undefined,
          newImageUrls
        );
      }

      toast({
        title: "Image Uploaded",
        description: "Photo has been saved",
      });
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
    
    // Auto-save if status is not_working
    if (inspection?.items && inspection.items[currentItemIndex]?.status?.status === "not_working") {
      truckInspectionService.updateItemStatus(
        inspection.id,
        inspection.items[currentItemIndex].id,
        "not_working",
        notes || undefined,
        newImages.length > 0 ? newImages : undefined
      );
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
    }
  };

  const handleCameraCapture = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment"; // Use rear camera on mobile
    input.onchange = (e: any) => {
      if (e.target.files && e.target.files[0]) {
        handleImageUpload(e.target.files[0]);
      }
    };
    input.click();
  };

  if (!isShiftActive) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            Please start your shift to begin the truck inspection
          </p>
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  if (!inspection || !inspection.items || inspection.items.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center py-4">
          No inspection items found
        </p>
      </Card>
    );
  }

  const currentItem = inspection.items[currentItemIndex];
  const totalItems = inspection.items.length;
  const currentStatus = currentItem?.status?.status || null;

  return (
    <Card className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Truck Inspection</h3>
          <span className="text-sm text-muted-foreground">
            {currentItemIndex + 1} of {totalItems}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${((currentItemIndex + 1) / totalItems) * 100}%` }}
          />
        </div>
      </div>

      {/* Current Item */}
      {currentItem && (
        <div className="space-y-6">
          {currentStatus === null ? (
            <>
              {/* Status selection buttons - shown when no status is set */}
              <div className="text-center py-4 mb-4">
                <h4 className="text-2xl font-bold mb-2">{currentItem.item_name}</h4>
                {currentItem.description && (
                  <p className="text-muted-foreground">{currentItem.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-24 text-lg border-2 border-green-300 hover:bg-green-50 dark:hover:bg-green-950"
                  onClick={() => handleStatusChange("working")}
                  disabled={isUpdating}
                >
                  <CheckCircle2 className="h-8 w-8 mr-2" />
                  <div className="flex flex-col items-center">
                    <span>Working</span>
                  </div>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-24 text-lg border-2 border-red-300 hover:bg-red-50 dark:hover:bg-red-950"
                  onClick={() => handleStatusChange("not_working")}
                  disabled={isUpdating}
                >
                  <XCircle className="h-8 w-8 mr-2" />
                  <div className="flex flex-col items-center">
                    <span>Not Working</span>
                  </div>
                </Button>
              </div>
            </>
          ) : currentStatus === "not_working" ? (
            <>
              {/* Layout Option Toggle */}
              <div className="flex items-center justify-end gap-2 mb-4 pb-2 border-b">
                <Label htmlFor="layout-toggle" className="text-sm text-muted-foreground">
                  Layout: Option {layoutOption}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLayoutOption(layoutOption === 1 ? 2 : 1)}
                  className="h-8 px-3"
                >
                  Switch to Option {layoutOption === 1 ? 2 : 1}
                </Button>
              </div>

              {layoutOption === 1 ? (
                /* Option 1 Layout */
                <>
                  <div className="flex gap-4 items-start">
                    {/* Large item box */}
                    <div className="flex-1 p-6 rounded-lg border-2 border-muted bg-muted/30">
                      <div className="text-center">
                        <h4 className="text-2xl font-bold mb-1">
                          {currentItem.item_name}
                        </h4>
                      </div>
                    </div>

                    {/* Status buttons on the right - vertically stacked */}
                    <div className="flex flex-col gap-3">
                      <Button
                        size="lg"
                        variant={currentStatus === "working" ? "default" : "outline"}
                        className={`h-20 w-24 text-base ${
                          currentStatus === "working"
                            ? "bg-green-600 hover:bg-green-700"
                            : "border-2 border-green-300 hover:bg-green-50 dark:hover:bg-green-950"
                        }`}
                        onClick={() => handleStatusChange("working")}
                        disabled={isUpdating}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <CheckCircle2 className="h-6 w-6" />
                          <span>Good</span>
                          <span className="text-xs">Green</span>
                        </div>
                      </Button>
                      <Button
                        size="lg"
                        variant={currentStatus === "not_working" ? "destructive" : "outline"}
                        className={`h-20 w-24 text-base ${
                          currentStatus !== "not_working"
                            ? "border-2 border-red-300 hover:bg-red-50 dark:hover:bg-red-950"
                            : ""
                        }`}
                        onClick={() => handleStatusChange("not_working")}
                        disabled={isUpdating}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <XCircle className="h-6 w-6" />
                          <span>Fix</span>
                          <span className="text-xs">Red</span>
                        </div>
                      </Button>
                    </div>
                  </div>

                  {/* Notes field below */}
                  <div className="space-y-2 mt-4">
                    <div className="flex gap-4">
                      <div className="flex-1 p-4 rounded-lg border-2 border-muted bg-muted/30">
                        <div className="text-center mb-2">
                          <Label className="text-sm font-medium">Notes</Label>
                        </div>
                        <SpeechToTextInput
                          ref={speechInputRef}
                          value={notes}
                          onChange={(value) => {
                            setNotes(value);
                            truckInspectionService.updateItemStatus(
                              inspection.id,
                              currentItem.id,
                              "not_working",
                              value || undefined,
                              uploadedImages.length > 0 ? uploadedImages : undefined
                            );
                          }}
                          onListeningChange={(isListening) => setIsListeningToSpeech(isListening)}
                          placeholder="Type your notes here..."
                          hideMicButton={true}
                        />
                      </div>

                      {/* Icons on the right of Notes */}
                      <div className="flex flex-col gap-3 justify-start pt-8">
                        <Button
                          type="button"
                          variant={isListeningToSpeech ? "destructive" : "outline"}
                          size="icon"
                          className="h-16 w-16"
                          onClick={() => {
                            if (isListeningToSpeech) {
                              speechInputRef.current?.stopListening();
                              setIsListeningToSpeech(false);
                            } else {
                              speechInputRef.current?.startListening();
                              setIsListeningToSpeech(true);
                            }
                            setTimeout(() => {
                              const notesTextarea = document.querySelector(
                                'textarea[placeholder*="notes"]'
                              ) as HTMLTextAreaElement;
                              if (notesTextarea) {
                                notesTextarea.focus();
                              }
                            }, 100);
                          }}
                        >
                          {isListeningToSpeech ? (
                            <MicOff className="h-6 w-6" />
                          ) : (
                            <Mic className="h-6 w-6" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-16 w-16"
                          onClick={handleCameraCapture}
                          disabled={isUploadingImage}
                        >
                          <Camera className="h-6 w-6" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Option 2 Layout (Recommended) */
                <>
                  <div className="flex gap-4 items-start">
                    {/* Large item box with status indicator */}
                    <div
                      className={`flex-1 p-6 rounded-lg border-2 cursor-pointer transition-colors ${
                        currentStatus === "not_working"
                          ? "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800"
                          : "bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800"
                      }`}
                      onClick={() => {
                        // Toggle between not_working and working
                        handleStatusChange("working");
                      }}
                    >
                      <div className="text-center">
                        <h4 className="text-2xl font-bold mb-1">
                          {currentItem.item_name}
                        </h4>
                        <div className="flex items-center justify-center gap-2 mt-2">
                          {currentStatus === "not_working" ? (
                            <>
                              <XCircle className="h-6 w-6 text-red-600" />
                              <span className="text-lg font-medium text-red-600">Red</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-6 w-6 text-green-600" />
                              <span className="text-lg font-medium text-green-600">Green</span>
                            </>
                          )}
                          <span className="text-sm text-muted-foreground">(click)</span>
                        </div>
                      </div>
                    </div>

                    {/* Icons on the right side - vertically stacked */}
                    <div className="flex flex-col gap-3">
                      {/* Microphone icon button */}
                      <Button
                        type="button"
                        variant={isListeningToSpeech ? "destructive" : "outline"}
                        size="icon"
                        className="h-16 w-16"
                        onClick={() => {
                          // Trigger speech recognition
                          if (isListeningToSpeech) {
                            speechInputRef.current?.stopListening();
                            setIsListeningToSpeech(false);
                          } else {
                            speechInputRef.current?.startListening();
                            setIsListeningToSpeech(true);
                          }
                          // Also focus the notes field
                          setTimeout(() => {
                            const notesTextarea = document.querySelector(
                              'textarea[placeholder*="microphone"]'
                            ) as HTMLTextAreaElement;
                            if (notesTextarea) {
                              notesTextarea.focus();
                            }
                          }, 100);
                        }}
                      >
                        {isListeningToSpeech ? (
                          <MicOff className="h-6 w-6" />
                        ) : (
                          <Mic className="h-6 w-6" />
                        )}
                      </Button>

                      {/* Camera icon button */}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-16 w-16"
                        onClick={handleCameraCapture}
                        disabled={isUploadingImage}
                      >
                        <Camera className="h-6 w-6" />
                      </Button>
                    </div>
                  </div>

                  {/* Notes field below */}
                  <div className="space-y-2 mt-4">
                    <div className="p-4 rounded-lg border-2 border-muted bg-muted/30">
                      <div className="text-sm text-muted-foreground mb-2 text-center">
                        Notes: Click the microphone icon to open this box and record.
                      </div>
                      <SpeechToTextInput
                        ref={speechInputRef}
                        value={notes}
                        onChange={(value) => {
                          setNotes(value);
                          // Auto-save notes
                          truckInspectionService.updateItemStatus(
                            inspection.id,
                            currentItem.id,
                            "not_working",
                            value || undefined,
                            uploadedImages.length > 0 ? uploadedImages : undefined
                          );
                        }}
                        onListeningChange={(isListening) => setIsListeningToSpeech(isListening)}
                        placeholder="Tap microphone icon to record or type here..."
                        hideMicButton={true}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Image grid - shared for both options */}
              <div className="mt-4 space-y-2">
                {isUploadingImage && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Uploading...</span>
                  </div>
                )}
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {uploadedImages.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Issue ${index + 1}`}
                          className="w-full h-32 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Alternative upload button below images - only show in Option 2 or when no images in Option 1 */}
                {layoutOption === 2 && uploadedImages.length === 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = handleFileSelect as any;
                      input.click();
                    }}
                    disabled={isUploadingImage}
                    className="w-full"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Upload Photo from Gallery
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Working status - clickable box to change */}
              <div
                className="p-6 rounded-lg border-2 bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800 cursor-pointer transition-colors hover:bg-green-100 dark:hover:bg-green-950/30"
                onClick={() => {
                  // Toggle to not_working
                  handleStatusChange("not_working");
                }}
              >
                <div className="text-center">
                  <h4 className="text-2xl font-bold mb-1">{currentItem.item_name}</h4>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                    <span className="text-lg font-medium text-green-600">Green</span>
                    <span className="text-sm text-muted-foreground">(click)</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Navigation */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentItemIndex(Math.max(0, currentItemIndex - 1))}
              disabled={currentItemIndex === 0 || isUpdating}
              className="flex-1"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setCurrentItemIndex(
                  Math.min(totalItems - 1, currentItemIndex + 1)
                )
              }
              disabled={currentItemIndex === totalItems - 1 || isUpdating}
              className="flex-1"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};