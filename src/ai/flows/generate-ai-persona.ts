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

const GenerateAiPersonaInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      'A photo of a pet, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // Corrected grammar here
    ),
  theme: z.string().describe('The theme for the AI persona (e.g., Superhero, Detective, Knight).'),
});
export type GenerateAiPersonaInput = z.infer<typeof GenerateAiPersonaInputSchema>;

const GenerateAiPersonaOutputSchema = z.object({
  personaImage: z
    .string()
    .describe(
      'The AI-generated image of the pet persona as a data URI.' // Added description here
    ),
  loreText: z.string().describe('A short lore text (100-150 words) describing the pet persona.'),
});
export type GenerateAiPersonaOutput = z.infer<typeof GenerateAiPersonaOutputSchema>;

export async function generateAiPersona(input: GenerateAiPersonaInput): Promise<GenerateAiPersonaOutput> {
  return generateAiPersonaFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAiPersonaPrompt',
  input: {schema: GenerateAiPersonaInputSchema},
  output: {schema: GenerateAiPersonaOutputSchema},
  prompt: `You are a creative AI that generates AI personas for pets based on user-provided images and themes.

  Based on the following theme: {{{theme}}},
  Generate a persona image and lore for the pet in this photo: {{media url=photoDataUri}}.
  The lore should be about 100-150 words long. Make sure that the lore matches the generated image.

  Return the image as a data URI in personaImage and the lore text in loreText.`, // Corrected template string
});

const generateAiPersonaFlow = ai.defineFlow(
  {
    name: 'generateAiPersonaFlow',
    inputSchema: GenerateAiPersonaInputSchema,
    outputSchema: GenerateAiPersonaOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
