
import { type NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'mistralai/mistral-7b-instruct'; // Using a more suitable model for QA

export async function POST(req: NextRequest) {
  try {
    const OPENROUTER_KEY = process.env.OPENROUTER_KEY;
    if (!OPENROUTER_KEY) {
      console.error(
        '[QA-Agent] OPENROUTER_KEY not set in environment.'
      );
      return NextResponse.json(
        { error: 'Server configuration error: OPENROUTER_KEY not set.' },
        { status: 500 }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch (error) {
      console.error('[QA-Agent] Invalid JSON body:', error);
      return NextResponse.json({ error: 'Invalid JSON body received.' }, { status: 400 });
    }

    const { prompt, context } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "'prompt' (question) is required." },
        { status: 400 }
      );
    }

    const messages = [
      {
        role: 'system',
        content:
          'You are a helpful assistant for code-related questions. Provide concise and relevant answers based on the provided context, if any.',
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
        'HTTP-Referer': 'https://your-app-url.com',
        'X-Title': 'CodePilot QA Agent',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages,
      }),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error(`[DeveloperAgent-Qwen] LLM call failed with status ${llmResponse.status}:`, errorText);
      return NextResponse.json({ reply: `Developer Agent (Qwen) API call failed. Status: ${llmResponse.status}. Details: ${errorText.slice(0,500)}` }, { status: llmResponse.status });
    }
    const errorText = await llmResponse.text();
    console.error(
      `[QA-Agent] LLM call failed with status ${llmResponse.status}:`,
      errorText
    );
    return NextResponse.json(
      {
        error: `QA Agent API call failed. Status: ${
          llmResponse.status
        }. Details: ${errorText.slice(0, 500)}`,
      },
      { status: llmResponse.status }
    );
  }

    const data = await llmResponse.json();
    const answer = data?.choices?.[0]?.message?.content || 'No answer from LLM.';
    return NextResponse.json({ answer });
  } catch (error) {
    console.error('[QA-Agent] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
