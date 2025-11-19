'use server';

/**
 * @fileOverview This file defines a Genkit flow for regenerating AI persona lore based on user feedback.
 *
 * - regenerateAiLore -  A function that takes persona details and user feedback to generate new lore.
 * - RegenerateAiLoreInput - The input type for the regenerateAiLore function.
 * - RegenerateAiLoreOutput - The return type for the regenerateAiLore function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const RegenerateAiLoreInputSchema = z.object({
  petName: z.string().describe('The name of the pet.'),
  theme: z.string().describe('The narrative theme for the AI persona (e.g., Superhero, Detective, Knight).'),
  feedback: z.string().describe('User feedback or specific direction for the new lore.'),
});
export type RegenerateAiLoreInput = z.infer<typeof RegenerateAiLoreInputSchema>;

const RegenerateAiLoreOutputSchema = z.object({
  newLoreText: z.string().describe('The newly generated lore text for the pet persona.'),
});
export type RegenerateAiLoreOutput = z.infer<typeof RegenerateAiLoreOutputSchema>;

export async function regenerateAiLore(input: RegenerateAiLoreInput): Promise<RegenerateAiLoreOutput> {
  return regenerateAiLoreFlow(input);
}

const regenerateLorePrompt = ai.definePrompt({
    name: 'regenerateAiPersonaLorePrompt',
    input: {schema: RegenerateAiLoreInputSchema},
    output: {schema: RegenerateAiLoreOutputSchema},
    model: googleAI.model('gemini-2.5-flash'),
    prompt: `You are a creative AI that writes lore for pet personas.
    The pet's name is {{{petName}}}.
    The theme for the persona is: {{{theme}}}.
    The user wants you to regenerate the lore based on this feedback: {{{feedback}}}.

    Based on the theme and the new feedback, write a new, short, engaging lore text (100-150 words) for {{{petName}}}.
    Make sure to feature {{{petName}}} as the main character of the new lore.`,
});


const regenerateAiLoreFlow = ai.defineFlow(
  {
    name: 'regenerateAiLoreFlow',
    inputSchema: RegenerateAiLoreInputSchema,
    outputSchema: RegenerateAiLoreOutputSchema,
  },
  async input => {
    const { output } = await regenerateLorePrompt(input);
    
    if (!output) {
        throw new Error('Failed to regenerate persona lore. The AI did not return any text.');
    }

    return {
      newLoreText: output.newLoreText,
    };
  }
);
