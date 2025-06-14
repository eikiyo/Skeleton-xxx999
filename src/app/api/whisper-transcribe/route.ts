
// /src/app/api/whisper-transcribe/route.ts

import { type NextRequest, NextResponse } from 'next/server';

const WHISPER_API_URL = process.env.WHISPER_API_URL;
const WHISPER_API_KEY = process.env.WHISPER_API_KEY;

export async function POST(req: NextRequest) {
  if (!WHISPER_API_URL || !WHISPER_API_KEY) {
    console.error('[WhisperTranscribe] Missing required environment variables (WHISPER_API_URL, WHISPER_API_KEY)');
    return NextResponse.json({ error: 'Server configuration error: Missing Whisper API environment variables.' }, { status: 500 });
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
    const audioBlob = new Blob([buffer], { type: mimeType });
    
    const form = new FormData();
    form.append('file', audioBlob, 'audio.wav'); // filename can be arbitrary, e.g., audio.wav or audio.mp3 depending on actual mimeType
    form.append('model', 'whisper-1');

    const whisperResponse = await fetch(WHISPER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHISPER_API_KEY}`,
        // 'Content-Type' is automatically set by fetch when body is FormData
      },
      body: form,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error(`[WhisperTranscribe] Whisper API call failed with status ${whisperResponse.status}:`, errorText);
      return NextResponse.json({ error: 'Whisper API call failed', details: errorText }, { status: whisperResponse.status });
    }

    const result = await whisperResponse.json();

    // Audit log (simple console log; replace with persistent logging for production)
    console.log('[WhisperTranscribe] Interaction Log:', {
      audioLength: buffer.length,
      mimeType: mimeType,
      transcript: result.text,
    });

    return NextResponse.json({ transcript: result.text });

  } catch (error: any) {
    console.error('[WhisperTranscribe] Unexpected error during transcription process:', error);
    return NextResponse.json({ error: 'Internal Server Error during transcription', details: error.message || String(error) }, { status: 500 });
  }
}
