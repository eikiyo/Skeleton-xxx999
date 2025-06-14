
// /src/app/api/whisper-transcribe/route.ts

import { type NextRequest, NextResponse } from 'next/server';

const OPENAI_API_URL = "https://api.openai.com/v1/audio/transcriptions";

export async function POST(req: NextRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
  }

  const OPENAI_API_KEY = process.env.OPEN_AI_KEY;
  if (!OPENAI_API_KEY) {
    console.error('[WhisperTranscribe] OPEN_AI_KEY not set in environment.');
    return NextResponse.json({ error: "Server configuration error: OPEN_AI_KEY not set." }, { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch (error) {
    console.error('[WhisperTranscribe] Invalid JSON body:', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { audioBase64, mimeType } = body;

  if (!audioBase64 || !mimeType) {
    return NextResponse.json({ error: 'Missing audioBase64 or mimeType in request body' }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(audioBase64, 'base64');
    
    const form = new FormData();
    // Use Blob as per provided example, which is good practice for fetch with FormData
    form.append('file', new Blob([buffer], { type: mimeType }), 'audio.webm'); 
    form.append('model', 'whisper-1');

    const whisperResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        // 'Content-Type' is automatically set by fetch when body is FormData
      },
      body: form, // Pass FormData directly
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error(`[WhisperTranscribe] Whisper API call failed with status ${whisperResponse.status}:`, errorText);
      return NextResponse.json({ error: 'Whisper API call failed', details: errorText }, { status: whisperResponse.status });
    }

    const result = await whisperResponse.json();
    const transcript = result?.text || "";

    // Audit log (simple console log; replace with persistent logging for production)
    console.log('[WhisperTranscribe] Interaction Log:', {
      audioLength: buffer.length,
      mimeType: mimeType,
      transcriptLength: transcript.length, // Log length instead of full transcript for brevity
    });

    return NextResponse.json({ transcript: transcript });

  } catch (error: any) {
    console.error('[WhisperTranscribe] Unexpected error during transcription process:', error);
    return NextResponse.json({ error: 'Internal Server Error during transcription', details: error.message || String(error) }, { status: 500 });
  }
}
