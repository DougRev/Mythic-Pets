'use server';

/**
 * @fileOverview This file defines a Genkit flow for regenerating an AI-generated chapter image based on user feedback.
 *
 * - regenerateChapterImage - A function that takes chapter details and user feedback to generate a new image.
 * - RegenerateChapterImageInput - The input type for the function.
 * - RegenerateChapterImageOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const RegenerateChapterImageInputSchema = z.object({
  chapterText: z.string().describe('The text content of the chapter.'),
  personaImage: z.string().describe('The data URI of the primary persona image to maintain style consistency.'),
  feedback: z.string().optional().describe('User feedback or specific direction for the new image.'),
});
export type RegenerateChapterImageInput = z.infer<typeof RegenerateChapterImageInputSchema>;

const RegenerateChapterImageOutputSchema = z.object({
  newImageUrl: z
    .string()
    .describe(
      'The newly generated image for the chapter as a data URI.'
    ),
});
export type RegenerateChapterImageOutput = z.infer<typeof RegenerateChapterImageOutputSchema>;

export async function regenerateChapterImage(input: RegenerateChapterImageInput): Promise<RegenerateChapterImageOutput> {
  return regenerateChapterImageFlow(input);
}

const regenerateImagePrompt = ai.definePrompt({
  name: 'regenerateChapterImagePrompt',
  input: {schema: RegenerateChapterImageInputSchema},
  model: googleAI.model('gemini-2.5-flash-image-preview'),
  prompt: `Based on the following chapter text, generate a new, visually compelling scene. The style should be consistent with the provided persona image.

  Chapter Text: {{{chapterText}}}
  Persona Image: {{media url=personaImage}}
  
  Incorporate the following user feedback if provided: "{{{feedback}}}"`,
  config: {
    responseModalities: ['IMAGE'],
  }
});


const regenerateChapterImageFlow = ai.defineFlow(
  {
    name: 'regenerateChapterImageFlow',
    inputSchema: RegenerateChapterImageInputSchema,
    outputSchema: RegenerateChapterImageOutputSchema,
  },
  async input => {
    const { media } = await regenerateImagePrompt(input);
    
    if (!media?.url) {
        throw new Error('Failed to regenerate chapter image. The AI did not return an image.');
    }

    return {
      newImageUrl: media.url,
    };
  }
);
