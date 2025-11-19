'use server';

/**
 * @fileOverview This file defines a Genkit flow for regenerating an AI persona image based on user feedback.
 *
 * - regenerateAiImage -  A function that takes persona details and user feedback to generate a new image.
 * - RegenerateAiImageInput - The input type for the regenerateAiImage function.
 * - RegenerateAiImageOutput - The return type for the regenerateAiImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const RegenerateAiImageInputSchema = z.object({
  petName: z.string().describe('The name of the pet.'),
  theme: z.string().describe('The narrative theme for the AI persona (e.g., Superhero, Detective, Knight).'),
  imageStyle: z.string().describe('The visual art style for the generated image (e.g., Anime, Photorealistic).'),
  originalImageUrl: z.string().describe('The URL of the original image to be regenerated.'),
  feedback: z.string().describe('User feedback or specific direction for the new image.'),
});
export type RegenerateAiImageInput = z.infer<typeof RegenerateAiImageInputSchema>;

const RegenerateAiImageOutputSchema = z.object({
  newImageUrl: z
    .string()
    .describe(
      'The newly generated image of the pet persona as a data URI.'
    ),
});
export type RegenerateAiImageOutput = z.infer<typeof RegenerateAiImageOutputSchema>;

export async function regenerateAiImage(input: RegenerateAiImageInput): Promise<RegenerateAiImageOutput> {
  return regenerateAiImageFlow(input);
}

const regenerateImagePrompt = ai.definePrompt({
  name: 'regenerateAiPersonaImagePrompt',
  input: {schema: RegenerateAiImageInputSchema},
  model: googleAI.model('gemini-2.5-flash-image-preview'),
  prompt: `You are a creative AI that regenerates images for pet personas based on user feedback.
  The original image is here: {{media url=originalImageUrl}}.
  The pet's name is {{{petName}}}.
  The theme for the persona is: {{{theme}}}.
  The art style is: {{{imageStyle}}}.
  
  The user has provided the following feedback to correct the image: "{{{feedback}}}"
  
  Generate a new image that incorporates the user's feedback while staying true to the original theme and style.`,
  config: {
    responseModalities: ['IMAGE'],
  }
});

const regenerateAiImageFlow = ai.defineFlow(
  {
    name: 'regenerateAiImageFlow',
    inputSchema: RegenerateAiImageInputSchema,
    outputSchema: RegenerateAiImageOutputSchema,
  },
  async input => {
    const imageResult = await regenerateImagePrompt(input);
    
    if (!imageResult.media?.url) {
        throw new Error('Failed to regenerate persona image.');
    }

    return {
      newImageUrl: imageResult.media.url,
    };
  }
);

    