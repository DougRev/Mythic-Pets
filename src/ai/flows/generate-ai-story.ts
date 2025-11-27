
'use server';

/**
 * @fileOverview A story generation AI agent based on a pet's persona.
 *
 * - generateAiStory - A function that handles the story generation process.
 * - GenerateAiStoryInput - The input type for the generateAiStory function.
 * - GenerateAiStoryOutput - The return type for the generateAiStory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

if (!getApps().length) {
    initializeApp();
}
const db = getFirestore();

const GenerateAiStoryInputSchema = z.object({
  persona: z.string().describe("The pet's persona, including theme and lore."),
  tone: z
    .enum(['Wholesome', 'Funny', 'Epic', 'Mystery', 'Sad'])
    .describe('The tone of the story.'),
  petName: z.string().describe('The name of the pet.'),
  personaImage: z
    .string()
    .describe(
      "The persona image of the pet, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  prompt: z.string().optional().describe('Optional user prompt for creative direction.'),
  storyLength: z.string().describe("The desired length of the story (e.g., 'Short (~3 chapters)', 'Medium (~5 chapters)', 'Epic (~7 chapters)')."),
  userId: z.string().describe('The ID of the user requesting the generation.'),
});
export type GenerateAiStoryInput = z.infer<typeof GenerateAiStoryInputSchema>;

const GenerateAiStoryOutputSchema = z.object({
  title: z.string().describe('The title of the generated story.'),
  chapterTitle: z.string().describe('The title of the first chapter.'),
  chapterText: z.string().describe('The text for the first chapter of the story.'),
  chapterImage: z
    .string()
    .describe(
      "The AI-generated image for the chapter as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type GenerateAiStoryOutput = z.infer<typeof GenerateAiStoryOutputSchema>;

export async function generateAiStory(
  input: GenerateAiStoryInput
): Promise<GenerateAiStoryOutput> {
  return generateAiStoryFlow(input);
}

const generateStoryPrompt = ai.definePrompt({
  name: 'generateAiStoryTextPrompt',
  input: {schema: GenerateAiStoryInputSchema},
  output: {schema: z.object({
    title: z.string().describe('The overall title for the story/book.'),
    chapterTitle: z.string().describe('The title for this specific chapter.'),
    chapterText: z.string().describe('The text content for this chapter.'),
  })},
  prompt: `You are a creative story writer specializing in stories about pets.

  Based on the pet's name, persona, and the user's preferences, you will generate the first chapter of a story. The story should feature the pet as the main character.
  The user wants this to be a {{storyLength}} story. This is the first chapter, so it should set up the beginning of a story with a clear narrative arc in mind.

  Pet Name: {{{petName}}}
  Persona: {{{persona}}}
  Tone: {{{tone}}}
  Story Length: {{{storyLength}}}
  Creative Direction: {{{prompt}}}
  
  Please provide an overall title for the story, a title for the first chapter, and the chapter text. The chapter text should be around 200-300 words.`,
});

const generateImagePrompt = ai.definePrompt({
  name: 'generateAiStoryImagePrompt',
  input: {
    schema: z.object({
      chapterText: z.string(),
      personaImage: z.string(),
    }),
  },
  model: googleAI.model('gemini-2.5-flash-image-preview'),
  prompt: `You are an expert illustrator for a storybook. Your task is to generate a dynamic and immersive scene based on the chapter text provided.

  CRITICAL: The main character's appearance (breed, color, markings, etc.) MUST be consistent with the provided Persona Image. Use the Persona Image as the primary reference for the character. The art style of the generated image should also match the Persona Image.
  
  IMPORTANT: The pose of the character and the environment should reflect the action, mood, and details described in the chapter text. Create a full scene, not just a portrait.

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

const generateAiStoryFlow = ai.defineFlow(
  {
    name: 'generateAiStoryFlow',
    inputSchema: GenerateAiStoryInputSchema,
    outputSchema: GenerateAiStoryOutputSchema,
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

    // 1. Generate story text and titles
    const { output: textOutput } = await generateStoryPrompt(input);
    if (!textOutput) {
      throw new Error('Failed to generate story text.');
    }

    // 2. Generate chapter image based on the generated text
    const imageGenResponse = await generateImagePrompt({
        chapterText: textOutput.chapterText,
        personaImage: input.personaImage
    });
    
    if (!imageGenResponse.media?.url) {
      throw new Error('Image generation may have been blocked due to safety policies. Please try a different creative direction.');
    }
    
    // 3. Deduct credit after successful generation for free users
    if (userData?.planType === 'free') {
        await userRef.update({
            generationCredits: FieldValue.increment(-1),
        });
    }

    return {
      title: textOutput.title,
      chapterTitle: textOutput.chapterTitle,
      chapterText: textOutput.chapterText,
      chapterImage: imageGenResponse.media.url,
    };
  }
);
