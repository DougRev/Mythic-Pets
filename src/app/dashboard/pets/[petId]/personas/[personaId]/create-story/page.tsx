'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { ArrowLeft, Wand2, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useDoc } from '@/firebase';
import { doc, addDoc, collection } from 'firebase/firestore';
import { generateAiStory } from '@/ai/flows/generate-ai-story';

const storyFormSchema = z.object({
  tone: z
    .string({
      required_error: 'Please select a tone for the story.',
    }),
  length: z
    .string({
      required_error: 'Please select a length for the story.',
    }),
  prompt: z.string().max(1000).optional(),
});

type StoryFormValues = z.infer<typeof storyFormSchema>;

export default function CreateStoryPage() {
  const router = useRouter();
  const params = useParams();
  const petId = params.petId as string;
  const personaId = params.personaId as string;
  const { toast } = useToast();
  const { user, firestore } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);

  const petRef = React.useMemo(() => {
    if (!user || !firestore || !petId) return null;
    return doc(firestore, 'users', user.uid, 'petProfiles', petId);
  }, [firestore, user, petId]);
  
  const personaRef = React.useMemo(() => {
    if (!petRef || !personaId) return null;
    return doc(petRef, 'aiPersonas', personaId);
  }, [petRef, personaId]);

  const { data: pet, isLoading: isPetLoading } = useDoc<any>(petRef);
  const { data: persona, isLoading: isPersonaLoading } = useDoc<any>(personaRef);

  const form = useForm<StoryFormValues>({
    resolver: zodResolver(storyFormSchema),
    defaultValues: {
        tone: 'Epic',
        length: 'Story Page',
        prompt: '',
    },
  });

  const onSubmit = async (data: StoryFormValues) => {
    if (!pet || !persona || !user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not generate story. Missing required data.',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const storyResult = await generateAiStory({
        petName: pet.name,
        persona: `Theme: ${persona.theme}\nLore: ${persona.loreText}`,
        tone: data.tone as any,
        length: data.length as any,
        prompt: data.prompt,
      });

      if (!storyResult || !storyResult.title || !storyResult.storyText) {
          throw new Error("AI generation failed to return a story.");
      }
      
      const newStory = {
        aiPersonaId: personaId,
        title: storyResult.title,
        storyText: storyResult.storyText,
        tone: data.tone,
        length: data.length,
        generationDate: new Date().toISOString(),
        isFavorite: false,
      };

      const storiesCollection = collection(personaRef, 'aiStories');
      await addDoc(storiesCollection, newStory);

      toast({
        title: 'Story Created!',
        description: `A new chapter in ${pet.name}'s legend has been written.`,
      });

      router.push(`/dashboard/pets/${petId}/personas/${personaId}`);

    } catch (error: any) {
      console.error('Story generation failed:', error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error.message || 'Could not create the story. Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isPetLoading || isPersonaLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!pet || !persona) {
    return <div className="flex h-screen items-center justify-center">Pet or Persona not found.</div>;
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4 md:px-6">
       <Button asChild variant="ghost" className="mb-4">
        <Link href={`/dashboard/pets/${petId}/personas/${personaId}`}>
            <ArrowLeft className="mr-2" />
            Back to Persona
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Create a New Story</CardTitle>
          <CardDescription>
            Generate a new tale for {pet.name} as the {persona.theme}.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="tone"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tone</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Select a tone..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {['Wholesome', 'Funny', 'Epic', 'Mystery', 'Sad'].map((tone) => (
                                <SelectItem key={tone} value={tone}>
                                    {tone}
                                </SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="length"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Length</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Select a length..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {['Short Post', 'Story Page', 'Full Tale'].map((length) => (
                                <SelectItem key={length} value={length}>
                                    {length}
                                </SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
              <FormField
                control={form.control}
                name="prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Creative Direction (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={`e.g., "A story about a secret mission to retrieve the legendary Golden Squeaky Toy."`}
                        className="resize-none"
                        rows={5}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Add any specific plot points, characters, or details you want the AI to include.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isGenerating} className="w-full">
                {isGenerating ? (
                  <><Loader2 className="mr-2 animate-spin" /> Generating Story...</>
                ) : (
                  <><Wand2 className="mr-2" /> Generate Story</>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
