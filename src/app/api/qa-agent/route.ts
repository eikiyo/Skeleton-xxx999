
import { type NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = "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";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "deepseek/deepseek-chat"; // Using the general model as v3 not found in docs for free tier

export async function POST(req: NextRequest) {
  let body;
  try {
    body = await req.json();
  } catch (error) {
    console.error('[QAAgent-DeepSeek] Invalid JSON body:', error);
    const errorResponse = {
      from: "qa",
      content: 'Invalid JSON body received by QA Agent.',
      timestamp: Date.now(),
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  const { prompt, context } = body; // Expect 'prompt' and 'context'

  if (!prompt) {
    const errorResponse = {
      from: "qa",
      content: "'prompt' (instruction/developer output) is required.",
      timestamp: Date.now(),
    };
    return NextResponse.json(errorResponse, { status: 400 });
  }

  const messages = [
    { role: "system", content: "You are a critical QA agent. Always verify, test, and never allow unsafe changes. Request clarification if instructions are ambiguous. Be concise and clear." },
    { role: "user", content: prompt + (context ? `\n\nProject Context/Files:\n${context}` : "") }
  ];

  try {
    const llmResponse = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://your-app-url.com", // Optional
        "X-Title": "CodePilot QA Agent" // Optional
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages
      })
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error(`[QAAgent-DeepSeek] LLM call failed with status ${llmResponse.status}:`, errorText);
      const errorResponse = {
        from: "qa",
        content: `QA Agent (DeepSeek) API call failed. Status: ${llmResponse.status}. Details: ${errorText.slice(0,500)}`,
        timestamp: Date.now(),
      };
      return NextResponse.json(errorResponse, { status: llmResponse.status });
    }

    const data = await llmResponse.json();
    const reply = data?.choices?.[0]?.message?.content || "No content in response from LLM.";

    console.log("[QAAgent-DeepSeek] Interaction Log:", {
      requestBody: { promptLength: prompt.length, contextLength: context?.length || 0 },
      llmRawResponse: data, // Log raw response
      extractedReply: reply
    });
    
    const agentResponseMessage = {
      from: "qa",
      content: reply,
      timestamp: Date.now(),
    };
    return NextResponse.json(agentResponseMessage);

  } catch (error: any) {
    console.error('[QAAgent-DeepSeek] Unexpected error:', error);
    const errorResponse = {
      from: "qa",
      content: `QA Agent (DeepSeek): Internal Server Error. Details: ${error.message || String(error)}`,
      timestamp: Date.now(),
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
