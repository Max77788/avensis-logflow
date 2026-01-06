import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SpeechToTextRequest {
  audioData: string; // Base64 encoded audio
  mimeType: string; // e.g., "audio/webm", "audio/mp4"
  language?: string; // Default to "en-US"
}

/**
 * Speech-to-Text Edge Function
 * 
 * This function uses Google Cloud Speech-to-Text API to transcribe audio.
 * Requires GOOGLE_CLOUD_SPEECH_API_KEY environment variable.
 * 
 * Alternative: Can use Azure Speech Services, AWS Transcribe, or other services
 */
serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { audioData, mimeType, language = "en-US" }: SpeechToTextRequest = await req.json();

    if (!audioData) {
      return new Response(
        JSON.stringify({ error: "audioData is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get API key from environment
    const apiKey = Deno.env.get("GOOGLE_CLOUD_SPEECH_API_KEY");
    
    if (!apiKey) {
      console.error("GOOGLE_CLOUD_SPEECH_API_KEY not configured");
      return new Response(
        JSON.stringify({ 
          error: "Speech-to-text service not configured",
          message: "Please configure GOOGLE_CLOUD_SPEECH_API_KEY in Supabase Edge Function secrets"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Convert base64 to buffer
    const audioBytes = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));

    // Prepare request for Google Cloud Speech-to-Text API
    const requestBody = {
      config: {
        encoding: mimeType.includes("webm") ? "WEBM_OPUS" : 
                 mimeType.includes("mp4") ? "MP4" :
                 "WEBM_OPUS", // Default
        sampleRateHertz: 48000, // Common for web audio
        languageCode: language,
        alternativeLanguageCodes: [],
        enableAutomaticPunctuation: true,
        model: "default",
      },
      audio: {
        content: btoa(String.fromCharCode(...audioBytes)),
      },
    };

    // Call Google Cloud Speech-to-Text API
    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Speech API error:", errorText);
      return new Response(
        JSON.stringify({ 
          error: "Speech recognition failed",
          details: errorText 
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = await response.json();

    // Extract transcript from response
    if (result.results && result.results.length > 0) {
      const transcript = result.results
        .map((r: any) => r.alternatives[0]?.transcript)
        .filter((t: string) => t)
        .join(" ");

      return new Response(
        JSON.stringify({ 
          success: true, 
          transcript,
          confidence: result.results[0]?.alternatives[0]?.confidence || 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // No speech detected
    return new Response(
      JSON.stringify({ 
        success: true, 
        transcript: "",
        message: "No speech detected"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in speech-to-text function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        message: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

