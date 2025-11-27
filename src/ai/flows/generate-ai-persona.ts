
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
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import {FieldValue} from 'firebase-admin/firestore';

if (!getApps().length) {
    initializeApp({ credential: applicationDefault() });
}
const db = getFirestore();

const GenerateAiPersonaInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a pet, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'"
    ),
  theme: z.string().describe('The narrative theme for the AI persona (e.g., Superhero, Detective, Knight).'),
  imageStyle: z.string().describe('The visual art style for the generated image (e.g., Anime, Photorealistic).'),
  petName: z.string().describe('The name of the pet.'),
  prompt: z.string().optional().describe('Optional user prompt for more specific direction.'),
  userId: z.string().describe('The ID of the user requesting the generation.'),
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
  model: googleAI.model('gemini-2.5-flash-image-preview'),
  prompt: `You are a creative AI that generates AI personas for pets.
  Generate an image of the pet in this photo: {{media url=photoDataUri}}.
  The image should be in the style of: {{{imageStyle}}}.
  The theme for the persona is: {{{theme}}}.
  The user also provided this creative direction: {{{prompt}}}.`,
  config: {
    responseModalities: ['IMAGE'],
  }
});

const generateLorePrompt = ai.definePrompt({
    name: 'generateAiPersonaLorePrompt',
    input: {schema: GenerateAiPersonaInputSchema},
    output: {schema: z.object({
        loreText: z.string().describe('A short lore text (100-150 words) describing the pet persona.'),
    })},
    model: googleAI.model('gemini-2.5-flash'),
    prompt: `You are a creative AI that writes lore for pet personas.
    The pet's name is {{{petName}}}.
    The theme for the persona is: {{{theme}}}.
    The user also provided this creative direction: {{{prompt}}}.

    Based on the theme and creative direction, write a short, engaging lore text (100-150 words) for {{{petName}}}.
    Make sure to feature {{{petName}}} as the main character of the lore.`,
});


const generateAiPersonaFlow = ai.defineFlow(
  {
    name: 'generateAiPersonaFlow',
    inputSchema: GenerateAiPersonaInputSchema,
    outputSchema: GenerateAiPersonaOutputSchema,
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
    
    // Run image and lore generation in parallel
    const [imageResult, loreResult] = await Promise.all([
      generateImagePrompt(input),
      generateLorePrompt(input)
    ]);
    
    if (!imageResult.media?.url || !loreResult.output) {
        throw new Error('Failed to generate persona image or lore.');
    }
    
    // Deduct credit after successful generation for free users
    if (userData?.planType === 'free') {
        await userRef.update({
            generationCredits: FieldValue.increment(-1),
        });
    }

    return {
      personaImage: imageResult.media.url,
      loreText: loreResult.output.loreText,
    };
  }
);
