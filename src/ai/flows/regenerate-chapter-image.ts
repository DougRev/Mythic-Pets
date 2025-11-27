
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
  prompt: `You are an expert illustrator for a storybook. Your task is to regenerate a scene based on the chapter text and user feedback.

  CRITICAL: The main character's appearance (breed, color, markings, etc.) MUST be consistent with the provided Persona Image. Use the Persona Image as the primary reference for the character. The art style of the generated image should also match the Persona Image.

  IMPORTANT: The pose of the character and the environment should reflect the action, mood, and details described in the chapter text. Create a full scene, not just a portrait.
  
  Incorporate the following user feedback if provided: "{{{feedback}}}"

  Chapter Text: {{{chapterText}}}
  Persona Image: {{media url=personaImage}}`,
  config: {
    responseModalities: ['IMAGE'],
    safetySettings: [
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_ONLY_HIGH',
        },
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
    ]
  },
});


const regenerateChapterImageFlow = ai.defineFlow(
  {
    name: 'regenerateChapterImageFlow',
    inputSchema: RegenerateChapterImageInputSchema,
    outputSchema: RegenerateChapterImageOutputSchema,
  },
  async input => {
    const imageGenResponse = await regenerateImagePrompt(input);
    
    const finishReason = imageGenResponse.finishReason;
    const safetyRatings = imageGenResponse.safetyRatings;

    if (finishReason === 'BLOCKED' && safetyRatings && safetyRatings.length > 0) {
        throw new Error('Image generation was blocked due to safety guidelines. Please try a different creative direction.');
    }

    if (!imageGenResponse.media?.url) {
        throw new Error('Failed to regenerate chapter image. The AI did not return an image.');
    }

    return {
      newImageUrl: imageGenResponse.media.url,
    };
  }
);
