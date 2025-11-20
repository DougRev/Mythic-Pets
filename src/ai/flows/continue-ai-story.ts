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

  Based on the pet's persona, the story's tone, and the content of the previous chapters, you will generate the next chapter of the story. The pet should be the main character.
  This is chapter {{currentChapter}} of a {{storyLength}} story.

  Pet Name: {{{petName}}}
  Persona: {{{persona}}}
  Tone: {{{tone}}}
  Story Length: {{{storyLength}}}
  
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
  prompt: `Based on the following chapter text, generate a visually compelling scene. The style should be consistent with the provided persona image.

  Chapter Text: {{{chapterText}}}
  Persona Image: {{media url=personaImage}}`,
  config: {
    responseModalities: ['IMAGE'],
  },
});

const continueAiStoryFlow = ai.defineFlow(
  {
    name: 'continueAiStoryFlow',
    inputSchema: ContinueAiStoryInputSchema,
    outputSchema: ContinueAiStoryOutputSchema,
  },
  async input => {
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
    const { media } = await generateNextChapterImagePrompt({
        chapterText: textOutput.chapterText,
        personaImage: input.personaImage
    });

    if (!media?.url) {
      throw new Error('Failed to generate next chapter image.');
    }

    return {
      chapterTitle: textOutput.chapterTitle,
      chapterText: textOutput.chapterText,
      chapterImage: media.url,
      isFinalChapter: isFinalChapter,
    };
  }
);
