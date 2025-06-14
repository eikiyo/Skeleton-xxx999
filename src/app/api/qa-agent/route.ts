
import { type NextRequest, NextResponse } from 'next/server';

const QA_API_URL = process.env.QA_AGENT_API_URL;
const QA_API_KEY = process.env.QA_AGENT_API_KEY;
const QA_GUARDRAIL_PROMPT = process.env.QA_GUARDRAIL_PROMPT;

export async function POST(req: NextRequest) {
  if (!QA_API_URL || !QA_API_KEY || !QA_GUARDRAIL_PROMPT) {
    console.error('[QAAgent] Missing required environment variables (QA_AGENT_API_URL, QA_AGENT_API_KEY, QA_GUARDRAIL_PROMPT)');
    return NextResponse.json({ error: 'Server configuration error: Missing required QA agent environment variables.' }, { status: 500 });
  }

  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch (error) {
    console.error('[QAAgent] Invalid JSON body:', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { files, developerResult } = body;

  if (!developerResult) {
    return NextResponse.json({ error: 'developerResult is required in the request body' }, { status: 400 });
  }
  if (!files) {
    return NextResponse.json({ error: 'files (project context) are required in the request body' }, { status: 400 });
  }

  // Compose prompt for QA LLM
  const prompt = `
${QA_GUARDRAIL_PROMPT}
Project Files: ${JSON.stringify(files).slice(0, 2000)} 
Developer Agent Output: ${typeof developerResult === 'string' ? developerResult : JSON.stringify(developerResult)}
`;

  try {
    const llmResponse = await fetch(QA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${QA_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt }) // Assuming the target LLM API expects a 'prompt' field
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error(`[QAAgent] QA LLM call failed with status ${llmResponse.status}:`, errorText);
      return NextResponse.json({ error: 'QA LLM call failed', details: errorText }, { status: llmResponse.status });
    }

    const result = await llmResponse.json();

    // Audit log (console or persistent)
    console.log('[QAAgent] Interaction Log:', {
      requestBody: { filesCount: Object.keys(files).length, developerResultSummary: String(developerResult).slice(0,100) + '...' }, // Avoid logging potentially large 'files' content directly
      composedPromptLength: prompt.length,
      qaResult: result // Consider summarizing or truncating qaResult if it can be very large
    });

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error('[QAAgent] Unexpected error during QA LLM call or processing:', error);
    return NextResponse.json({ error: 'Internal Server Error during QA processing', details: error.message || String(error) }, { status: 500 });
  }
}
