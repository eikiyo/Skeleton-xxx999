import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-code-fixes.ts';
import '@/ai/flows/generate-code-snippet.ts';
import '@/ai/flows/collaborative-code-generation.ts';
