
import { type NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "deepseek/deepseek-chat"; // Using the general model as v3 not found in docs for free tier. "deepseek/deepseek-chat-v3-0324:free" was specified.

export async function POST(req: NextRequest) {
  const DEEPSEEK_OPENROUTER_KEY = process.env.DEEPSEEK_OPENROUTER_KEY;
  if (!DEEPSEEK_OPENROUTER_KEY) {
    console.error('[QAAgent-DeepSeek] DEEPSEEK_OPENROUTER_KEY not set in environment.');
    return NextResponse.json({ reply: 'Server configuration error: DEEPSEEK_OPENROUTER_KEY not set.' }, { status: 500 });
  }
  
  let body;
  try {
    body = await req.json();
  } catch (error) {
    console.error('[QAAgent-DeepSeek] Invalid JSON body:', error);
    return NextResponse.json({ reply: 'Invalid JSON body received by QA Agent.' }, { status: 400 });
  }

  const { prompt, context } = body;

  if (!prompt) {
    return NextResponse.json({ reply: "'prompt' (instruction/developer output) is required." }, { status: 400 });
  }

  const messages = [
    { role: "system", content: "You are a critical QA agent. Always verify, test, and never allow unsafe changes. Request clarification if instructions are ambiguous. Be concise and clear." },
    { role: "user", content: prompt + (context ? `\n\nProject Context/Files:\n${context}` : "") }
  ];

  try {
    const llmResponse = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${DEEPSEEK_OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://your-app-url.com", 
        "X-Title": "CodePilot QA Agent" 
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages
      })
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error(`[QAAgent-DeepSeek] LLM call failed with status ${llmResponse.status}:`, errorText);
      return NextResponse.json({ reply: `QA Agent (DeepSeek) API call failed. Status: ${llmResponse.status}. Details: ${errorText.slice(0,500)}` }, { status: llmResponse.status });
    }

    const data = await llmResponse.json();
    const reply = data?.choices?.[0]?.message?.content || "No content in response from LLM.";

    console.log("[QAAgent-DeepSeek] Interaction Log:", {
      requestBody: { promptLength: prompt.length, contextLength: context?.length || 0 },
      // llmRawResponseForAudit: data, // Consider if logging full response is needed
      extractedReplyLength: reply.length
    });
    
    return NextResponse.json({ reply });

  } catch (error: any) {
    console.error('[QAAgent-DeepSeek] Unexpected error:', error);
    return NextResponse.json({ reply: `QA Agent (DeepSeek): Internal Server Error. Details: ${error.message || String(error)}` }, { status: 500 });
  }
}
