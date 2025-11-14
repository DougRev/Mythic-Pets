'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating an AI persona for a pet based on a user-provided image and theme.
 *
 * - generateAiPersona -  A function that takes an image of a pet and a theme, and generates an AI persona with lore.
 * - GenerateAiPersonaInput - The input type for the generateAiPersona function.
 * - GenerateAiPersonaOutput - The return type for the generateAiPersona function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const GenerateAiPersonaInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a pet, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
  theme: z.string().describe('The theme for the AI persona (e.g., Superhero, Detective, Knight).'),
  prompt: z.string().optional().describe('Optional user prompt for more specific direction.'),
});
export type GenerateAiPersonaInput = z.infer<typeof GenerateAiPersonaInputSchema>;

const GenerateAiPersonaOutputSchema = z.object({
  personaImage: z
    .string()
    .describe(
      'The AI-generated image of the pet persona as a data URI.'
    ),
  loreText: z.string().describe('A short lore text (100-150 words) describing the pet persona.'),
});
export type GenerateAiPersonaOutput = z.infer<typeof GenerateAiPersonaOutputSchema>;

export async function generateAiPersona(input: GenerateAiPersonaInput): Promise<GenerateAiPersonaOutput> {
  return generateAiPersonaFlow(input);
}

const generateImagePrompt = ai.definePrompt({
  name: 'generateAiPersonaImagePrompt',
  input: {schema: GenerateAiPersonaInputSchema},
  model: googleAI.model('gemini-2.5-flash-image'),
  prompt: `You are a creative AI that generates AI personas for pets based on user-provided images and themes.

  Based on the following theme: {{{theme}}},
  And the user's creative direction: {{{prompt}}},
  Generate a persona image for the pet in this photo: {{media url=photoDataUri}}.`,
});

const generateLorePrompt = ai.definePrompt({
    name: 'generateAiPersonaLorePrompt',
    input: {schema: GenerateAiPersonaInputSchema},
    output: {schema: z.object({
        loreText: z.string().describe('A short lore text (100-150 words) describing the pet persona.'),
    })},
    model: googleAI.model('gemini-2.5-flash'),
    prompt: `You are a creative AI that generates lore for pet personas.

    Based on the following theme: {{{theme}}},
    And the user's creative direction: {{{prompt}}},
    Write a short lore text (100-150 words) for the pet in this photo: {{media url=photoDataUri}}.
    The lore should be creative and fit the theme.`,
});


const generateAiPersonaFlow = ai.defineFlow(
  {
    name: 'generateAiPersonaFlow',
    inputSchema: GenerateAiPersonaInputSchema,
    outputSchema: GenerateAiPersonaOutputSchema,
  },
  async input => {
    // Run image and lore generation in parallel
    const [imageResult, loreResult] = await Promise.all([
      ai.generate({ prompt: generateImagePrompt.prompt, model: generateImagePrompt.model, input }),
      generateLorePrompt(input)
    ]);
    
    if (!imageResult.media?.url || !loreResult.output) {
        throw new Error('Failed to generate persona image or lore.');
    }

    return {
      personaImage: imageResult.media.url,
      loreText: loreResult.output.loreText,
    };
  }
);
