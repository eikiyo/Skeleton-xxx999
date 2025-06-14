
import { type NextRequest, NextResponse } from 'next/server';

const OPEN_SOURCE_LLM_API_URL = process.env.DEVELOPER_API_URL;
const LLM_API_KEY = process.env.DEVELOPER_API_KEY;
const GUARDRAIL_PROMPT = process.env.DEVELOPER_GUARDRAIL_PROMPT;

export async function POST(req: NextRequest) {
  if (!OPEN_SOURCE_LLM_API_URL || !LLM_API_KEY || !GUARDRAIL_PROMPT) {
    console.error('[DeveloperAgent] Missing required environment variables (DEVELOPER_API_URL, DEVELOPER_API_KEY, DEVELOPER_GUARDRAIL_PROMPT)');
    return NextResponse.json({ error: 'Server configuration error: Missing required environment variables.' }, { status: 500 });
  }

  let body;
  try {
    body = await req.json();
  } catch (error) {
    console.error('[DeveloperAgent] Invalid JSON body:', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { featureRequest, files, language, framework } = body;

  if (!featureRequest) {
    return NextResponse.json({ error: 'featureRequest is required in the request body' }, { status: 400 });
  }

  // Compose full prompt for LLM
  const prompt = `
${GUARDRAIL_PROMPT}
User Feature Request: ${featureRequest}
${files ? `\nExisting Project Context:\n${JSON.stringify(files).slice(0, 2000)}` : ''}
${language ? `\nPreferred Language: ${language}` : ''}
${framework ? `\nFramework: ${framework}` : ''}
`;

  try {
    const llmResponse = await fetch(OPEN_SOURCE_LLM_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LLM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt }) // Assuming the target LLM API expects a 'prompt' field in its JSON body
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error(`[DeveloperAgent] LLM call failed with status ${llmResponse.status}:`, errorText);
      return NextResponse.json({ error: 'LLM call failed', details: errorText }, { status: llmResponse.status });
    }

    const result = await llmResponse.json();

    // Audit log (append request/response to file or cloud logging)
    // (This is a simple console log; replace with persistent logging for production)
    console.log('[DeveloperAgent] Interaction Log:', {
      requestBody: { featureRequest, language, framework, filesCount: files ? Object.keys(files).length : 0 }, // Avoid logging potentially large 'files' content directly
      composedPromptLength: prompt.length, // Log prompt length instead of full prompt if it's too verbose
      llmResult: result // Consider summarizing or truncating llmResult if it can be very large
    });

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('[DeveloperAgent] Unexpected error during LLM call or processing:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message || String(error) }, { status: 500 });
  }
}
