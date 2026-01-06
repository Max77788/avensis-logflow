import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { transcribeAudio } from "@/lib/speechToTextService";

interface SpeechToTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  hideMicButton?: boolean;
  onListeningChange?: (isListening: boolean) => void;
}

export interface SpeechToTextInputRef {
  startListening: () => void;
  stopListening: () => void;
  isListening: boolean;
}

// Detect mobile device
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768;
};

// Detect iOS
const isIOS = () => {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
};

export const SpeechToTextInput = forwardRef<SpeechToTextInputRef, SpeechToTextInputProps>(({
  value,
  onChange,
  placeholder = "Type here or tap microphone to speak...",
  disabled = false,
  hideMicButton = false,
  onListeningChange,
}, ref) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true); // Always supported now (we use MediaRecorder on mobile)
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  // Desktop: Web Speech API
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  
  // Mobile: MediaRecorder
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  const baseValueRef = useRef<string>("");
  const accumulatedFinalRef = useRef<string>("");
  const isMobile = useRef(isMobileDevice());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousScrollTopRef = useRef<number>(0);

  // TEMPORARY: Use Google Cloud Speech-to-Text for desktop too (for troubleshooting)
  // Set to false to re-enable Web Speech API on desktop
  const USE_GOOGLE_CLOUD_FOR_DESKTOP = true;

  // Check if Web Speech API is available (for desktop)
  // Temporarily disabled when USE_GOOGLE_CLOUD_FOR_DESKTOP is true
  const webSpeechSupported = !USE_GOOGLE_CLOUD_FOR_DESKTOP && !isMobile.current && 
    (typeof (window as any).SpeechRecognition !== 'undefined' || 
     typeof (window as any).webkitSpeechRecognition !== 'undefined');

  // Preserve scroll position when value changes
  useEffect(() => {
    if (textareaRef.current) {
      previousScrollTopRef.current = textareaRef.current.scrollTop;
    }
  }, [value]);

  useEffect(() => {
    if (textareaRef.current && previousScrollTopRef.current > 0) {
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.scrollTop = previousScrollTopRef.current;
        }
      });
    }
  }, [value]);

  // Setup Web Speech API for desktop
  useEffect(() => {
    if (!webSpeechSupported || isMobile.current) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    let finalTranscript = "";
    let interimTranscript = "";

    recognition.onresult = (event: any) => {
      interimTranscript = "";
      finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript || "";

        if (result.isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      accumulatedFinalRef.current += finalTranscript;

      const combinedValue = baseValueRef.current + 
        (baseValueRef.current && accumulatedFinalRef.current ? " " : "") + 
        accumulatedFinalRef.current + 
        (interimTranscript ? " " + interimTranscript : "");
      
      onChange(combinedValue.trim());
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        setErrorMessage("Microphone permission denied. Please allow microphone access.");
      }
      isListeningRef.current = false;
      setIsListening(false);
      onListeningChange?.(false);
    };

    recognition.onend = () => {
      if (isListeningRef.current) {
        // Auto-restart on desktop
        setTimeout(() => {
          if (isListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              isListeningRef.current = false;
              setIsListening(false);
              onListeningChange?.(false);
            }
          }
        }, 100);
      } else {
        setIsListening(false);
        onListeningChange?.(false);
      }
    };

    recognition.onstart = () => {
      isListeningRef.current = true;
      setIsListening(true);
      onListeningChange?.(true);
      setErrorMessage(null);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, [webSpeechSupported, onChange, onListeningChange]);

  // Cleanup MediaRecorder on unmount
  useEffect(() => {
    return () => {
      // Stop MediaRecorder if still recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.error("Error stopping MediaRecorder on cleanup:", e);
        }
      }
      
      // Stop all audio tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Start listening - different for mobile vs desktop
  const startListening = async () => {
    if (disabled || isListening) return;

    baseValueRef.current = value;
    accumulatedFinalRef.current = "";
    setErrorMessage(null);

    // Use MediaRecorder approach for both mobile and desktop (when USE_GOOGLE_CLOUD_FOR_DESKTOP is true)
    if (isMobile.current || USE_GOOGLE_CLOUD_FOR_DESKTOP) {
      // Mobile: Use MediaRecorder
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });

        streamRef.current = stream;
        audioChunksRef.current = [];

        // Determine best MIME type for recording
        // Prefer WEBM_OPUS as it's well-supported by Google Speech API
        let mimeType: string;
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else {
          // Fallback to default
          mimeType = "audio/webm";
        }

        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          if (audioChunksRef.current.length === 0) {
            setIsListening(false);
            onListeningChange?.(false);
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => track.stop());
              streamRef.current = null;
            }
            return;
          }

          setIsTranscribing(true);
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          const result = await transcribeAudio(audioBlob, mimeType);
          
          setIsTranscribing(false);
          
          if (result.success && result.transcript) {
            const newText = result.transcript.trim();
            if (newText) {
              const updatedValue = baseValueRef.current + 
                (baseValueRef.current ? " " : "") + 
                newText;
              onChange(updatedValue);
              accumulatedFinalRef.current += newText + " ";
            }
          } else {
            setErrorMessage(result.error || "Failed to transcribe audio");
          }

          audioChunksRef.current = [];
          setIsListening(false);
          onListeningChange?.(false);

          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }
        };

        mediaRecorder.start();
        setIsListening(true);
        onListeningChange?.(true);
      } catch (error: any) {
        console.error("Error starting recording:", error);
        setIsListening(false);
        onListeningChange?.(false);
        
        if (error.name === "NotAllowedError") {
          setErrorMessage("Microphone permission denied. Please allow microphone access in browser settings.");
        } else {
          setErrorMessage("Failed to access microphone: " + (error.message || "Unknown error"));
        }
      }
    } else {
      // Desktop: Use Web Speech API (when Web Speech API is enabled)
      if (recognitionRef.current) {
        try {
          isListeningRef.current = true;
          recognitionRef.current.start();
        } catch (error: any) {
          console.error("Error starting recognition:", error);
          isListeningRef.current = false;
          setIsListening(false);
          onListeningChange?.(false);
          setErrorMessage("Failed to start voice input. Please try again.");
        }
      }
    }
  };

  const stopListening = () => {
    // Use MediaRecorder approach for both mobile and desktop (when USE_GOOGLE_CLOUD_FOR_DESKTOP is true)
    if (isMobile.current || USE_GOOGLE_CLOUD_FOR_DESKTOP) {
      // Mobile or Desktop with Google Cloud: Stop MediaRecorder
      if (mediaRecorderRef.current) {
        // Check MediaRecorder state before stopping
        if (mediaRecorderRef.current.state === "recording") {
          try {
            mediaRecorderRef.current.stop();
          } catch (e) {
            console.error("Error stopping MediaRecorder:", e);
          }
        } else if (mediaRecorderRef.current.state === "inactive") {
          // Already stopped, just clean up
          setIsListening(false);
          onListeningChange?.(false);
        }
      }
      
      // Stop all audio tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        streamRef.current = null;
      }
      
      // Force update listening state
      setIsListening(false);
      onListeningChange?.(false);
    } else {
      // Desktop: Stop Web Speech API (when Web Speech API is enabled)
      if (recognitionRef.current) {
        isListeningRef.current = false;
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Error stopping Web Speech API:", e);
        }
      }
      setIsListening(false);
      onListeningChange?.(false);
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  useImperativeHandle(ref, () => ({
    startListening,
    stopListening,
    isListening,
  }));

  return (
    <div className="space-y-2">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            const scrollTop = e.target.scrollTop;
            onChange(e.target.value);
            requestAnimationFrame(() => {
              if (textareaRef.current) {
                textareaRef.current.scrollTop = scrollTop;
              }
            });
          }}
          onFocus={(e) => {
            e.target.scrollIntoView({ behavior: 'auto', block: 'nearest' });
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 min-h-[100px] sm:min-h-[120px] text-sm sm:text-base pr-12 sm:pr-14"
        />
        {isSupported && !hideMicButton && (
          <Button
            type="button"
            variant={isListening ? "destructive" : "ghost"}
            size="icon"
            onClick={handleToggle}
            onTouchStart={(e) => {
              if (!isListening && !disabled) {
                e.preventDefault();
              }
            }}
            disabled={disabled || isTranscribing}
            className="absolute bottom-2 right-2 h-10 w-10 sm:h-12 sm:w-12 rounded-full shadow-md hover:shadow-lg transition-all touch-manipulation"
            title={isListening ? "Stop recording" : "Start voice input"}
          >
            {isTranscribing ? (
              <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
            ) : isListening ? (
              <MicOff className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse" />
            ) : (
              <Mic className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </Button>
        )}
      </div>
      {isListening && !isTranscribing && (
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="font-medium">
            {(isMobile.current || USE_GOOGLE_CLOUD_FOR_DESKTOP)
              ? "Recording... Tap mic again to stop and transcribe." 
              : "Recording... Speak now. Tap mic again to stop."}
          </span>
        </div>
      )}
      {isTranscribing && (
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="font-medium">Transcribing audio...</span>
        </div>
      )}
      {errorMessage && (
        <div className="text-xs sm:text-sm text-destructive bg-destructive/10 p-2 rounded-md">
          {errorMessage}
        </div>
      )}
    </div>
  );
});

SpeechToTextInput.displayName = "SpeechToTextInput";
