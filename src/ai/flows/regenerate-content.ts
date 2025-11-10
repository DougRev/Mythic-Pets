'use server';

/**
 * @fileOverview AI persona and story regeneration flow.
 *
 * - regenerateContent - A function that regenerates AI persona and the story.
 * - RegenerateContentInput - The input type for the regenerateContent function.
 * - RegenerateContentOutput - The return type for the regenerateContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RegenerateContentInputSchema = z.object({
  petName: z.string().describe('The name of the pet.'),
  theme: z.string().describe('The selected theme for the pet persona (e.g., Superhero, Detective).'),
  imageStyle: z.string().describe('The desired image style for the pet persona.'),
  tone: z.string().describe('The tone of the story (e.g., Wholesome, Funny).'),
  length: z.string().describe('The length of the story (e.g., Short Post, Story Page).'),
  photoDataUri: z
    .string()
    .describe(
      "A photo of a pet, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type RegenerateContentInput = z.infer<typeof RegenerateContentInputSchema>;

const RegenerateContentOutputSchema = z.object({
  personaImage: z
    .string()
    .describe(
      'The AI-generated persona image for the pet, as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // Keep in mind images are poorly compressed (~1MB).
    ),
  personaLore: z.string().describe('A short lore text (100-150 words) describing the pet persona.'),
  storyTitle: z.string().describe('A short title for the generated story.'),
  story: z.string().describe('The generated story based on the pet persona.'),
});
export type RegenerateContentOutput = z.infer<typeof RegenerateContentOutputSchema>;

export async function regenerateContent(input: RegenerateContentInput): Promise<RegenerateContentOutput> {
  return regenerateContentFlow(input);
}

const regenerateContentPrompt = ai.definePrompt({
  name: 'regenerateContentPrompt',
  input: {schema: RegenerateContentInputSchema},
  output: {schema: RegenerateContentOutputSchema},
  prompt: `You are a creative AI assistant that generates imaginative personas and stories for pets.

  Based on the pet's photo, name, and the selected theme, create an AI-generated persona image and a short lore text describing the persona.
  Then, generate a story based on the persona, considering the specified tone and length.

  Pet Name: {{{petName}}}
  Theme: {{{theme}}}
  Image Style: {{{imageStyle}}}
  Tone: {{{tone}}}
  Length: {{{length}}}
  Photo: {{media url=photoDataUri}}

  Output the persona image as a data URI in the 'personaImage' field.
  Output the lore text in the 'personaLore' field.
  Output the story title in the 'storyTitle' field.
  Output the story in the 'story' field.`,
});

const regenerateContentFlow = ai.defineFlow(
  {
    name: 'regenerateContentFlow',
    inputSchema: RegenerateContentInputSchema,
    outputSchema: RegenerateContentOutputSchema,
  },
  async input => {
    // Generate the persona image, lore, and story using the prompt.
    const {output} = await regenerateContentPrompt(input);
    return output!;
  }
);
