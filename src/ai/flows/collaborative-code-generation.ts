
'use server';
/**
 * @fileOverview Orchestrates code generation and QA review in a collaborative loop.
 *
 * - collaborativeGenerateCode - The main function to trigger the collaborative generation.
 * - CollaborativeCodeGenerationInput - Input schema for the flow.
 * - CollaborativeCodeGenerationOutput - Output schema for the flow.
 */

import {ai} from '@/ai/genkit';
import type {z} from 'genkit';
import {
  CollaborativeCodeGenerationInputSchema,
  CollaborativeCodeGenerationOutputSchema
} from '@/ai/schemas';
import {
  generateCodeSnippet,
  type GenerateCodeSnippetInput, // Keep for type usage
  type GenerateCodeSnippetOutput,
} from './generate-code-snippet';
import {
  suggestCodeFixes,
  type SuggestCodeFixesInput,
  type SuggestCodeFixesOutput,
} from './suggest-code-fixes';


export type CollaborativeCodeGenerationInput = z.infer<typeof CollaborativeCodeGenerationInputSchema>;
export type CollaborativeCodeGenerationOutput = z.infer<typeof CollaborativeCodeGenerationOutputSchema>;

const MAX_ITERATIONS = 2; // Defines Dev -> QA -> Dev (with feedback) -> QA

const collaborativeCodeGenerationFlowInternal = ai.defineFlow(
  {
    name: 'collaborativeCodeGenerationFlowInternal',
    inputSchema: CollaborativeCodeGenerationInputSchema,
    outputSchema: CollaborativeCodeGenerationOutputSchema,
  },
  async (input) => {
    let currentCode = input.existingCodeContext || '';
    let currentExplanation = '';
    let qaFeedbackForDev = ''; // Accumulates feedback for the developer agent
    let lastDevOutput: GenerateCodeSnippetOutput | null = null;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      ai.log.info(`Collaboration Iteration: ${i + 1} of ${MAX_ITERATIONS}`);

      // 1. Developer Agent generates or refines code
      const devAgentInput: GenerateCodeSnippetInput = {
        featureRequest: input.featureRequest,
        programmingLanguage: input.programmingLanguage,
        framework: input.framework,
        existingCodeContext: i === 0 ? input.existingCodeContext : currentCode, // Use provided context first, then current code
        qaFeedback: qaFeedbackForDev, // Pass QA feedback from previous iteration
      };

      ai.log.info('Calling Developer Agent with input:', devAgentInput);
      try {
        lastDevOutput = await generateCodeSnippet(devAgentInput);
        currentCode = lastDevOutput.codeSnippet;
        currentExplanation = lastDevOutput.explanation;
        qaFeedbackForDev = ''; // Reset for next potential feedback
        ai.log.info('Developer Agent output received.');
      } catch (devError) {
        ai.log.error('Developer Agent error:', devError);
        return {
          status: 'error',
          message: `Error during Developer Agent phase: ${devError instanceof Error ? devError.message : String(devError)}`,
        };
      }

      // 2. QA Agent reviews the code
      const qaAgentInput: SuggestCodeFixesInput = {
        code: currentCode,
        testResults: "Please review this generated code for correctness, adherence to best practices, potential issues, and alignment with the original request. Provide patches if necessary. Focus on constructive feedback that helps improve the code.",
      };
      ai.log.info('Calling QA Agent with current code.');
      let qaAgentOutput: SuggestCodeFixesOutput;
      try {
        qaAgentOutput = await suggestCodeFixes(qaAgentInput);
        ai.log.info('QA Agent output received:', qaAgentOutput);
      } catch (qaError) {
        ai.log.error('QA Agent error:', qaError);
        return {
          status: 'error',
          message: `Error during QA Agent phase: ${qaError instanceof Error ? qaError.message : String(qaError)}`,
          finalCodeSnippet: currentCode, // Provide current code even if QA fails
          explanation: currentExplanation,
        };
      }

      if (!qaAgentOutput.fixes || qaAgentOutput.fixes.length === 0) {
        ai.log.info('QA Agent found no issues. Collaboration successful.');
        return {
          finalCodeSnippet: currentCode,
          explanation: currentExplanation,
          status: 'success',
          message: 'Code generated and reviewed successfully by AI agents.',
        };
      }

      // QA Agent has fixes
      const aggregatedQaFeedback = qaAgentOutput.fixes
        .map(fix => `Issue Description: ${fix.description}\nSuggested Patch:\n${fix.patch}`)
        .join('\n\n---\n\n');
      
      if (i < MAX_ITERATIONS - 1) {
        // More iterations left, prepare feedback for the Developer agent
        qaFeedbackForDev = aggregatedQaFeedback;
        ai.log.info(`QA Agent has ${qaAgentOutput.fixes.length} fixes. Preparing for next iteration.`);
      } else {
        // Max iterations reached, and QA still has fixes
        ai.log.info('Max iterations reached. QA still has fixes. Needs user clarification.');
        return {
          status: 'needs_clarification',
          message: `AI agents collaborated but could not fully resolve issues after ${MAX_ITERATIONS} iterations. The QA agent provided the following feedback on the last version. Please review the request or the code.`,
          finalCodeSnippet: currentCode,
          explanation: currentExplanation,
          qaFeedbackOnFinalIteration: aggregatedQaFeedback,
        };
      }
    }
    // This part should ideally not be reached if loop logic is correct and returns are handled.
    // However, as a fallback:
    ai.log.warn('Collaborative generation loop completed without explicit success or clarification.');
    return {
      status: 'needs_clarification', // Or 'error' depending on desired behavior
      message: 'Collaboration loop finished. Review the latest code and feedback.',
      finalCodeSnippet: currentCode,
      explanation: currentExplanation,
      qaFeedbackOnFinalIteration: qaFeedbackForDev, // Contains last QA feedback if loop ended here
    };
  }
);

export async function collaborativeGenerateCode(
  input: CollaborativeCodeGenerationInput
): Promise<CollaborativeCodeGenerationOutput> {
  return collaborativeCodeGenerationFlowInternal(input);
}
