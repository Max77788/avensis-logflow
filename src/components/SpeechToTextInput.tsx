import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Loader2 } from "lucide-react";

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

// Detect iOS (which doesn't support Web Speech API)
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
  const [isSupported, setIsSupported] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const baseValueRef = useRef<string>(""); // Value when recording starts
  const finalTranscriptRef = useRef<string>(""); // Accumulated final transcripts
  const isMobile = useRef(isMobileDevice());
  const isListeningRef = useRef(false); // Track listening state for onend handler
  const hasRequestedPermission = useRef(false); // Track if we've requested permission
  const audioStartTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Timeout to detect if audio never starts
  const lastProcessedFinalIndexRef = useRef<number>(-1); // Track last processed final result index to prevent duplicates

  // Check if Speech Recognition is actually supported and functional
  useEffect(() => {
    // iOS doesn't support Web Speech API at all
    if (isIOS()) {
      setIsSupported(false);
      setErrorMessage("Voice input is not supported on iOS Safari. Please use text input instead.");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      // Test if we can actually create an instance
      try {
        const testRecognition = new SpeechRecognition();
        setIsSupported(true);
      } catch (e) {
        console.error("Speech Recognition not functional:", e);
        setIsSupported(false);
        if (isMobile.current) {
          setErrorMessage("Voice input is not supported on this mobile browser. Please use text input instead.");
        }
      }
    } else {
      setIsSupported(false);
      if (isMobile.current) {
        setErrorMessage("Voice input is not supported on this mobile browser. Please use text input instead.");
      }
    }
  }, []);

  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      
      // Mobile browsers work better with continuous mode and interim results
      recognition.continuous = isMobile.current;
      recognition.interimResults = isMobile.current;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let newFinalTranscript = "";

        // Process only NEW results that haven't been processed as final yet
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          
          if (result.isFinal) {
            // Only process final results that we haven't processed before
            // This prevents duplicates when continuous mode fires multiple times
            if (i > lastProcessedFinalIndexRef.current) {
              newFinalTranscript += transcript + " ";
              lastProcessedFinalIndexRef.current = i;
            }
          } else {
            // Interim result - show as preview (only the latest interim)
            if (i === event.results.length - 1) {
              interimTranscript = transcript;
            }
          }
        }

        // Update accumulated final transcript only with new final results
        if (newFinalTranscript) {
          finalTranscriptRef.current += newFinalTranscript;
        }

        // Combine: base value + accumulated final transcripts + latest interim preview
        const combinedValue = baseValueRef.current + 
          (baseValueRef.current && finalTranscriptRef.current ? " " : "") + 
          finalTranscriptRef.current + 
          (interimTranscript ? " " + interimTranscript : "");
        
        onChange(combinedValue.trim());
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setErrorMessage(null);
        
        // Handle different error types
        switch (event.error) {
          case "no-speech":
            // No speech detected - this is normal, just stop
            isListeningRef.current = false;
            setIsListening(false);
            onListeningChange?.(false);
            break;
          case "audio-capture":
            setErrorMessage("No microphone found. Please check your device settings.");
            isListeningRef.current = false;
            setIsListening(false);
            onListeningChange?.(false);
            break;
          case "not-allowed":
            setErrorMessage("Microphone permission denied. Please allow microphone access in your browser settings.");
            isListeningRef.current = false;
            setIsListening(false);
            onListeningChange?.(false);
            break;
          case "aborted":
            // User or system aborted - this is normal, just stop
            isListeningRef.current = false;
            setIsListening(false);
            onListeningChange?.(false);
            break;
          case "network":
            setErrorMessage("Network error. Please check your connection.");
            isListeningRef.current = false;
            setIsListening(false);
            onListeningChange?.(false);
            break;
          case "service-not-allowed":
            setErrorMessage("Speech recognition service not allowed. Please check your browser settings.");
            isListeningRef.current = false;
            setIsListening(false);
            onListeningChange?.(false);
            break;
          default:
            // For other errors, try to continue if possible
        if (event.error !== "no-speech" && event.error !== "aborted") {
          isListeningRef.current = false;
          setIsListening(false);
          onListeningChange?.(false);
        }
        }
        
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {
            // Ignore stop errors
          }
        }
      };

      recognition.onend = () => {
        // Clear any pending timeout
        if (audioStartTimeoutRef.current) {
          clearTimeout(audioStartTimeoutRef.current);
          audioStartTimeoutRef.current = null;
        }

        // On mobile, if we're still supposed to be listening, restart
        if (isMobile.current && isListeningRef.current) {
          try {
            // Small delay before restarting to avoid immediate restart issues
            setTimeout(() => {
              if (recognitionRef.current && isListeningRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (e) {
                  // If restart fails, stop listening
                  isListeningRef.current = false;
                  setIsListening(false);
                  onListeningChange?.(false);
                }
              }
            }, 100);
          } catch (e) {
            isListeningRef.current = false;
            setIsListening(false);
            onListeningChange?.(false);
          }
        } else {
          isListeningRef.current = false;
          setIsListening(false);
          onListeningChange?.(false);
        }
      };

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        onListeningChange?.(true);
        setErrorMessage(null);
        // Reset the last processed index when starting a new session
        lastProcessedFinalIndexRef.current = -1;
        console.log("Speech recognition started successfully");
        
        // On mobile, set a timeout to detect if audio never starts
        if (isMobile.current && audioStartTimeoutRef.current === null) {
          audioStartTimeoutRef.current = setTimeout(() => {
            if (isListeningRef.current) {
              console.warn("Audio capture may not have started - checking microphone access");
              // Don't show error yet, wait a bit more
            }
          }, 2000);
        }
      };

      recognition.onaudiostart = () => {
        console.log("Audio capture started");
        // Clear timeout if audio started
        if (audioStartTimeoutRef.current) {
          clearTimeout(audioStartTimeoutRef.current);
          audioStartTimeoutRef.current = null;
        }
      };

      recognition.onaudioend = () => {
        console.log("Audio capture ended");
      };

      recognition.onsoundstart = () => {
        console.log("Sound detected");
      };

      recognition.onsoundend = () => {
        console.log("Sound ended");
      };

      recognition.onspeechstart = () => {
        console.log("Speech detected");
      };

      recognition.onspeechend = () => {
        console.log("Speech ended");
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
      }
    };
    }, [onChange, onListeningChange]);

  // Request microphone permission explicitly (required for mobile)
  const requestMicrophonePermission = async (): Promise<boolean> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return false;
    }

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error: any) {
      console.error("Microphone permission error:", error);
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        setErrorMessage("Microphone permission denied. Please allow microphone access in your browser settings and try again.");
      } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
        setErrorMessage("No microphone found on this device.");
      } else {
        setErrorMessage("Could not access microphone. Please check your device settings.");
      }
      return false;
    }
  };

  const startListening = async () => {
    if (!recognitionRef.current || disabled || isListeningRef.current) return;

    // On mobile, request microphone permission first
    if (isMobile.current && !hasRequestedPermission.current) {
      setErrorMessage(null);
      const hasPermission = await requestMicrophonePermission();
      hasRequestedPermission.current = true;
      
      if (!hasPermission) {
        return;
      }
    }

    try {
      // Reset accumulated transcripts and processed indices
      finalTranscriptRef.current = "";
      lastProcessedFinalIndexRef.current = -1;
      // Capture current value as base for this recording
      baseValueRef.current = value;
      setErrorMessage(null);
      isListeningRef.current = true;
      recognitionRef.current.start();
    } catch (error: any) {
      console.error("Error starting speech recognition:", error);
      isListeningRef.current = false;
      
      // If already started, stop first then restart
      if (error.message?.includes("already started") || error.name === "InvalidStateError") {
        try {
          recognitionRef.current.stop();
          setTimeout(() => {
            finalTranscriptRef.current = "";
            lastProcessedFinalIndexRef.current = -1;
            baseValueRef.current = value;
            setErrorMessage(null);
            isListeningRef.current = true;
            recognitionRef.current.start();
          }, 200);
        } catch (e) {
          console.error("Error restarting speech recognition:", e);
          isListeningRef.current = false;
          setIsListening(false);
          onListeningChange?.(false);
        }
      } else if (error.name === "NotAllowedError" || error.message?.includes("not allowed")) {
        setErrorMessage("Microphone permission denied. Please allow microphone access and try again.");
        setIsListening(false);
        onListeningChange?.(false);
      } else {
        setErrorMessage("Failed to start voice input. Please try again.");
        setIsListening(false);
        onListeningChange?.(false);
      }
    }
  };

  const stopListening = () => {
    // Clear any pending timeout
    if (audioStartTimeoutRef.current) {
      clearTimeout(audioStartTimeoutRef.current);
      audioStartTimeoutRef.current = null;
    }

    if (recognitionRef.current && isListeningRef.current) {
      try {
        isListeningRef.current = false;
        recognitionRef.current.stop();
        setIsListening(false);
        onListeningChange?.(false);
      } catch (e) {
        // Ignore errors
        isListeningRef.current = false;
        setIsListening(false);
        onListeningChange?.(false);
      }
    }
  };

  const handleToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    startListening,
    stopListening,
    isListening,
  }));

  return (
    <div className="space-y-2">
      <div className="relative">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
            disabled={disabled}
            className="absolute bottom-2 right-2 h-10 w-10 sm:h-12 sm:w-12 rounded-full shadow-md hover:shadow-lg transition-all touch-manipulation"
            title={isListening ? "Stop recording" : "Start voice input"}
          >
            {isListening ? (
              <MicOff className="h-5 w-5 sm:h-6 sm:w-6 animate-pulse" />
            ) : (
              <Mic className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </Button>
        )}
        {!isSupported && !hideMicButton && isMobile.current && (
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
            Voice not available
          </div>
        )}
      </div>
      {isListening && (
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="font-medium">
            {isMobile.current 
              ? "Recording... Speak now. Tap mic again to stop." 
              : "Recording... Speak now. Tap mic again to stop."}
          </span>
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
