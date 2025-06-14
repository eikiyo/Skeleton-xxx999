
import { type NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'qwen/qwen3-235b-a22b:free'; // Using a suitable model

export async function POST(req: NextRequest) {
  try {
    const OPENROUTER_KEY = process.env.QWEN_OPENROUTER_KEY;
    if (!OPENROUTER_KEY) {
      console.error(
        '[Developer-Agent] QWEN_OPENROUTER_KEY not set in environment.'
      );
      return NextResponse.json(
        { error: 'Server configuration error: QWEN_OPENROUTER_KEY not set.' },
        { status: 500 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch (error) {
      console.error('[Developer-Agent] Invalid JSON body:', error);
      return NextResponse.json({ error: 'Invalid JSON body received.' }, { status: 400 });
    }

    const { prompt, context } = body;

    if (typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { error: "'prompt' (question) is required and must be a non-empty string." },
        { status: 400 }
      );
    }

    const messages = [
      {
        role: 'system',
        content:
          'Always strictly follow the user’s instructions and coding standards. Provide concise and relevant answers based on the provided context, if any.',
      },
      {
        role: 'user',
        content: prompt + (context ? `\n\nContext:\n${context}` : ''),
      },
    ];

    const llmResponse = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://your-app-url.com', // Best practice: replace with your actual app URL
        'X-Title': 'CodePilot Developer Agent', // Best practice: identify your app
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages,
      }),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error(`[Developer-Agent] LLM call failed with status ${llmResponse.status}:`, errorText);
      return NextResponse.json({ error: `Developer Agent (Qwen) API call failed. Status: ${llmResponse.status}. Details: ${errorText.slice(0,500)}` }, { status: llmResponse.status });
    }

    // If llmResponse.ok is true, proceed to parse JSON
    const data = await llmResponse.json();
    const reply = data?.choices?.[0]?.message?.content || 'No reply from LLM.';
    
    console.log("[Developer-Agent] Interaction Summary:", { 
        promptLength: prompt.length, 
        contextLength: context?.length || 0, 
        replyLength: reply.length 
    });

    return NextResponse.json({ reply });

  } catch (error: any) { // This catch is for unexpected errors not caught by specific checks
    console.error('[Developer-Agent] Unexpected error in POST handler:', error);
    return NextResponse.json({ error: `Internal server error in Developer Agent. ${error.message || ''}`.trim() }, { status: 500 });
  }
}
