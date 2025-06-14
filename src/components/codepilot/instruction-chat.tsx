
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLogs, type LogEntry } from "@/context/LogContext"; // Import useLogs and LogEntry
import { cn } from "@/lib/utils"; // For conditional classnames

// AgentType for this component
type ChatAgentType = "developer" | "qa";

export default function InstructionChat() {
  const [input, setInput] = useState("");
  const { logs, addLog } = useLogs(); // Use global logs
  const [currentAgent, setCurrentAgent] = useState<ChatAgentType>("developer");
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false); 

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mimeTypeRef = useRef<string>('');

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(scrollToBottom, [logs]); // Scroll when global logs change

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
  }

  function handleAgentSwitch(next: ChatAgentType) {
    setCurrentAgent(next);
    addLog({ source: 'system', message: `Switched to ${next.toUpperCase()} agent.` });
  }

  async function handleMicClick() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      // Stream stopping and state update is handled in onstop or useEffect cleanup
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      addLog({ source: 'system', message: "Microphone not supported by your browser."});
      return;
    }

    setInput(''); 
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      
      const options = { mimeType: 'audio/webm;codecs=opus' };
      let recorder: MediaRecorder;

      if (MediaRecorder.isTypeSupported(options.mimeType)) {
        recorder = new MediaRecorder(stream, options);
        mimeTypeRef.current = options.mimeType;
      } else if (MediaRecorder.isTypeSupported('audio/webm')) { 
        recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mimeTypeRef.current = 'audio/webm';
      } else {
        addLog({source: 'system', message: "No suitable audio recording format supported by your browser."});
        console.error("No supported mimeType for MediaRecorder");
        stream.getTracks().forEach(track => track.stop()); 
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
        setIsRecording(false); 
        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
            audioStreamRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current });
        audioChunksRef.current = [];

        if (audioBlob.size === 0) {
            console.warn("Recorded audio blob is empty.");
            addLog({source: 'system', message: "Recording was empty or too short."});
            setIsLoading(false); 
            return;
        }
        setIsLoading(true); 

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
                    addLog({source: 'system', message: "Transcription successful."});
                } else {
                    console.error("Whisper API error:", data.error || 'Unknown error');
                    addLog({source: 'system', message: `Transcription failed: ${data.error || 'Unknown error'}`});
                }
            } catch (error) {
                console.error("Error calling Whisper API:", error);
                addLog({source: 'system', message: `Transcription request error: ${error instanceof Error ? error.message : String(error)}`});
            } finally {
                setIsLoading(false); 
            }
        };
        reader.onerror = (error) => {
            console.error("FileReader error:", error);
            addLog({source: 'system', message: "Error processing recorded audio."});
            setIsLoading(false);
        }
      };
      mediaRecorderRef.current.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        addLog({source: 'system', message: "Error during recording."});
        setIsRecording(false);
        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
            audioStreamRef.current = null;
        }
      }

      mediaRecorderRef.current.start();
      setIsRecording(true);
      addLog({source: 'system', message: "Recording started..."});
    } catch (err) {
      console.error("Error accessing microphone:", err);
      addLog({source: 'system', message: `Microphone access error: ${err instanceof Error ? err.message : String(err)}. Please check browser permissions.`});
      setIsRecording(false);
    }
  }

  async function handleSend() {
    if (!input.trim()) return;
    setIsLoading(true);

    addLog({ source: "user", message: input });
    const currentInput = input;
    setInput(""); 

    try {
      const resp = await fetch("/api/dispatch-instruction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentType: currentAgent,
          instruction: currentInput,
        }),
      });
      
      const data = await resp.json();

      if (!resp.ok) {
        const errorContent = data?.content || data?.error || `Agent call failed with status ${resp.status}`;
        addLog({source: currentAgent, message: `Error: ${errorContent}`});
      } else if (data.result && data.result.chatLog && Array.isArray(data.result.chatLog)) {
         data.result.chatLog.forEach((log: any) => addLog({ source: log.from || currentAgent, message: log.content }));
      } else {
         addLog({source: currentAgent, message: "Received an empty or unexpected response from the agent."});
      }

    } catch (error) {
      console.error("Error dispatching instruction:", error);
      addLog({source: currentAgent, message: `Error: ${error instanceof Error ? error.message : String(error)}`});
    } finally {
      setIsLoading(false);
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

  const getMessageBubbleClass = (source: LogEntry['source']) => {
    switch (source) {
      case 'user':
        return "bg-[#415A77] text-white rounded-xl rounded-br-none self-end";
      case 'developer':
        return "bg-slate-700 text-slate-100 rounded-xl rounded-bl-none self-start";
      case 'qa':
        return "bg-sky-700 text-sky-100 rounded-xl rounded-bl-none self-start";
      case 'system':
      case 'info':
      case 'error':
      case 'success':
      case 'agent': // Generic agent, could be styled differently or fallback to system
      case 'git':
      case 'shell':
        return "bg-gray-600 text-gray-100 rounded-xl rounded-bl-none self-start";
      default:
        return "bg-slate-700 text-slate-100 rounded-xl rounded-bl-none self-start";
    }
  };
  
  const chatLogs = logs.filter(log => ['user', 'developer', 'qa', 'system', 'agent'].includes(log.source));


  return (
    <div className="flex flex-col h-full bg-[#1B262C] text-white font-code rounded-lg shadow-xl">
      <div className="p-3 border-b border-[#2A3B47] flex justify-center items-center space-x-2">
        <span className="text-sm text-slate-400">Agent:</span>
        <button
          className={`px-3 py-1 text-sm rounded-md transition-colors ${currentAgent === "developer" ? "bg-[#778DA9] text-white" : "bg-slate-700 hover:bg-slate-600"}`}
          onClick={() => handleAgentSwitch("developer")}
          disabled={isLoading || isRecording}
        >
          Developer
        </button>
        <button
          className={`px-3 py-1 text-sm rounded-md transition-colors ${currentAgent === "qa" ? "bg-[#778DA9] text-white" : "bg-slate-700 hover:bg-slate-600"}`}
          onClick={() => handleAgentSwitch("qa")}
          disabled={isLoading || isRecording}
        >
          QA
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatLogs.map((log) => (
          <div key={log.id} className={`flex flex-col ${log.source === 'user' ? 'items-end' : 'items-start'}`}>
            <div 
              className={cn("max-w-[75%] p-3 shadow-md text-sm", getMessageBubbleClass(log.source))}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold opacity-90">
                  {log.source.toUpperCase()}
                </span>
                <span className="ml-3 text-xs font-normal opacity-70">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="whitespace-pre-wrap break-words" dangerouslySetInnerHTML={{ __html: log.message.replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-800 p-2 rounded-md my-1 text-xs overflow-x-auto"><code>$1</code></pre>') }}></div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex items-center border-t border-[#2A3B47] p-3 space-x-2 bg-slate-800/50">
        <button
          className={`p-2.5 rounded-full transition-colors ${isRecording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-[#415A77] hover:bg-[#55708d]"}`}
          onClick={handleMicClick}
          aria-label={isRecording ? "Stop Recording" : "Record Voice"}
          disabled={isLoading && !isRecording} 
        >
          {isRecording ? '⏹️' : '🎤'} 
        </button>
        <textarea
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !isLoading && !isRecording) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="flex-1 bg-[#23313f] text-white rounded-lg p-2.5 resize-none border border-slate-600 focus:ring-2 focus:ring-[#778DA9] focus:border-transparent placeholder-slate-400 text-sm"
          rows={2}
          placeholder={isLoading ? "Agent is thinking..." : (isRecording ? "Recording..." : "Type your instruction or use the mic…")}
          disabled={isLoading || isRecording}
        />
        <button
          onClick={handleSend}
          className="bg-[#778DA9] hover:bg-[#647a96] text-white px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isLoading || isRecording || !input.trim()}
          aria-label="Send instruction"
        >
          {isLoading && !isRecording ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
