"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Mic, Send, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InstructionInputProps {
  instruction: string;
  setInstruction: (instruction: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  selectedAgent: 'developer' | 'qa' | null;
}

export function InstructionInput({ instruction, setInstruction, onSubmit, isSubmitting, selectedAgent }: InstructionInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        recognitionRef.current = new SpeechRecognitionAPI();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          setInstruction(prev => prev + finalTranscript + interimTranscript);
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error', event.error);
          setIsRecording(false);
        };
        
        recognitionRef.current.onend = () => {
          if (isRecording) { // If it ended unexpectedly while still supposed to be recording
             // console.log("Speech recognition ended, restarting if still isRecording");
             // recognitionRef.current?.start(); // Keep it off to avoid loops if permissions are weird
          }
        };
      }
    } else {
      console.warn('Speech Recognition API not supported in this browser.');
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, [isRecording, setInstruction]);

  const handleToggleRecording = () => {
    if (!recognitionRef.current) {
        alert("Speech Recognition API is not available in this browser.");
        return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setInstruction(''); // Clear previous instruction
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg shadow-sm bg-card">
      <h2 className="text-xl font-semibold font-headline">Instruction Input</h2>
      <div className="relative">
        <Textarea
          placeholder="Type your instruction or use voice input..."
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          rows={4}
          className="font-code bg-background text-foreground pr-20"
          aria-label="Instruction Input"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleRecording}
          className={cn(
            "absolute top-2 right-2 text-foreground hover:text-accent-foreground",
            isRecording && "text-destructive hover:text-destructive/80"
          )}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
      </div>
      <Button 
        onClick={onSubmit} 
        disabled={isSubmitting || !instruction.trim() || !selectedAgent}
        className="w-full"
        aria-label="Submit instruction"
      >
        <Send className="mr-2 h-4 w-4" />
        {isSubmitting ? 'Submitting...' : `Submit to ${selectedAgent ? selectedAgent.charAt(0).toUpperCase() + selectedAgent.slice(1) : 'Agent'}`}
      </Button>
    </div>
  );
}
