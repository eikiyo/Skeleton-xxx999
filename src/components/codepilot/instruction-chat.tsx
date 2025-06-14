
import React, { useState, useRef, useEffect } from "react";

type Message = {
  from: "user" | "developer" | "qa";
  content: string;
  timestamp: number;
};

export default function InstructionChat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [agent, setAgent] = useState<"developer" | "qa">("developer");
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  // For voice input
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Handle text input change
  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
  }

  // Switch between Developer and QA
  function handleAgentSwitch(next: "developer" | "qa") {
    setAgent(next);
  }

  // Start or stop voice recording
  async function handleMicClick() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      // Stream stopping is handled in onstop or useEffect cleanup
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Microphone not supported by your browser.");
      setMessages(prev => [...prev, {from: 'qa', content: "Microphone not supported by your browser.", timestamp: Date.now()}]);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: 'audio/webm;codecs=opus' };
      let recorder: MediaRecorder;
      if (MediaRecorder.isTypeSupported(options.mimeType)) {
        recorder = new MediaRecorder(stream, options);
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      } else {
        alert("No suitable audio recording format supported.");
        setMessages(prev => [...prev, {from: 'qa', content: "No suitable audio recording format supported.", timestamp: Date.now()}]);
        return;
      }
      
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        setRecording(false); // Set recording to false *before* async operations
        stream.getTracks().forEach(track => track.stop()); // Stop media stream tracks

        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
        audioChunksRef.current = []; // Clear chunks

        if (audioBlob.size === 0) {
            console.warn("Recorded audio blob is empty.");
            setMessages(prev => [...prev, {from: 'qa', content: "Recording was empty.", timestamp: Date.now()}]);
            return;
        }
        setLoading(true); // Indicate transcription is in progress

        // Convert Blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
            const base64AudioWithPrefix = reader.result as string;
            const base64Audio = base64AudioWithPrefix.split(',')[1];

            try {
                const resp = await fetch("/api/whisper-transcribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                    audioBase64: base64Audio,
                    mimeType: mediaRecorderRef.current?.mimeType || 'audio/webm',
                    }),
                });
                const data = await resp.json();
                if (resp.ok && data.transcript) {
                    setInput((prev) => (prev ? prev + " " : "") + data.transcript);
                } else {
                    console.error("Whisper API error:", data.error || 'Unknown error');
                    setMessages(prev => [...prev, {from: 'qa', content: `Transcription failed: ${data.error || 'Unknown error'}`, timestamp: Date.now()}]);
                }
            } catch (error) {
                console.error("Error calling Whisper API:", error);
                setMessages(prev => [...prev, {from: 'qa', content: `Transcription request error: ${error instanceof Error ? error.message : String(error)}`, timestamp: Date.now()}]);
            } finally {
                setLoading(false); // End transcription loading
            }
        };
        reader.onerror = (error) => {
            console.error("FileReader error:", error);
            setMessages(prev => [...prev, {from: 'qa', content: "Error processing recorded audio.", timestamp: Date.now()}]);
            setLoading(false);
        }

      };
      mediaRecorderRef.current.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setMessages(prev => [...prev, {from: 'qa', content: "Error during recording.", timestamp: Date.now()}]);
        setRecording(false);
        stream.getTracks().forEach(track => track.stop());
      }

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please check permissions.");
      setMessages(prev => [...prev, {from: 'qa', content: `Microphone access error: ${err instanceof Error ? err.message : String(err)}`, timestamp: Date.now()}]);
      setRecording(false);
    }
  }

  // Send instruction to backend
  async function handleSend() {
    if (!input.trim()) return;
    setLoading(true);

    const userMessage: Message = { from: "user", content: input, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput(""); // Clear input immediately

    try {
      const resp = await fetch("/api/dispatch-instruction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType: agent,
          instruction: currentInput,
          // files: {}, // Add file context if needed
          // language: "typescript", // Add language if needed
          // framework: "nextjs" // Add framework if needed
        }),
      });
      
      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || `Agent call failed with status ${resp.status}`);
      }
      
      // Assuming backend returns { result: { finalCodeSnippet: "...", explanation: "...", status: "...", message: "...", qaFeedbackOnFinalIteration: "..." } }
      // Or for direct chat log: { result: { chatLog: [{from, content, timestamp}] } }
      // For now, we'll simulate agent responses based on the structure implied by your example
      // This part needs to be adapted based on the actual response from /api/dispatch-instruction

      if (data.result && data.result.chatLog && Array.isArray(data.result.chatLog)) {
         setMessages((prev) => [...prev, ...data.result.chatLog.map((log: any) => ({...log, timestamp: Date.now()}))]);
      } else if (data.result) { // Adapt to current Genkit flow structure
        let agentResponseContent = "";
        if (data.result.finalCodeSnippet) {
            agentResponseContent += `Code:\n\`\`\`\n${data.result.finalCodeSnippet}\n\`\`\`\n`;
        }
        if (data.result.explanation) {
            agentResponseContent += `Explanation: ${data.result.explanation}\n`;
        }
        if (data.result.message) {
            agentResponseContent += `Status: ${data.result.message}\n`;
        }
         if (data.result.qaFeedbackOnFinalIteration) {
            agentResponseContent += `QA Feedback: ${data.result.qaFeedbackOnFinalIteration}\n`;
        }

        if (agentResponseContent) {
             setMessages((prev) => [...prev, {from: agent, content: agentResponseContent, timestamp: Date.now()}]);
        } else {
             setMessages((prev) => [...prev, {from: agent, content: "Received a response, but no specific content to display.", timestamp: Date.now()}]);
        }

      } else {
         setMessages((prev) => [...prev, {from: agent, content: "Received an empty or unexpected response from the agent.", timestamp: Date.now()}]);
      }

    } catch (error) {
      console.error("Error dispatching instruction:", error);
      setMessages((prev) => [...prev, {from: agent, content: `Error: ${error instanceof Error ? error.message : String(error)}`, timestamp: Date.now()}]);
    } finally {
      setLoading(false);
    }
  }
  
  // Cleanup MediaRecorder and stream on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      // Ensure all tracks of the stream are stopped.
      // This logic is partly in onstop, but good to have a fallback.
      if (mediaRecorderRef.current?.stream) {
         mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);


  return (
    <div className="flex flex-col h-full bg-[#1B262C] text-white font-code rounded-lg shadow-xl">
      {/* Agent Switcher and Header - Can be more stylized */}
      <div className="p-3 border-b border-[#415A77] flex justify-center items-center space-x-2">
        <span className="text-sm text-slate-400">Agent:</span>
        <button
          className={`px-3 py-1 text-sm rounded-md transition-colors ${agent === "developer" ? "bg-[#778DA9] text-white" : "bg-slate-700 hover:bg-slate-600"}`}
          onClick={() => handleAgentSwitch("developer")}
          disabled={loading || recording}
        >
          Developer
        </button>
        <button
          className={`px-3 py-1 text-sm rounded-md transition-colors ${agent === "qa" ? "bg-[#778DA9] text-white" : "bg-slate-700 hover:bg-slate-600"}`}
          onClick={() => handleAgentSwitch("qa")}
          disabled={loading || recording}
        >
          QA
        </button>
      </div>

      {/* Chat Log */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[75%] p-3 rounded-lg shadow ${
                msg.from === "user"
                  ? "bg-[#415A77] text-white rounded-br-none"
                  : msg.from === "developer"
                  ? "bg-slate-700 text-slate-100 rounded-bl-none"
                  : "bg-sky-700 text-sky-100 rounded-bl-none" 
              }`}
            >
              <span className="block text-xs font-semibold mb-1 opacity-80">
                {msg.from.toUpperCase()}
                <span className="ml-2 text-xs font-normal opacity-70">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </span>
              <div className="whitespace-pre-wrap text-sm" dangerouslySetInnerHTML={{ __html: msg.content.replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-800 p-2 rounded-md my-1 overflow-x-auto"><code>$1</code></pre>') }}></div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input + Controls */}
      <div className="flex items-center border-t border-[#415A77] p-3 space-x-2 bg-slate-800">
        <button
          className={`p-2 rounded-full transition-colors ${recording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-[#415A77] hover:bg-[#55708d]"}`}
          onClick={handleMicClick}
          aria-label={recording ? "Stop Recording" : "Record Voice"}
          disabled={loading}
        >
          {/* Using a simple emoji, can be replaced with an SVG icon */}
          {recording ? '⏹️' : '🎤'}
        </button>
        <textarea
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !loading && !recording) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="flex-1 bg-[#232d36] text-white rounded-md p-2.5 resize-none border border-slate-600 focus:ring-2 focus:ring-[#778DA9] focus:border-transparent"
          rows={2}
          placeholder={loading ? "Agent is thinking..." : (recording ? "Recording..." : "Type your instruction or use the mic…")}
          disabled={loading || recording}
        />
        <button
          onClick={handleSend}
          className="bg-[#415A77] hover:bg-[#55708d] text-white px-5 py-2.5 rounded-md transition-colors disabled:opacity-50"
          disabled={loading || recording || !input.trim()}
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}

