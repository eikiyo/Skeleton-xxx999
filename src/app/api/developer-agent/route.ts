
import { type NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = "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";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "qwen/qwen3-235b-a22b:free"; // Corrected model name as per latest
// const OPENROUTER_MODEL = "qwen/qwen-2-72b-instruct"; // Previous model if needed


export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch (error) {
    console.error('[DeveloperAgent-Qwen] Invalid JSON body:', error);
    const errorResponse = {
      from: "developer",
      content: 'Invalid JSON body received by Developer Agent.',
      timestamp: Date.now(),
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  const { prompt, context } = body; // Expect 'prompt' and 'context'

  if (!prompt) {
    const errorResponse = {
      from: "developer",
      content: "'prompt' (featureRequest/instruction) is required.",
      timestamp: Date.now(),
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  const messages = [
    { role: "system", content: "Always strictly follow the user’s instructions and coding standards. Be concise and clear in your responses. Provide code when asked." },
    { role: "user", content: prompt + (context ? `\n\nExisting Project Context:\n${context}` : "") }
  ];

  try {
    const llmResponse = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://your-app-url.com", // Optional: OpenRouter recommends adding referer
        "X-Title": "CodePilot Developer Agent" // Optional: For OpenRouter logging
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages
      })
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error(`[DeveloperAgent-Qwen] LLM call failed with status ${llmResponse.status}:`, errorText);
      const errorResponse = {
        from: "developer",
        content: `Developer Agent (Qwen) API call failed. Status: ${llmResponse.status}. Details: ${errorText.slice(0,500)}`,
        timestamp: Date.now(),
      };
      return NextResponse.json(errorResponse, { status: llmResponse.status });
    }

    const data = await llmResponse.json();
    const reply = data?.choices?.[0]?.message?.content || "No content in response from LLM.";
    
    console.log("[DeveloperAgent-Qwen] Interaction Log:", {
      requestBody: { promptLength: prompt.length, contextLength: context?.length || 0 },
      llmRawResponse: data, // Log raw response for detailed audit
      extractedReply: reply
    });

    const agentResponseMessage = {
      from: "developer",
      content: reply,
      timestamp: Date.now(),
    };
    return NextResponse.json(agentResponseMessage);

  } catch (error: any) {
    console.error('[DeveloperAgent-Qwen] Unexpected error:', error);
    const errorResponse = {
      from: "developer",
      content: `Developer Agent (Qwen): Internal Server Error. Details: ${error.message || String(error)}`,
      timestamp: Date.now(),
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
