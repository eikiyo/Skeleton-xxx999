
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
    // Return a structure that dispatch-instruction might expect for error logging
    return NextResponse.json({ reply: 'Invalid JSON body received by Developer Agent.' }, { status: 400 });
  }

  const { prompt, context } = body;

  if (!prompt) {
     return NextResponse.json({ reply: "'prompt' (featureRequest/instruction) is required." }, { status: 400 });
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
        "HTTP-Referer": "https://your-app-url.com", 
        "X-Title": "CodePilot Developer Agent" 
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages
      })
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error(`[DeveloperAgent-Qwen] LLM call failed with status ${llmResponse.status}:`, errorText);
      return NextResponse.json({ reply: `Developer Agent (Qwen) API call failed. Status: ${llmResponse.status}. Details: ${errorText.slice(0,500)}` }, { status: llmResponse.status });
    }

    const data = await llmResponse.json();
    const reply = data?.choices?.[0]?.message?.content || "No content in response from LLM.";
    
    console.log("[DeveloperAgent-Qwen] Interaction Log:", {
      requestBody: { promptLength: prompt.length, contextLength: context?.length || 0 },
      llmRawResponseForAudit: data, 
      extractedReply: reply
    });

    // Return the simple reply for dispatch-instruction to format
    return NextResponse.json({ reply });

  } catch (error: any) {
    console.error('[DeveloperAgent-Qwen] Unexpected error:', error);
    return NextResponse.json({ reply: `Developer Agent (Qwen): Internal Server Error. Details: ${error.message || String(error)}` }, { status: 500 });
  }
}
