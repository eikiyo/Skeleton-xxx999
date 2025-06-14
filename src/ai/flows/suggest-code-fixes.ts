
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
import {SuggestCodeFixesInputSchema, SuggestCodeFixesOutputSchema} from '@/ai/schemas';
import type {z} from 'genkit';

export type SuggestCodeFixesInput = z.infer<typeof SuggestCodeFixesInputSchema>;
export type SuggestCodeFixesOutput = z.infer<typeof SuggestCodeFixesOutputSchema>;

export async function suggestCodeFixes(input: SuggestCodeFixesInput): Promise<SuggestCodeFixesOutput> {
  return suggestCodeFixesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestCodeFixesPrompt',
  input: {schema: SuggestCodeFixesInputSchema},
  output: {schema: SuggestCodeFixesOutputSchema},
  prompt: `You are a code analysis expert. Review the provided code and test results to suggest fixes.
  Your suggestions must adhere to the following policy:
  1.  **Non-Destructive**: Patches should aim to fix issues or improve code quality without removing essential functionality or introducing breaking changes unless explicitly implied by the test failures.
  2.  **Focused Scope**: Fixes should directly address the issues highlighted by the test results or obvious errors in the provided code. Avoid unrelated refactoring or out-of-scope changes.
  3.  **Clarity**: The patch description should clearly explain the problem and the proposed solution.
  4.  **Patch Format**: Present the fixes as a patch in standard diff format that can be applied to the code.

  Code:
  \`\`\`
  {{{code}}}
  \`\`\`

  Test Results:
  \`\`\`
  {{{testResults}}}
  \`\`\`

  Suggest fixes in the following JSON format only:
  {
    "fixes": [
      {
        "description": "Description of the fix, explaining the problem and the solution.",
        "patch": "The patch in standard diff format. Example:\\n--- a/original_file.js\\n+++ b/modified_file.js\\n@@ -1,4 +1,4 @@\\n console.log(\\"Hello\\");\\n-const oldVar = 10;\\n+const newVar = 20;\\n // end of example line"
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
