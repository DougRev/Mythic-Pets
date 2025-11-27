
'use server';

/**
 * @fileOverview A story continuation AI agent.
 *
 * - continueAiStory - A function that generates the next chapter of a story.
 * - ContinueAiStoryInput - The input type for the continueAiStory function.
 * - ContinueAiStoryOutput - The return type for the continueAiStory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

if (!getApps().length) {
    initializeApp();
}
const db = getFirestore();

const ContinueAiStoryInputSchema = z.object({
  persona: z.string().describe("The pet's persona, including theme and lore."),
  tone: z.string().describe('The tone of the story (e.g., "Wholesome", "Funny").'),
  petName: z.string().describe('The name of the pet.'),
  previousChapters: z.string().describe('The text of all previous chapters to provide context.'),
  personaImage: z
    .string()
    .describe(
      "The persona image of the pet, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  storyLength: z.string().describe("The desired total length of the story."),
  currentChapter: z.number().describe("The current chapter number."),
  prompt: z.string().optional().describe("Optional user prompt for creative direction for the next chapter."),
  userId: z.string().describe('The ID of the user requesting the generation.'),
});
export type ContinueAiStoryInput = z.infer<typeof ContinueAiStoryInputSchema>;

const ContinueAiStoryOutputSchema = z.object({
  chapterTitle: z.string().describe('The title of the new chapter.'),
  chapterText: z.string().describe('The text for the new chapter of the story.'),
  chapterImage: z
    .string()
    .describe(
      "The AI-generated image for the new chapter as a data URI. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  isFinalChapter: z.boolean().describe("Whether this generated chapter should be the final chapter of the story."),
});
export type ContinueAiStoryOutput = z.infer<typeof ContinueAiStoryOutputSchema>;

export async function continueAiStory(
  input: ContinueAiStoryInput
): Promise<ContinueAiStoryOutput> {
  return continueAiStoryFlow(input);
}

const generateNextChapterTextPrompt = ai.definePrompt({
  name: 'generateNextChapterTextPrompt',
  input: {schema: ContinueAiStoryInputSchema},
  output: {schema: z.object({
    chapterTitle: z.string().describe('The title for this new chapter.'),
    chapterText: z.string().describe('The text content for this new chapter.'),
  })},
  prompt: `You are a creative story writer continuing a story about a pet.

  Based on the pet's persona, the story's tone, the previous chapters, and optional user direction, you will generate the next chapter of the story. The pet should be the main character.
  This is chapter {{currentChapter}} of a {{storyLength}} story.

  Pet Name: {{{petName}}}
  Persona: {{{persona}}}
  Tone: {{{tone}}}
  Story Length: {{{storyLength}}}
  Creative Direction: {{{prompt}}}
  
  Here are the previous chapters to provide context:
  {{{previousChapters}}}
  
  Please generate a title and text for the next chapter. The chapter text should be around 200-300 words. If this is the final chapter, make sure to conclude the story.`,
});

const generateNextChapterImagePrompt = ai.definePrompt({
  name: 'generateNextChapterImagePrompt',
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

const continueAiStoryFlow = ai.defineFlow(
  {
    name: 'continueAiStoryFlow',
    inputSchema: ContinueAiStoryInputSchema,
    outputSchema: ContinueAiStoryOutputSchema,
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

    // 1. Determine if this should be the final chapter
    let isFinalChapter = false;
    const storyLengthMap = { 'Short': 3, 'Medium': 5, 'Epic': 7 };
    const targetChapters = storyLengthMap[input.storyLength as keyof typeof storyLengthMap] || 3;
    if (input.currentChapter >= targetChapters) {
        isFinalChapter = true;
    }

    // 2. Generate story text and title for the next chapter
    const { output: textOutput } = await generateNextChapterTextPrompt(input);
    if (!textOutput) {
      throw new Error('Failed to generate next chapter text.');
    }

    // 3. Generate chapter image based on the new text
    const imageGenResponse = await generateNextChapterImagePrompt({
        chapterText: textOutput.chapterText,
        personaImage: input.personaImage
    });

    const finishReason = imageGenResponse.finishReason;
    const safetyRatings = imageGenResponse.safetyRatings;
    
    if (finishReason === 'BLOCKED' && safetyRatings && safetyRatings.length > 0) {
        throw new Error('Image generation was blocked due to safety guidelines. Please try a different creative direction.');
    }

    if (!imageGenResponse.media?.url) {
      throw new Error('Failed to generate next chapter image.');
    }
    
    // 4. Deduct credit after successful generation for free users
    if (userData?.planType === 'free') {
        await userRef.update({
            generationCredits: FieldValue.increment(-1),
        });
    }

    return {
      chapterTitle: textOutput.chapterTitle,
      chapterText: textOutput.chapterText,
      chapterImage: imageGenResponse.media.url,
      isFinalChapter: isFinalChapter,
    };
  }
);
