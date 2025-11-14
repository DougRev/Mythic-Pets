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

const GenerateAiStoryInputSchema = z.object({
  persona: z.string().describe("The pet's persona, including theme and lore."),
  tone: z
    .enum(['Wholesome', 'Funny', 'Epic', 'Mystery', 'Sad'])
    .describe('The tone of the story.'),
  length:
    z.enum(['Short Post', 'Story Page', 'Full Tale']).describe('The length of the story.'),
  petName: z.string().describe('The name of the pet.'),
  prompt: z.string().optional().describe('Optional user prompt for creative direction.'),
});
export type GenerateAiStoryInput = z.infer<typeof GenerateAiStoryInputSchema>;

const GenerateAiStoryOutputSchema = z.object({
  title: z.string().describe('The title of the generated story.'),
  storyText: z.string().describe('The generated story text.'),
});
export type GenerateAiStoryOutput = z.infer<typeof GenerateAiStoryOutputSchema>;

export async function generateAiStory(
  input: GenerateAiStoryInput
): Promise<GenerateAiStoryOutput> {
  return generateAiStoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAiStoryPrompt',
  input: {schema: GenerateAiStoryInputSchema},
  output: {schema: GenerateAiStoryOutputSchema},
  prompt: `You are a creative story writer specializing in stories about pets.

  Based on the pet's name, persona, and the user's preferences, you will generate a story. The story should feature the pet as the main character.

  Pet Name: {{{petName}}}
  Persona: {{{persona}}}
  Tone: {{{tone}}}
  Length: {{{length}}}
  Creative Direction: {{{prompt}}}

  Please provide a short title for the story and the story text.`,
});

const generateAiStoryFlow = ai.defineFlow(
  {
    name: 'generateAiStoryFlow',
    inputSchema: GenerateAiStoryInputSchema,
    outputSchema: GenerateAiStoryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate story.');
    }
    return output;
  }
);
