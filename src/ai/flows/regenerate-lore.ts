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
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';

if (!getApps().length) {
    initializeApp({ credential: applicationDefault() });
}
const db = getFirestore();

const RegenerateAiLoreInputSchema = z.object({
  petName: z.string().describe('The name of the pet.'),
  theme: z.string().describe('The narrative theme for the AI persona (e.g., Superhero, Detective, Knight).'),
  feedback: z.string().describe('User feedback or specific direction for the new lore.'),
  userId: z.string().describe('The ID of the user requesting the regeneration.'),
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

    const userRef = db.collection('users').doc(input.userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (userData?.planType === 'free') {
        if (userData.generationCredits <= 0) {
            throw new Error('You have no generation credits remaining. Please upgrade to Pro.');
        }
    }

    const { output } = await regenerateLorePrompt(input);
    
    if (!output) {
        throw new Error('Failed to regenerate persona lore. The AI did not return any text.');
    }
    
    // Deduct credit after successful generation for free users
    if (userData?.planType === 'free') {
        await userRef.update({
            generationCredits: FieldValue.increment(-1),
        });
    }

    return {
      newLoreText: output.newLoreText,
    };
  }
);
