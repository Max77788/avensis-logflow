import { supabase } from "./supabase";

/**
 * Speech-to-Text Service
 * 
 * Uses MediaRecorder for mobile (records audio and sends to cloud service)
 * Uses Web Speech API for desktop (native browser support)
 */

interface TranscriptionResult {
  success: boolean;
  transcript?: string;
  error?: string;
}

/**
 * Transcribe audio using Supabase Edge Function
 * This works on all platforms including mobile
 */
export async function transcribeAudio(
  audioBlob: Blob,
  mimeType: string = "audio/webm;codecs=opus"
): Promise<TranscriptionResult> {
  try {
    // Convert blob to base64
    const arrayBuffer = await audioBlob.arrayBuffer();
    const base64Audio = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );

    // Get the Supabase project URL
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error("VITE_SUPABASE_URL not configured");
    }

    // Get the auth token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    // Call the Edge Function
    const response = await fetch(
      `${supabaseUrl}/functions/v1/speech-to-text`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
        },
        body: JSON.stringify({
          audioData: base64Audio,
          mimeType,
          language: "en-US",
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return {
      success: true,
      transcript: result.transcript || "",
    };
  } catch (error: any) {
    console.error("Error transcribing audio:", error);
    return {
      success: false,
      error: error.message || "Failed to transcribe audio",
    };
  }
}

