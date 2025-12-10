
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating an AI persona for a pet based on a user-provided image and a theme.
 *
 * - generateAiPersona -  A function that takes an image of a pet and a theme, and generates an AI persona with lore.
 * - GenerateAiPersonaInput - The input type for the generateAiPersona function.
 * - GenerateAiPersonaOutput - The return type for the generateAiPersona function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI}from '@genkit-ai/google-genai';
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
  personaName: z.string().optional().describe('An optional, user-provided name for the persona.'),
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
  personaName: z.string().describe("The generated or provided name for the persona."),
});
export type GenerateAiPersonaOutput = z.infer<typeof GenerateAiPersonaOutputSchema>;

export async function generateAiPersona(input: GenerateAiPersonaInput): Promise<GenerateAiPersonaOutput> {
  return generateAiPersonaFlow(input);
}

const generateImagePrompt = ai.definePrompt({
  name: 'generateAiPersonaImagePrompt',
  input: {schema: GenerateAiPersonaInputSchema},
  model: googleAI.model('gemini-2.5-flash-image-preview'),
  prompt: (input) => {
    let stylePrompt = `in the art style of: ${input.imageStyle}`;
    if (input.imageStyle === 'Cinematic Noir') {
        stylePrompt = `in a cinematic noir painting style, featuring dramatic high-contrast lighting (chiaroscuro), a moody atmosphere, and visible digital brush strokes. The scene should feel like a frame from a detective film, with a dark, muted color palette and pops of vibrant neon light.`
    }
    
    return [
        { media: { url: input.photoDataUri } },
        { text: `You are a creative AI that generates AI personas for pets.
        Generate an image of the pet in the provided photo.
        The generated image should be ${stylePrompt}.
        The theme for the persona is: ${input.theme}.
        The user also provided this creative direction: ${input.prompt}.`},
    ]
  },
  config: {
    responseModalities: ['IMAGE'],
  }
});

const generateLorePrompt = ai.definePrompt({
    name: 'generateAiPersonaLorePrompt',
    input: {schema: GenerateAiPersonaInputSchema},
    output: {schema: z.object({
        loreText: z.string().describe('A short lore text (100-150 words) describing the pet persona.'),
        personaName: z.string().describe('The creative and fitting name for this persona.'),
    })},
    model: googleAI.model('gemini-2.5-flash'),
    prompt: `You are a creative AI that writes lore for pet personas.
    The pet's real name is {{{petName}}}.
    The theme for the persona is: {{{theme}}}.
    The user also provided this creative direction: {{{prompt}}}.

    Your task is to write a short, engaging lore text (100-150 words) for this pet.
    
    CRITICAL: You must also generate a creative and fitting name for this specific persona. If the user provided a name ("{{personaName}}"), use that as the persona's name. Otherwise, invent a new one that fits the theme (e.g., for a Knight theme, "Sir Reginald the Brave").
    
    Make sure to feature the persona as the main character of the lore.
    
    Return the lore text and the final personaName.`,
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
      personaName: loreResult.output.personaName,
    };
  }
);
