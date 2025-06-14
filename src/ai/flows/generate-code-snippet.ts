
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
  prompt: `You are a code generation expert. Your primary goal is to generate code snippets and file templates based on high-level feature requests.
  Adhere to the following guidelines:
  1.  **Compliance with Coding Standards**: Ensure the generated code follows best practices and common coding standards for the specified language and framework.
  2.  **Repository Context**: If existing code context is provided, make sure the new code integrates well and is consistent with it.
  3.  **Security Policies**: Generate secure code. Avoid common vulnerabilities (e.g., XSS, SQL injection). Do not include secrets or API keys in the code.
  4.  **Clarity and Maintainability**: Produce code that is clear, well-commented where necessary (but avoid excessive comments), and maintainable.

  User's Request Details:
  Feature Request: {{{featureRequest}}}
  Programming Language: {{{programmingLanguage}}}
  Framework: {{#if framework}}{{{framework}}}{{else}}None{{/if}}
  Existing Code Context: {{#if existingCodeContext}}{{{existingCodeContext}}}{{else}}None{{/if}}

  Generate a code snippet or file template that implements the feature request according to all the guidelines above. Also, provide a brief explanation of the generated code.
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

