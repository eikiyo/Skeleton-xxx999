// src/ai/flows/generate-code-snippet.ts
'use server';

/**
 * @fileOverview Generates a code snippet or file template based on a high-level feature request.
 *
 * - generateCodeSnippet - A function that generates the code snippet.
 * - GenerateCodeSnippetInput - The input type for the generateCodeSnippet function.
 * - GenerateCodeSnippetOutput - The return type for the generateCodeSnippet function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCodeSnippetInputSchema = z.object({
  featureRequest: z.string().describe('A high-level description of the feature to implement.'),
  programmingLanguage: z.string().describe('The programming language for the code snippet.'),
  framework: z.string().optional().describe('The framework or library to use (e.g., React, Angular, Vue).'),
  existingCodeContext: z.string().optional().describe('Existing code that provides context for the new snippet.'),
});

export type GenerateCodeSnippetInput = z.infer<typeof GenerateCodeSnippetInputSchema>;

const GenerateCodeSnippetOutputSchema = z.object({
  codeSnippet: z.string().describe('The generated code snippet or file template.'),
  explanation: z.string().describe('A brief explanation of the generated code.'),
});

export type GenerateCodeSnippetOutput = z.infer<typeof GenerateCodeSnippetOutputSchema>;

export async function generateCodeSnippet(input: GenerateCodeSnippetInput): Promise<GenerateCodeSnippetOutput> {
  return generateCodeSnippetFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCodeSnippetPrompt',
  input: {schema: GenerateCodeSnippetInputSchema},
  output: {schema: GenerateCodeSnippetOutputSchema},
  prompt: `You are a code generation expert.  You generate code snippets and file templates based on high-level feature requests.  The user will specify the programming language and optionally a framework.

  Feature Request: {{{featureRequest}}}
  Programming Language: {{{programmingLanguage}}}
  Framework: {{#if framework}}{{{framework}}}{{else}}None{{/if}}
  Existing Code Context: {{#if existingCodeContext}}{{{existingCodeContext}}}{{else}}None{{/if}}

  Generate a code snippet or file template that implements the feature request.  Also, provide a brief explanation of the code.
  `,
});

const generateCodeSnippetFlow = ai.defineFlow(
  {
    name: 'generateCodeSnippetFlow',
    inputSchema: GenerateCodeSnippetInputSchema,
    outputSchema: GenerateCodeSnippetOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
