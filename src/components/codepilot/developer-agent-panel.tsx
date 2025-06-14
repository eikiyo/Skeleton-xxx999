
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface DeveloperAgentPanelProps {
  addLog: (message: string, type?: 'info' | 'error' | 'success' | 'agent') => void;
}

export function DeveloperAgentPanel({ addLog }: DeveloperAgentPanelProps) {
  const [api, setApi] = useState('');
  const [role, setRole] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    addLog(`Developer Agent: Submit clicked. API: "${api}", Role: "${role}", Instructions: "${instructions}"`, "agent");
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000)); 
    // try {
    //   // Placeholder for actual API call using api, role, instructions
    //   // const result = await someDeveloperAgentApiCall({ api, role, instructions });
    //   // addLog("Developer Agent: Processed successfully.", "success");
    //   addLog("Developer Agent: Submitted (mocked).", "success");
    // } catch (error) {
    //   const errorMessage = error instanceof Error ? error.message : String(error);
    //   addLog(`Developer Agent: Error - ${errorMessage}`, "error");
    // } finally {
    //   setIsLoading(false);
    // }
    setIsLoading(false); // Remove this line if actual API call logic is added above
  };
  

  return (
    <Card className="w-full h-full flex flex-col shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline">Developer Agent</CardTitle>
        <CardDescription>Configure the Developer Agent.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 flex-grow overflow-y-auto">
        <div className="space-y-2">
          <Label htmlFor="dev-api">API</Label>
          <Input 
            id="dev-api" 
            value={api} 
            onChange={(e) => setApi(e.target.value)} 
            placeholder="Enter API endpoint or key" 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="dev-role">Role</Label>
          <Textarea
            id="dev-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Define the agent's role or persona..."
            rows={3}
            className="font-code"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dev-instructions">Instructions</Label>
          <Textarea
            id="dev-instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Provide specific instructions for the agent..."
            rows={5}
            className="font-code"
          />
        </div>
        
        <Button onClick={handleSubmit} disabled={isLoading} className="w-full mt-auto">
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Submit to Developer Agent
        </Button>

      </CardContent>
    </Card>
  );
}
