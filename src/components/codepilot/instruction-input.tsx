
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Mic, Send, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";

interface InstructionInputProps {
  instruction: string;
  setInstruction: (instruction: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean; // For the main instruction submission to agent
  selectedAgent: 'developer' | 'qa' | null;
}

export function InstructionInput({ instruction, setInstruction, onSubmit, isSubmitting, selectedAgent }: InstructionInputProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);

  const mimeTypeRef = useRef<string>('');

  const startRecording = async () => {
    if (isRecording) return;

    setInstruction(''); // Clear previous instruction before new recording
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
         toast({
          title: "Unsupported Audio Format",
          description: "Your browser does not support suitable audio recording formats.",
          variant: "destructive",
        });
        console.error("No supported mimeType for MediaRecorder");
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
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeTypeRef.current });
        audioChunksRef.current = []; // Clear chunks for next recording

        if (audioStreamRef.current) {
            audioStreamRef.current.getTracks().forEach(track => track.stop());
            audioStreamRef.current = null;
        }
        
        if (audioBlob.size === 0) {
            console.warn("Recorded audio blob is empty.");
            setIsTranscribing(false);
            return;
        }

        setIsTranscribing(true);
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          const audioBase64Data = base64Audio.split(',')[1];

          try {
            const response = await fetch('/api/whisper-transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: audioBase64Data, mimeType: mimeTypeRef.current }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || `Whisper API request failed with status ${response.status}`);
            }

            const result = await response.json();
            setInstruction(result.transcript || '');
            toast({
              title: "Transcription Complete",
              description: "Your voice input has been transcribed.",
            });
          } catch (error) {
            console.error('Error transcribing audio:', error);
            toast({
              title: "Transcription Failed",
              description: error instanceof Error ? error.message : "An unknown error occurred during transcription.",
              variant: "destructive",
            });
             setInstruction(''); // Clear instruction on error
          } finally {
            setIsTranscribing(false);
          }
        };
        reader.onerror = (error) => {
            console.error("FileReader error:", error);
            toast({
                title: "File Reading Error",
                description: "Could not process the recorded audio.",
                variant: "destructive",
            });
            setIsTranscribing(false);
        };
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone Access Denied",
        description: "Please enable microphone permissions in your browser settings.",
        variant: "destructive",
      });
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); // onstop will handle the rest
      setIsRecording(false);
      // Stream is stopped in onstop
    }
  };

  const handleToggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  
  // Cleanup effect
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
    <div className="flex flex-col gap-4 p-4 border rounded-lg shadow-sm bg-card">
      <h2 className="text-xl font-semibold font-headline">Instruction Input</h2>
      <div className="relative">
        <Textarea
          placeholder={isRecording ? "Recording audio..." : (isTranscribing ? "Transcribing audio..." : "Type your instruction or use voice input...")}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          rows={4}
          className="font-code bg-background text-foreground pr-20"
          aria-label="Instruction Input"
          disabled={isRecording || isTranscribing}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleRecording}
          className={cn(
            "absolute top-2 right-2 text-foreground hover:text-accent-foreground",
            isRecording && "text-destructive hover:text-destructive/80 animate-pulse"
          )}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
          disabled={isTranscribing}
        >
          {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
      </div>
      <Button 
        onClick={onSubmit} 
        disabled={isSubmitting || !instruction.trim() || !selectedAgent || isRecording || isTranscribing}
        className="w-full"
        aria-label="Submit instruction"
      >
        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 
         isTranscribing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Transcribing...</> : 
         <><Send className="mr-2 h-4 w-4" /> Submit to {selectedAgent ? selectedAgent.charAt(0).toUpperCase() + selectedAgent.slice(1) : 'Agent'}</>}
      </Button>
    </div>
  );
}
