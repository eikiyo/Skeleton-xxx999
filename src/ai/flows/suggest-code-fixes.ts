
// Implemented by Gemini.
'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting code fixes based on test results.
 *
 * - suggestCodeFixes - A function that takes code and test results and returns suggested fixes.
 * - SuggestCodeFixesInput - The input type for the suggestCodeFixes function.
 * - SuggestCodeFixesOutput - The return type for the suggestCodeFixes function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestCodeFixesInputSchema = z.object({
  code: z.string().describe('The code to be analyzed.'),
  testResults: z.string().describe('The results of running tests on the code.'),
});
export type SuggestCodeFixesInput = z.infer<typeof SuggestCodeFixesInputSchema>;

const SuggestCodeFixesOutputSchema = z.object({
  fixes: z.array(
    z.object({
      description: z.string().describe('A description of the suggested fix.'),
      patch: z.string().describe('A patch representing the suggested fix.'),
    })
  ).describe('An array of suggested fixes.'),
});
export type SuggestCodeFixesOutput = z.infer<typeof SuggestCodeFixesOutputSchema>;

export async function suggestCodeFixes(input: SuggestCodeFixesInput): Promise<SuggestCodeFixesOutput> {
  return suggestCodeFixesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestCodeFixesPrompt',
  input: {schema: SuggestCodeFixesInputSchema},
  output: {schema: SuggestCodeFixesOutputSchema},
  prompt: `You are a code analysis expert. Review the provided code and test results and suggest fixes.

  Present the fixes as a patch that can be applied to the code.

  Code:
  \`\`\`
  {{{code}}}
  \`\`\`

  Test Results:
  \`\`\`
  {{{testResults}}}
  \`\`\`

  Suggest fixes in the following format:
  {
    "fixes": [
      {
        "description": "Description of the fix",
        "patch": "The patch representing the fix"
      }
    ]
  }`,
});

const suggestCodeFixesFlow = ai.defineFlow(
  {
    name: 'suggestCodeFixesFlow',
    inputSchema: SuggestCodeFixesInputSchema,
    outputSchema: SuggestCodeFixesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
