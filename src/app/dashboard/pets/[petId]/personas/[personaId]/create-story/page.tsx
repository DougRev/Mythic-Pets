'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { ArrowLeft, Wand2, Loader2, Gem } from 'lucide-react';

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
import { uploadFile } from '@/firebase/storage';
import { v4 as uuidv4 } from 'uuid';

const storyFormSchema = z.object({
  tone: z.string({
    required_error: 'Please select a tone for the story.',
  }),
  storyLength: z.string({
    required_error: 'Please select a length for the story.',
  }),
  prompt: z.string().max(1000).optional(),
});

type StoryFormValues = z.infer<typeof storyFormSchema>;

const storyLengths = {
    'Short': '~3 chapters',
    'Medium': '~5 chapters',
    'Epic': '~7 chapters',
}

export default function CreateStoryPage() {
  const router = useRouter();
  const params = useParams();
  const petId = params.petId as string;
  const personaId = params.personaId as string;
  const { toast } = useToast();
  const { user, firestore, storage } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);

  const petRef = React.useMemo(() => {
    if (!user || !firestore || !petId) return null;
    return doc(firestore, 'users', user.uid, 'petProfiles', petId);
  }, [firestore, user, petId]);
  
  const personaRef = React.useMemo(() => {
    if (!petRef || !personaId) return null;
    return doc(petRef, 'aiPersonas', personaId);
  }, [petRef, personaId]);
  
  const userProfileRef = React.useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: pet, isLoading: isPetLoading } = useDoc<any>(petRef);
  const { data: persona, isLoading: isPersonaLoading } = useDoc<any>(personaRef);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);

  const form = useForm<StoryFormValues>({
    resolver: zodResolver(storyFormSchema),
    defaultValues: {
        tone: 'Epic',
        storyLength: 'Short',
        prompt: '',
    },
  });

  const onSubmit = async (data: StoryFormValues) => {
    if (!pet || !persona || !user || !firestore || !storage || !personaRef) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not generate story. Missing required data.',
      });
      return;
    }

    setIsGenerating(true);
    try {
      // 1. Generate the story 'book' and its first chapter
      const storyResult = await generateAiStory({
        petName: pet.name,
        personaName: persona.personaName,
        petSpecies: persona.petSpecies,
        petBreed: persona.petBreed,
        persona: `Theme: ${persona.theme}\nLore: ${persona.loreText}`,
        tone: data.tone as any,
        prompt: data.prompt,
        personaImage: persona.imageUrl,
        storyLength: data.storyLength,
        userId: user.uid,
      });

      if (!storyResult || !storyResult.title || !storyResult.chapterText || !storyResult.chapterImage) {
          throw new Error("AI generation failed to return a complete story chapter.");
      }
      
      // 2. Create the main story document (the "book")
      const storiesCollection = collection(personaRef, 'aiStories');
      const storyDocRef = await addDoc(storiesCollection, {
        aiPersonaId: personaId,
        title: storyResult.title,
        tone: data.tone,
        storyLength: data.storyLength,
        status: 'in-progress',
        generationDate: new Date().toISOString(),
        isFavorite: false,
        lastChapter: 1,
      });

      // 3. Upload chapter image to storage
      const imagePath = `users/${user.uid}/stories/${storyDocRef.id}/${uuidv4()}`;
      const imageUrl = await uploadFile(storage, imagePath, storyResult.chapterImage);

      // 4. Create the first chapter document in the subcollection
      const chaptersCollection = collection(storyDocRef, 'chapters');
      await addDoc(chaptersCollection, {
          chapterNumber: 1,
          chapterTitle: storyResult.chapterTitle,
          chapterText: storyResult.chapterText,
          imageUrl: imageUrl,
          generationDate: new Date().toISOString(),
      });


      toast({
        title: 'Story Created!',
        description: `A new legend, "${storyResult.title}", has begun for ${pet.name}.`,
      });

      // 5. Redirect to the persona page to see the new story listed
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

  if (isPetLoading || isPersonaLoading || isProfileLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!pet || !persona) {
    return <div className="flex h-screen items-center justify-center">Pet or Persona not found.</div>;
  }
  
  const isFreeTier = userProfile?.planType === 'free';
  const hasNoCredits = isFreeTier && userProfile?.generationCredits <= 0;

  const GenerateButton = () => {
    if (hasNoCredits) {
      return (
        <Button asChild className="w-full">
            <Link href="/dashboard/account">
                <Gem className="mr-2" /> Go Pro to Generate
            </Link>
        </Button>
      );
    }

    return (
        <Button type="submit" disabled={isGenerating} className="w-full">
            {isGenerating ? (
            <><Loader2 className="mr-2 animate-spin" /> Generating Story...</>
            ) : (
            <><Wand2 className="mr-2" /> Generate Story</>
            )}
        </Button>
    );
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
            Generate the first chapter of a new tale for {persona.personaName}.
            {isFreeTier && !hasNoCredits && ` You have ${userProfile.generationCredits} credits remaining.`}
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
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
                    name="storyLength"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Story Length</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Select a length..." />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {Object.entries(storyLengths).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                                {value} <span className="text-muted-foreground ml-2">{label}</span>
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormDescription>This helps the AI create a structured narrative arc.</FormDescription>
                        <FormMessage />
                    </FormItem>
                    )}
                />
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
                      Add any specific plot points, characters, or details you want the AI to include for the first chapter.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <GenerateButton />
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}

    