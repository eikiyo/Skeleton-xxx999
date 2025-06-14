
import { NextRequest, NextResponse } from 'next/server';

// --- Agent definitions ---
const agents = [
  {
    id: 'qa',
    name: 'QA Agent',
    prompt: 'You are an expert code reviewer and QA analyst. Respond as a helpful QA team member in a group chat with developers and users. Be concise and focus on code quality, potential bugs, and testability. If code is provided, review it. If a general question is asked, provide a QA perspective.',
  },
  {
    id: 'dev',
    name: 'Developer Agent',
    prompt: 'You are a senior software developer. Give clear, technical answers and help with code, bugs, and architecture in a group chat. If a user asks for code, provide it. If they ask for explanations, give them. Be practical and helpful.',
  },
];

// In-memory chat (replace with DB for production)
let conversation = {
  messages: [] as { sender: string, text: string, ts: number }[],
  participants: ['user', ...agents.map(a => a.id)],
};

async function callOpenAI(systemPrompt: string, messages: any[]) {
  // Format for OpenAI's chat/completions API
  const chatMessages = [
    { role: "system", content: systemPrompt },
    // Send only the last few messages to keep context relevant and token count low
    // Also, ensure the LLM sees the sender for context
    ...messages.slice(-10).map(m => ({ // Send last 10 messages
      role: m.sender === 'user' ? 'user' : 'assistant', // Treat agents as 'assistant'
      content: `[${m.sender.toUpperCase()}]: ${m.text}`, // Clarify sender for the LLM
    })),
  ];

  const OPENAI_API_KEY = process.env.OPEN_AI_KEY || process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    console.error("[LLM Call] OPENAI_API_KEY not found in environment.");
    return "Error: LLM API key not configured on the server."; // Return an error message
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // or gpt-4, if you have access
        messages: chatMessages,
        max_tokens: 200, // Increased max_tokens for more complete agent responses
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("[LLM API Error]", res.status, errorBody);
      return `Error: LLM API call failed (${res.status}). Details: ${errorBody.substring(0,100)}`; // Return a truncated error
    }
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    return reply || null;
  } catch (error) {
    console.error("[LLM Call] Fetch error:", error);
    return "Error: Could not connect to LLM service.";
  }
}

export async function POST(req: NextRequest) {
  let sender, text;
  try {
    const body = await req.json();
    sender = body.sender;
    text = body.text;
  } catch (e) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!sender || !text)
    return NextResponse.json({ error: "Missing sender or text" }, { status: 400 });

  // Add user message
  const userMsg = { sender, text, ts: Date.now() };
  conversation.messages.push(userMsg);

  // Collect agent responses
  const agentRepliesGenerated: any[] = [];

  // Determine the last actual message sender to avoid self-reply loops
  const lastMessageSender = conversation.messages.length > 1 ? conversation.messages[conversation.messages.length - 2]?.sender : null;

  for (const agent of agents) {
    // Agent should respond if the user just sent a message,
    // or if another agent sent a message (but not if it was the agent itself)
    if (userMsg.sender === 'user' || (lastMessageSender && lastMessageSender !== agent.id) ) {
      console.log(`[Chat Group] Agent ${agent.id} considering reply to sender ${userMsg.sender}`);
      const reply = await callOpenAI(agent.prompt, conversation.messages);
      if (reply) {
        const agentMsg = {
          sender: agent.id, // Use agent's ID ('dev' or 'qa')
          text: reply,
          ts: Date.now(),
        };
        conversation.messages.push(agentMsg);
        agentRepliesGenerated.push(agentMsg);
      } else {
        console.log(`[Chat Group] Agent ${agent.id} did not reply or an error occurred.`);
      }
    }
  }
  // To keep conversation log from growing indefinitely in memory for this demo
  if (conversation.messages.length > 100) {
    conversation.messages = conversation.messages.slice(-100);
  }


  return NextResponse.json({
    messages: conversation.messages, // Send the full updated list
    participants: conversation.participants,
    newAgentReplies: agentRepliesGenerated, // This might be redundant if 'messages' is full
  });
}

export async function GET() {
  // Return conversation so FE can sync on load
  return NextResponse.json(conversation);
}
