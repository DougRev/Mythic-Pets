'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
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
import { generateAiPersona } from '@/ai/flows/generate-ai-persona';
import { uploadFile } from '@/firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

const themes = [
  'Superhero',
  'Detective',
  'Wizard',
  'Cyberpunk',
  'Fantasy',
  'Sci-Fi',
  'Noir',
  'Knight',
  'Other...',
];

const artStyles = [
    'Anime',
    'Cartoon',
    'Photorealistic',
    'Oil Painting',
    'Steampunk',
    'Vaporwave',
    'Pixel Art',
    'Other...'
];

const personaFormSchema = z.object({
  theme: z.string({
    required_error: 'Please select a theme.',
  }),
  customTheme: z.string().optional(),
  imageStyle: z.string({
    required_error: 'Please select an art style.',
  }),
  customImageStyle: z.string().optional(),
  prompt: z.string().max(500).optional(),
}).refine(data => {
    if (data.theme === 'Other...') {
        return !!data.customTheme && data.customTheme.length > 0;
    }
    return true;
}, {
    message: 'Please enter a custom theme.',
    path: ['customTheme'],
}).refine(data => {
    if (data.imageStyle === 'Other...') {
        return !!data.customImageStyle && data.customImageStyle.length > 0;
    }
    return true;
}, {
    message: 'Please enter a custom art style.',
    path: ['customImageStyle'],
});

type PersonaFormValues = z.infer<typeof personaFormSchema>;


export default function CreatePersonaPage() {
  const router = useRouter();
  const params = useParams();
  const petId = params.petId as string;
  const { toast } = useToast();
  const { user, firestore, storage } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);

  const petRef = React.useMemo(() => {
    if (!user || !firestore || !petId) return null;
    return doc(firestore, 'users', user.uid, 'petProfiles', petId);
  }, [firestore, user, petId]);
  
  const userProfileRef = React.useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: pet, isLoading: isPetLoading } = useDoc<any>(petRef);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);

  const form = useForm<PersonaFormValues>({
    resolver: zodResolver(personaFormSchema),
    defaultValues: {
      prompt: '',
      customTheme: '',
      customImageStyle: '',
    },
  });

  const watchedTheme = form.watch('theme');
  const watchedImageStyle = form.watch('imageStyle');

  const onSubmit = async (data: PersonaFormValues) => {
    if (!pet || !user || !firestore || !storage) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not generate persona. Missing user or pet data.',
      });
      return;
    }
    
    if (!petRef) {
        toast({ variant: 'destructive', title: 'Error', description: 'Pet reference not found.' });
        return;
    }

    setIsGenerating(true);
    try {
      const theme = data.theme === 'Other...' ? data.customTheme : data.theme;
      const imageStyle = data.imageStyle === 'Other...' ? data.customImageStyle : data.imageStyle;

      // 1. Generate Persona Image & Lore
      const personaResult = await generateAiPersona({
        photoDataUri: pet.photoURL, // Assuming photoURL is a data URI
        theme: theme!,
        imageStyle: imageStyle!,
        petName: pet.name,
        prompt: data.prompt,
        userId: user.uid,
      });

      if (!personaResult || !personaResult.personaImage || !personaResult.loreText) {
          throw new Error("AI generation failed to return expected data.");
      }

      // 2. Upload generated image to storage
      const imagePath = `users/${user.uid}/personas/${uuidv4()}`;
      const imageUrl = await uploadFile(storage, imagePath, personaResult.personaImage);

      // 3. Save the new persona to Firestore
      const newPersona = {
        petProfileId: petId,
        theme: theme,
        imageStyle: imageStyle,
        imageUrl: imageUrl,
        loreText: personaResult.loreText,
        generationDate: new Date().toISOString(),
      };

      const personasCollection = collection(petRef, 'aiPersonas');
      const docRef = await addDoc(personasCollection, newPersona);

      toast({
        title: 'Persona Created!',
        description: `A new legend is born for ${pet.name}.`,
      });

      // 4. Redirect to the new persona page
      router.push(`/dashboard/pets/${petId}/personas/${docRef.id}`);

    } catch (error: any) {
      console.error('Persona generation failed:', error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error.message || 'Could not create the persona. Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isPetLoading || isProfileLoading) {
    return <div className="flex h-screen items-center justify-center">Loading pet details...</div>;
  }

  if (!pet) {
    return <div className="flex h-screen items-center justify-center">Pet not found.</div>;
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
          <><Loader2 className="mr-2 animate-spin" /> Generating...</>
        ) : (
          <><Wand2 className="mr-2" /> Generate Persona</>
        )}
      </Button>
    );
  };

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4 md:px-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2" />
        Back to Personas
      </Button>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-0">
                <Image
                    src={pet.photoURL}
                    alt={pet.name}
                    width={400}
                    height={400}
                    className="aspect-square w-full rounded-t-lg object-cover"
                />
            </CardContent>
            <CardFooter className="p-4">
                <h3 className="w-full text-center font-bold text-xl">{pet.name}</h3>
            </CardFooter>
          </Card>
        </div>

        <div className="md:col-span-2">
            <Card>
                <CardHeader>
                <CardTitle>Create a New Persona</CardTitle>
                <CardDescription>
                    Define a new mythic identity for {pet.name}.
                    {isFreeTier && ` You have ${userProfile.generationCredits} credits remaining.`}
                </CardDescription>
                </CardHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-6">
                    <FormField
                        control={form.control}
                        name="theme"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Theme</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Select a theme..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {themes.map((theme) => (
                                <SelectItem key={theme} value={theme}>
                                    {theme}
                                </SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormDescription>
                            This sets the narrative genre (e.g., Fantasy, Sci-Fi).
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    {watchedTheme === 'Other...' && (
                         <FormField
                            control={form.control}
                            name="customTheme"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Custom Theme</FormLabel>
                                <FormControl>
                                <Input placeholder="e.g., Pirate Captain, Rockstar" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    )}
                    <FormField
                        control={form.control}
                        name="imageStyle"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Art Style</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Select an art style..." />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {artStyles.map((style) => (
                                <SelectItem key={style} value={style}>
                                    {style}
                                </SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormDescription>
                            This defines the visual look of the generated image.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     {watchedImageStyle === 'Other...' && (
                         <FormField
                            control={form.control}
                            name="customImageStyle"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Custom Art Style</FormLabel>
                                <FormControl>
                                <Input placeholder="e.g., Watercolor, Art Deco" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    )}
                    <FormField
                        control={form.control}
                        name="prompt"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Creative Direction (Optional)</FormLabel>
                            <FormControl>
                            <Textarea
                                placeholder={`e.g., "A noble knight with golden armor" or "A gritty detective in a rainy city"`}
                                className="resize-none"
                                {...field}
                            />
                            </FormControl>
                            <FormDescription>
                            Add specific details for the AI to include.
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
      </div>
    </div>
  );
}
