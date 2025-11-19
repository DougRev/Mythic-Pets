'use server';

/**
 * @fileOverview This file defines a Genkit flow for creating a sharable image from text and another image.
 *
 * - createShareImage - A function that takes text, an image, and generates a composite image suitable for sharing.
 * - CreateShareImageInput - The input type for the function.
 * - CreateShareImageOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

const CreateShareImageInputSchema = z.object({
  imageUrl: z
    .string()
    .describe(
      "The primary image URL, as a data URI or a public URL. This will be the main visual content."
    ),
  title: z.string().describe('The main title text to overlay on the image.'),
  body: z.string().describe('The main body text to overlay on the image. Should be concise.'),
  footerText: z.string().describe('A small footer text, like a watermark or credit.'),
});
export type CreateShareImageInput = z.infer<typeof CreateShareImageInputSchema>;

const CreateShareImageOutputSchema = z.object({
  shareImageUrl: z
    .string()
    .describe(
      'The final, composite image as a data URI, ready to be shared or downloaded.'
    ),
});
export type CreateShareImageOutput = z.infer<typeof CreateShareImageOutputSchema>;

export async function createShareImage(input: CreateShareImageInput): Promise<CreateShareImageOutput> {
  return createShareImageFlow(input);
}

const createShareImagePrompt = ai.definePrompt({
  name: 'createShareImagePrompt',
  input: {schema: CreateShareImageInputSchema},
  model: googleAI.model('gemini-2.5-flash-image-preview'),
  prompt: `You are a graphic designer AI. Your task is to create a visually appealing, sharable image for social media.

  Combine the following elements into a single, cohesive image:
  
  1.  **Main Visual**: Use this image as the background or primary visual element.
      {{media url=imageUrl}}
  
  2.  **Title**: Overlay this text as a prominent title: "{{{title}}}"
  
  3.  **Body**: Overlay this body text. Make sure it is legible and well-placed: "{{{body}}}"
  
  4.  **Footer**: Add this text as a small, unobtrusive footer or watermark: "{{{footerText}}}"
  
  Design the final image to be clean, modern, and engaging. The text must be clearly readable against the background image. The final output should be a single, flat image.`,
  config: {
    responseModalities: ['IMAGE'],
  }
});


const createShareImageFlow = ai.defineFlow(
  {
    name: 'createShareImageFlow',
    inputSchema: CreateShareImageInputSchema,
    outputSchema: CreateShareImageOutputSchema,
  },
  async input => {
    // To handle both data URIs and public URLs, we first need to fetch the image if it's a URL
    let imageDataUri = input.imageUrl;
    if (!input.imageUrl.startsWith('data:')) {
        const response = await fetch(input.imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image from URL: ${input.imageUrl}`);
        }
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = await response.arrayBuffer();
        imageDataUri = `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}`;
    }

    const { media } = await createShareImagePrompt({...input, imageUrl: imageDataUri});
    
    if (!media?.url) {
        throw new Error('Failed to generate shareable image. The AI did not return an image.');
    }

    return {
      shareImageUrl: media.url,
    };
  }
);
