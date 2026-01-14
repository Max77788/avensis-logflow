import { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Loader2, Square } from "lucide-react";
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
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isStopping, setIsStopping] = useState(false); // Track stopping state
  const [recordingDuration, setRecordingDuration] = useState(0); // Track recording time
  
  // Use refs for immediate state tracking (no async delays)
  const isListeningRef = useRef(false);
  const isProcessingRef = useRef(false); // Prevent concurrent operations
  const lastToggleTimeRef = useRef(0); // Debounce tracking
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null); // Timer for recording duration
  
  // Desktop: Web Speech API
  const recognitionRef = useRef<any>(null);
  
  // Mobile: MediaRecorder
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  const baseValueRef = useRef<string>("");
  const accumulatedFinalRef = useRef<string>("");
  const isMobile = useRef(isMobileDevice());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousScrollTopRef = useRef<number>(0);

  // Debounce time in ms
  const DEBOUNCE_MS = 300;

  // Check if Web Speech API is available (for desktop)
  const webSpeechSupported = !isMobile.current && 
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

  // Update listening state helper
  const updateListeningState = useCallback((listening: boolean) => {
    isListeningRef.current = listening;
    setIsListening(listening);
    onListeningChange?.(listening);
    
    // Start/stop recording duration timer
    if (listening) {
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingDuration(0);
    }
  }, [onListeningChange]);

  // Check Web Speech API support and initialize for desktop
  useEffect(() => {
    if (isMobile.current) {
      // Mobile always uses MediaRecorder, so it's always "supported"
      setIsSupported(true);
      return;
    }

    // Desktop: Check for Web Speech API support
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
    } else {
      setIsSupported(false);
      setErrorMessage("Web Speech API is not supported in this browser. Voice input will not be available.");
      return;
    }
  }, []);

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
      isProcessingRef.current = false;
      updateListeningState(false);
    };

    recognition.onend = () => {
      // Only restart if we're supposed to be listening AND not in stopping state
      if (isListeningRef.current && !isStopping) {
        setTimeout(() => {
          if (isListeningRef.current && recognitionRef.current && !isStopping) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error("Error restarting recognition:", e);
              isProcessingRef.current = false;
              updateListeningState(false);
            }
          }
        }, 100);
      } else {
        isProcessingRef.current = false;
        updateListeningState(false);
        setIsStopping(false);
      }
    };

    recognition.onstart = () => {
      isProcessingRef.current = false;
      updateListeningState(true);
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
  }, [webSpeechSupported, onChange, updateListeningState, isStopping]);

  // Cleanup MediaRecorder and timer on unmount
  useEffect(() => {
    return () => {
      // Clear recording timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
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

  // Force stop all recording - robust cleanup
  const forceStopAllRecording = useCallback(() => {
    console.log("Force stopping all recording...");
    
    // Stop MediaRecorder
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state === "recording" || mediaRecorderRef.current.state === "paused") {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {
        console.error("Error stopping MediaRecorder:", e);
      }
      mediaRecorderRef.current = null;
    }
    
    // Stop all audio tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.error("Error stopping track:", e);
        }
      });
      streamRef.current = null;
    }
    
    // Stop Web Speech API
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Error stopping recognition:", e);
      }
    }
    
    // Reset all states
    audioChunksRef.current = [];
    isProcessingRef.current = false;
    setIsStopping(false);
    setIsTranscribing(false);
    updateListeningState(false);
  }, [updateListeningState]);

  // Start listening - different for mobile vs desktop
  const startListening = useCallback(async () => {
    // Debounce check
    const now = Date.now();
    if (now - lastToggleTimeRef.current < DEBOUNCE_MS) {
      console.log("Debounced - ignoring start request");
      return;
    }
    lastToggleTimeRef.current = now;

    // Prevent if already processing or listening
    if (disabled || isListeningRef.current || isProcessingRef.current) {
      console.log("Start blocked - disabled:", disabled, "listening:", isListeningRef.current, "processing:", isProcessingRef.current);
      return;
    }

    isProcessingRef.current = true;
    baseValueRef.current = value;
    accumulatedFinalRef.current = "";
    setErrorMessage(null);

    if (isMobile.current) {
      // Mobile: Use MediaRecorder + Google Cloud Speech-to-Text
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
        let mimeType: string;
        if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
          mimeType = "audio/webm;codecs=opus";
        } else if (MediaRecorder.isTypeSupported("audio/webm")) {
          mimeType = "audio/webm";
        } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
          mimeType = "audio/mp4";
        } else {
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
          console.log("MediaRecorder stopped, processing audio...");
          
          // Stop all tracks immediately
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }

          if (audioChunksRef.current.length === 0) {
            console.log("No audio chunks to process");
            isProcessingRef.current = false;
            updateListeningState(false);
            setIsStopping(false);
            return;
          }

          setIsTranscribing(true);
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          try {
            const result = await transcribeAudio(audioBlob, mimeType);
            
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
          } catch (e) {
            console.error("Transcription error:", e);
            setErrorMessage("Failed to transcribe audio");
          }

          audioChunksRef.current = [];
          setIsTranscribing(false);
          isProcessingRef.current = false;
          updateListeningState(false);
          setIsStopping(false);
        };

        mediaRecorder.onerror = (event: any) => {
          console.error("MediaRecorder error:", event);
          forceStopAllRecording();
          setErrorMessage("Recording error occurred");
        };

        mediaRecorder.start();
        isProcessingRef.current = false;
        updateListeningState(true);
        console.log("MediaRecorder started");
      } catch (error: any) {
        console.error("Error starting recording:", error);
        isProcessingRef.current = false;
        updateListeningState(false);
        
        if (error.name === "NotAllowedError") {
          setErrorMessage("Microphone permission denied. Please allow microphone access in browser settings.");
        } else {
          setErrorMessage("Failed to access microphone: " + (error.message || "Unknown error"));
        }
      }
    } else {
      // Desktop: Use Web Speech API
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error: any) {
          console.error("Error starting recognition:", error);
          isProcessingRef.current = false;
          updateListeningState(false);
          setErrorMessage("Failed to start voice input. Please try again.");
        }
      } else {
        setErrorMessage("Web Speech API is not available in this browser.");
        isProcessingRef.current = false;
        updateListeningState(false);
      }
    }
  }, [disabled, value, onChange, updateListeningState, forceStopAllRecording]);

  const stopListening = useCallback(() => {
    // Debounce check
    const now = Date.now();
    if (now - lastToggleTimeRef.current < DEBOUNCE_MS) {
      console.log("Debounced - ignoring stop request");
      return;
    }
    lastToggleTimeRef.current = now;

    // Prevent if already stopping or not listening
    if (!isListeningRef.current || isProcessingRef.current) {
      console.log("Stop blocked - listening:", isListeningRef.current, "processing:", isProcessingRef.current);
      // Force cleanup anyway if user is having trouble
      if (!isListeningRef.current && !isProcessingRef.current) {
        forceStopAllRecording();
      }
      return;
    }

    console.log("Stopping recording...");
    isProcessingRef.current = true;
    setIsStopping(true);
    
    // Immediately update listening ref to prevent auto-restart
    isListeningRef.current = false;

    if (isMobile.current) {
      // Mobile: Stop MediaRecorder
      if (mediaRecorderRef.current) {
        try {
          if (mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop(); // This will trigger onstop callback
          } else {
            // Already stopped or inactive, just clean up
            console.log("MediaRecorder not recording, cleaning up...");
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => track.stop());
              streamRef.current = null;
            }
            isProcessingRef.current = false;
            updateListeningState(false);
            setIsStopping(false);
          }
        } catch (e) {
          console.error("Error stopping MediaRecorder:", e);
          forceStopAllRecording();
        }
      } else {
        // No MediaRecorder, just clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        isProcessingRef.current = false;
        updateListeningState(false);
        setIsStopping(false);
      }
    } else {
      // Desktop: Stop Web Speech API
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Error stopping Web Speech API:", e);
          isProcessingRef.current = false;
          updateListeningState(false);
          setIsStopping(false);
        }
      } else {
        isProcessingRef.current = false;
        updateListeningState(false);
        setIsStopping(false);
      }
    }
  }, [updateListeningState, forceStopAllRecording]);

  const handleToggle = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("Toggle clicked - isListening:", isListeningRef.current, "isProcessing:", isProcessingRef.current);
    
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  // Handle touch events separately to prevent double-firing on mobile
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log("Touch end - isListening:", isListeningRef.current, "isProcessing:", isProcessingRef.current);
    
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  useImperativeHandle(ref, () => ({
    startListening,
    stopListening,
    isListening,
  }), [startListening, stopListening, isListening]);

  // Determine button state
  const isButtonDisabled = disabled || isTranscribing || isProcessingRef.current;
  const showStopIcon = isListening || isStopping;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            const scrollTop = e.target.scrollTop;
            const newValue = e.target.value;
            
            // If speech recognition is active and user manually types, stop listening immediately
            // This prevents speech recognition from overwriting manual typing
            if (isListeningRef.current) {
              // Update baseValueRef to current value so speech recognition doesn't overwrite
              baseValueRef.current = newValue;
              accumulatedFinalRef.current = "";
              // Stop speech recognition immediately to allow manual typing
              isListeningRef.current = false;
              stopListening();
            }
            
            // Update the value normally - this happens regardless of speech recognition state
            onChange(newValue);
            
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
            variant={showStopIcon ? "destructive" : "ghost"}
            size="icon"
            onClick={handleToggle}
            onTouchEnd={isMobile.current ? handleTouchEnd : undefined}
            disabled={isButtonDisabled}
            className={`absolute bottom-2 right-2 h-10 w-10 sm:h-12 sm:w-12 rounded-full shadow-md hover:shadow-lg transition-all touch-manipulation select-none ${
              showStopIcon ? "bg-red-600 hover:bg-red-700" : ""
            }`}
            title={showStopIcon ? "Stop recording" : "Start voice input"}
          >
            {isTranscribing ? (
              <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
            ) : showStopIcon ? (
              <Square className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
            ) : (
              <Mic className="h-5 w-5 sm:h-6 sm:w-6" />
            )}
          </Button>
        )}
      </div>
      {isListening && !isTranscribing && !isStopping && (
        <div className="flex items-center justify-between gap-2 text-xs sm:text-sm text-white bg-red-600 p-3 rounded-md">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-white animate-pulse" />
            <span className="font-medium">
              Recording ({Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')})
            </span>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              forceStopAllRecording();
            }}
            className="h-7 px-3 text-xs font-bold bg-white text-red-600 hover:bg-gray-100"
          >
            STOP
          </Button>
        </div>
      )}
      {isStopping && !isTranscribing && (
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="font-medium">Stopping recording...</span>
        </div>
      )}
      {isTranscribing && (
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="font-medium">Transcribing audio...</span>
        </div>
      )}
      {errorMessage && (
        <div className="text-xs sm:text-sm text-destructive bg-destructive/10 p-2 rounded-md flex items-center justify-between">
          <span>{errorMessage}</span>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => setErrorMessage(null)}
            className="h-6 px-2 text-xs"
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
});

SpeechToTextInput.displayName = "SpeechToTextInput";
