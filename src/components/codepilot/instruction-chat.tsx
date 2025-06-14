
import React, { useState, useRef, useEffect } from "react";

type Message = {
  from: "user" | "developer" | "qa" | "system"; // Added system for potential system messages
  content: string;
  timestamp: number;
};

export default function InstructionChat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [agent, setAgent] = useState<"developer" | "qa">("developer");
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false); // For both transcription and agent response

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mimeTypeRef = useRef<string>('');


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
  }

  function handleAgentSwitch(next: "developer" | "qa") {
    setAgent(next);
  }

  async function handleMicClick() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      // Stream stopping and state update is handled in onstop or useEffect cleanup
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMessages(prev => [...prev, {from: 'system', content: "Microphone not supported by your browser.", timestamp: Date.now()}]);
      return;
    }

    setInput(''); // Clear input before new recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      
      const options = { mimeType: 'audio/webm;codecs=opus' };
      let recorder: MediaRecorder;

      if (MediaRecorder.isTypeSupported(options.mimeType)) {
        recorder = new MediaRecorder(stream, options);
        mimeTypeRef.current = options.mimeType;
      } else if (MediaRecorder.isTypeSupported('audio/webm')) { // Fallback
        recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mimeTypeRef.current = 'audio/webm';
      } else {
        setMessages(prev => [...prev, {from: 'system', content: "No suitable audio recording format supported by your browser.", timestamp: Date.now()}]);
        console.error("No supported mimeType for MediaRecorder");
        stream.getTracks().forEach(track => track.stop()); // Clean up stream
        audioStreamRef.current = null;
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
        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
            audioStreamRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current });
        audioChunksRef.current = [];

        if (audioBlob.size === 0) {
            console.warn("Recorded audio blob is empty.");
            setMessages(prev => [...prev, {from: 'system', content: "Recording was empty or too short.", timestamp: Date.now()}]);
            setLoading(false); // End any potential loading state
            return;
        }
        setLoading(true); 

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
                      mimeType: mimeTypeRef.current,
                    }),
                });
                const data = await resp.json();
                if (resp.ok && data.transcript) {
                    setInput((prev) => (prev ? prev + " " : "") + data.transcript);
                } else {
                    console.error("Whisper API error:", data.error || 'Unknown error');
                    setMessages(prev => [...prev, {from: 'system', content: `Transcription failed: ${data.error || 'Unknown error'}`, timestamp: Date.now()}]);
                }
            } catch (error) {
                console.error("Error calling Whisper API:", error);
                setMessages(prev => [...prev, {from: 'system', content: `Transcription request error: ${error instanceof Error ? error.message : String(error)}`, timestamp: Date.now()}]);
            } finally {
                setLoading(false); 
            }
        };
        reader.onerror = (error) => {
            console.error("FileReader error:", error);
            setMessages(prev => [...prev, {from: 'system', content: "Error processing recorded audio.", timestamp: Date.now()}]);
            setLoading(false);
        }
      };
      mediaRecorderRef.current.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        setMessages(prev => [...prev, {from: 'system', content: "Error during recording.", timestamp: Date.now()}]);
        setRecording(false);
        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
            audioStreamRef.current = null;
        }
      }

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setMessages(prev => [...prev, {from: 'system', content: `Microphone access error: ${err instanceof Error ? err.message : String(err)}. Please check browser permissions.`, timestamp: Date.now()}]);
      setRecording(false);
    }
  }

  async function handleSend() {
    if (!input.trim()) return;
    setLoading(true);

    const userMessage: Message = { from: "user", content: input, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput(""); 

    try {
      const resp = await fetch("/api/dispatch-instruction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType: agent,
          instruction: currentInput,
          // files: {}, // Future: Add file context if needed by agents
          // language: "typescript", // Future: Add if needed
          // framework: "nextjs" // Future: Add if needed
        }),
      });
      
      const data = await resp.json();

      if (!resp.ok) {
        // Use content from error response if available, otherwise generic message
        const errorContent = data?.content || data?.error || `Agent call failed with status ${resp.status}`;
        setMessages((prev) => [...prev, {from: agent, content: `Error: ${errorContent}`, timestamp: Date.now()}]);
        // throw new Error(errorContent); // Or handle more gracefully
      } else if (data.result && data.result.chatLog && Array.isArray(data.result.chatLog)) {
         setMessages((prev) => [...prev, ...data.result.chatLog.map((log: any) => ({...log, timestamp: log.timestamp || Date.now()}))]);
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
  
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (audioStreamRef.current) {
         audioStreamRef.current.getTracks().forEach(track => track.stop());
         audioStreamRef.current = null;
      }
    };
  }, []);


  return (
    <div className="flex flex-col h-full bg-[#1B262C] text-white font-code rounded-lg shadow-xl">
      <div className="p-3 border-b border-[#2A3B47] flex justify-center items-center space-x-2">
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.from === 'user' ? 'items-end' : 'items-start'}`}>
            <div 
              className={`max-w-[75%] p-3 shadow-md text-sm ${
                msg.from === "user"
                  ? "bg-[#415A77] text-white rounded-xl rounded-br-none"
                  : msg.from === "developer"
                  ? "bg-slate-700 text-slate-100 rounded-xl rounded-bl-none"
                  : msg.from === "qa"
                  ? "bg-sky-700 text-sky-100 rounded-xl rounded-bl-none"
                  : "bg-gray-600 text-gray-100 rounded-xl rounded-bl-none" // System messages
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold opacity-90">
                  {msg.from.toUpperCase()}
                </span>
                <span className="ml-3 text-xs font-normal opacity-70">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: msg.content.replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-800 p-2 rounded-md my-1 text-xs overflow-x-auto"><code>$1</code></pre>') }}></div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex items-center border-t border-[#2A3B47] p-3 space-x-2 bg-slate-800/50">
        <button
          className={`p-2.5 rounded-full transition-colors ${recording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-[#415A77] hover:bg-[#55708d]"}`}
          onClick={handleMicClick}
          aria-label={recording ? "Stop Recording" : "Record Voice"}
          disabled={loading && !recording} // Allow stopping recording even if another type of loading is true
        >
          {/* Using simple emoji, can be replaced with an SVG icon from lucide-react */}
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
          className="flex-1 bg-[#23313f] text-white rounded-lg p-2.5 resize-none border border-slate-600 focus:ring-2 focus:ring-[#778DA9] focus:border-transparent placeholder-slate-400 text-sm"
          rows={2}
          placeholder={loading ? "Agent is thinking..." : (recording ? "Recording..." : "Type your instruction or use the mic…")}
          disabled={loading || recording}
        />
        <button
          onClick={handleSend}
          className="bg-[#778DA9] hover:bg-[#647a96] text-white px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={loading || recording || !input.trim()}
          aria-label="Send instruction"
        >
          {loading && !recording ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
