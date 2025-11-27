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
import { Part } from 'genkit';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';

if (!getApps().length) {
    initializeApp({ credential: applicationDefault() });
}
const db = getFirestore();

const RegenerateAiImageInputSchema = z.object({
  petName: z.string().describe('The name of the pet.'),
  theme: z.string().describe('The narrative theme for the AI persona (e.g., Superhero, Detective, Knight).'),
  imageStyle: z.string().describe('The visual art style for the generated image (e.g., Anime, Photorealistic).'),
  originalImageUrl: z.string().describe('The URL of the original image to be regenerated. This is a reference for the AI.'),
  feedback: z.string().describe('User feedback or specific direction for the new image.'),
  userId: z.string().describe('The ID of the user requesting the regeneration.'),
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
  prompt: (input: z.infer<typeof RegenerateAiImageInputSchema>) => {
    const promptParts: Part[] = [
      { media: { url: input.originalImageUrl } },
      { text: `Based on the user's feedback, regenerate this image: "${input.feedback}". Keep the pet's name (${input.petName}), theme (${input.theme}), and art style (${input.imageStyle}) consistent, but apply the user's requested changes.` }
    ];
    return promptParts;
  },
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
    
    const userRef = db.collection('users').doc(input.userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (userData?.planType === 'free') {
        if (userData.generationCredits <= 0) {
            throw new Error('You have no generation credits remaining. Please upgrade to Pro.');
        }
    }
    
    const { media, finishReason, safetyRatings } = await regenerateImagePrompt(input);
    
    if (finishReason === 'BLOCKED' || (safetyRatings && safetyRatings.some(r => r.blocked))) {
      throw new Error('Image generation was blocked due to safety guidelines. Please try a different creative direction.');
    }
    
    if (!media?.url) {
        throw new Error('Failed to regenerate persona image. The AI did not return an image.');
    }
    
    // Deduct credit after successful generation for free users
    if (userData?.planType === 'free') {
        await userRef.update({
            generationCredits: FieldValue.increment(-1),
        });
    }

    return {
      newImageUrl: media.url,
    };
  }
);
