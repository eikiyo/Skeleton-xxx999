
/**
 * @fileOverview Centralized Zod schemas for AI flows.
 */
import {z} from 'genkit';

// Schemas for generate-code-snippet.ts
export const GenerateCodeSnippetInputSchema = z.object({
  featureRequest: z.string().describe('A high-level description of the feature to implement.'),
  programmingLanguage: z.string().describe('The programming language for the code snippet.'),
  framework: z.string().optional().describe('The framework or library to use (e.g., React, Angular, Vue).'),
  existingCodeContext: z.string().optional().describe('Existing code that provides context for the new snippet.'),
  qaFeedback: z.string().optional().describe('Feedback from QA agent to incorporate into the code generation.'),
});

export const GenerateCodeSnippetOutputSchema = z.object({
  codeSnippet: z.string().describe('The generated code snippet or file template.'),
  explanation: z.string().describe('A brief explanation of the generated code.'),
});

// Schemas for suggest-code-fixes.ts
export const SuggestCodeFixesInputSchema = z.object({
  code: z.string().describe('The code to be analyzed.'),
  testResults: z.string().describe('The results of running tests on the code.'),
});

export const SuggestCodeFixesOutputSchema = z.object({
  fixes: z.array(
    z.object({
      description: z.string().describe('A description of the suggested fix.'),
      patch: z.string().describe('A patch representing the suggested fix. This patch should be in standard diff format.'),
    })
  ).describe('An array of suggested fixes.'),
});

// Schemas for collaborative-code-generation.ts
export const CollaborativeCodeGenerationInputSchema = GenerateCodeSnippetInputSchema.pick({
  featureRequest: true,
  existingCodeContext: true,
}).extend({
  programmingLanguage: z.string().default('typescript').describe("Programming language, defaults to TypeScript"),
  framework: z.string().default('nextjs').describe("Framework, defaults to Next.js"),
});

export const CollaborativeCodeGenerationOutputSchema = z.object({
  finalCodeSnippet: z.string().optional().describe("The final code snippet after collaboration, if successful."),
  explanation: z.string().optional().describe("Explanation of the final code snippet."),
  status: z.enum(['success', 'needs_clarification', 'error']).describe("Status of the collaboration process."),
  message: z.string().describe('Message to the user, detailing status, errors, or clarification needs.'),
  qaFeedbackOnFinalIteration: z.string().optional().describe("QA feedback if clarification is needed on the last iteration.")
});
