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
  const accumulatedFinalRef = useRef<string>(""); // Accumulated final transcripts
  const isMobile = useRef(isMobileDevice());
  const isListeningRef = useRef(false);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if Speech Recognition is supported
  useEffect(() => {
    // iOS doesn't support Web Speech API
    if (isIOS()) {
      setIsSupported(false);
      setErrorMessage("Voice input is not supported on iOS Safari. Please use text input instead.");
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
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

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    
    // Mobile-friendly settings
    recognition.continuous = true; // Always use continuous mode for better mobile support
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    let finalTranscript = "";
    let interimTranscript = "";

    recognition.onresult = (event: any) => {
      // Reset interim
      interimTranscript = "";

      // Process results starting from resultIndex
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          // Add to final transcript
          finalTranscript += transcript + " ";
        } else {
          // Interim result
          interimTranscript += transcript;
        }
      }

      // Update accumulated final transcript
      accumulatedFinalRef.current = finalTranscript;

      // Combine: base + accumulated final + interim
      const combinedValue = baseValueRef.current + 
        (baseValueRef.current && accumulatedFinalRef.current ? " " : "") + 
        accumulatedFinalRef.current + 
        (interimTranscript ? " " + interimTranscript : "");
      
      onChange(combinedValue.trim());
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      
      switch (event.error) {
        case "no-speech":
          // Normal - just stop
          if (isListeningRef.current) {
            isListeningRef.current = false;
            setIsListening(false);
            onListeningChange?.(false);
          }
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
          // Normal - user stopped or system aborted
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
        default:
          if (event.error !== "no-speech" && event.error !== "aborted") {
            isListeningRef.current = false;
            setIsListening(false);
            onListeningChange?.(false);
          }
      }
    };

    recognition.onend = () => {
      // On mobile, auto-restart if we're still supposed to be listening
      if (isMobile.current && isListeningRef.current) {
        // Clear any existing timeout
        if (restartTimeoutRef.current) {
          clearTimeout(restartTimeoutRef.current);
        }
        
        // Restart after a short delay
        restartTimeoutRef.current = setTimeout(() => {
          if (isListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              // If restart fails, stop
              isListeningRef.current = false;
              setIsListening(false);
              onListeningChange?.(false);
            }
          }
        }, 100);
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
    };

    recognitionRef.current = recognition;

    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, [isSupported, onChange, onListeningChange]);

  // Request microphone permission (required for mobile)
  const requestMicrophonePermission = async (): Promise<boolean> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

    // Request permission on mobile first
    if (isMobile.current) {
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        return;
      }
    }

    try {
      // Reset state
      baseValueRef.current = value;
      accumulatedFinalRef.current = "";
      setErrorMessage(null);
      isListeningRef.current = true;
      recognitionRef.current.start();
    } catch (error: any) {
      console.error("Error starting speech recognition:", error);
      isListeningRef.current = false;
      
      if (error.message?.includes("already started") || error.name === "InvalidStateError") {
        // Already started - stop and restart
        try {
          recognitionRef.current.stop();
          setTimeout(() => {
            baseValueRef.current = value;
            accumulatedFinalRef.current = "";
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
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }

    if (recognitionRef.current && isListeningRef.current) {
      try {
        isListeningRef.current = false;
        recognitionRef.current.stop();
        setIsListening(false);
        onListeningChange?.(false);
        accumulatedFinalRef.current = "";
      } catch (e) {
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousScrollTopRef = useRef<number>(0);

  // Preserve scroll position when value changes (prevents auto-scroll to top)
  useEffect(() => {
    if (textareaRef.current) {
      // Save scroll position before update
      previousScrollTopRef.current = textareaRef.current.scrollTop;
    }
  }, [value]);

  // Restore scroll position after render
  useEffect(() => {
    if (textareaRef.current && previousScrollTopRef.current > 0) {
      // Restore scroll position after React updates
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.scrollTop = previousScrollTopRef.current;
        }
      });
    }
  }, [value]);

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
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            // Prevent default scroll behavior
            const scrollTop = e.target.scrollTop;
            onChange(e.target.value);
            // Restore scroll position immediately
            requestAnimationFrame(() => {
              if (textareaRef.current) {
                textareaRef.current.scrollTop = scrollTop;
              }
            });
          }}
          onFocus={(e) => {
            // Prevent scrolling to textarea on focus
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
            Recording... Speak now. Tap mic again to stop.
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
