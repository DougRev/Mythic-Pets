'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
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
import { generateAiPersona } from '@/ai/flows/generate-ai-persona';
import { uploadFile } from '@/firebase/storage';
import { v4 as uuidv4 } from 'uuid';

const artStyles = [
  'Superhero',
  'Detective',
  'Wizard',
  'Cyberpunk',
  'Steampunk',
  'Anime',
  'Cartoon',
  'Fantasy',
  'Sci-Fi',
  'Noir',
];

const personaFormSchema = z.object({
  theme: z
    .string({
      required_error: 'Please select a theme for the persona.',
    }),
  prompt: z.string().max(500).optional(),
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

  const { data: pet, isLoading: isPetLoading } = useDoc<any>(petRef);

  const form = useForm<PersonaFormValues>({
    resolver: zodResolver(personaFormSchema),
    defaultValues: {
      prompt: '',
    },
  });

  const onSubmit = async (data: PersonaFormValues) => {
    if (!pet || !user || !firestore || !storage) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not generate persona. Missing user or pet data.',
      });
      return;
    }

    setIsGenerating(true);
    try {
      // 1. Generate Persona Image & Lore
      const personaResult = await generateAiPersona({
        photoDataUri: pet.photoURL, // Assuming photoURL is a data URI
        theme: data.theme,
        prompt: data.prompt,
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
        theme: data.theme,
        imageStyle: data.theme, // Using theme as style for now
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

  if (isPetLoading) {
    return <div className="flex h-screen items-center justify-center">Loading pet details...</div>;
  }

  if (!pet) {
    return <div className="flex h-screen items-center justify-center">Pet not found.</div>;
  }


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
                            <FormLabel>Art Style / Theme</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Select a theme..." />
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
                            This will define the visual style and story genre.
                            </FormDescription>
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
                                placeholder={`e.g., "Make them a noble knight with golden armor" or "A gritty detective in a rainy city"`}
                                className="resize-none"
                                {...field}
                            />
                            </FormControl>
                            <FormDescription>
                            Add any specific details you want the AI to include.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    </CardContent>
                    <CardFooter>
                    <Button type="submit" disabled={isGenerating} className="w-full">
                        {isGenerating ? (
                        <><Loader2 className="mr-2 animate-spin" /> Generating...</>
                        ) : (
                        <><Wand2 className="mr-2" /> Generate Persona</>
                        )}
                    </Button>
                    </CardFooter>
                </form>
                </Form>
            </Card>
        </div>
      </div>
    </div>
  );
}
