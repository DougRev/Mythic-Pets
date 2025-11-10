'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { PawPrint, WandSparkles, BookOpen, Upload, RefreshCw, Loader2, Save, Edit, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { generateAiPersona } from '@/ai/flows/generate-ai-persona';
import { generateAiStory } from '@/ai/flows/generate-ai-story';
import type { GenerateAiPersonaOutput } from '@/ai/flows/generate-ai-persona';

type PetDetails = {
  name: string;
  species: string;
  breed: string;
  age: string;
  bio: string;
  photoDataUri: string | null;
};

const petAvatarDefault = PlaceHolderImages.find(p => p.id === 'pet-avatar-default');

export function CreationWorkflow() {
  const { toast } = useToast();
  const [pet, setPet] = useState<PetDetails>({ name: '', species: '', breed: '', age: '', bio: '', photoDataUri: null });
  
  const [personaTheme, setPersonaTheme] = useState('');
  const [persona, setPersona] = useState<GenerateAiPersonaOutput | null>(null);
  const [isPersonaLoading, setIsPersonaLoading] = useState(false);

  const [storyTone, setStoryTone] = useState('');
  const [storyLength, setStoryLength] = useState('');
  const [story, setStory] = useState<{ title: string; story: string } | null>(null);
  const [isStoryLoading, setIsStoryLoading] = useState(false);

  const handlePetChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setPet({ ...pet, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPet({ ...pet, photoDataUri: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const isPetDetailsComplete = pet.name && pet.photoDataUri;
  const isPersonaGenerated = !!persona;

  const handleGeneratePersona = async () => {
    if (!isPetDetailsComplete || !personaTheme) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide your pet\'s name, photo, and a theme.' });
      return;
    }
    setIsPersonaLoading(true);
    setPersona(null);
    try {
      const result = await generateAiPersona({ photoDataUri: pet.photoDataUri!, theme: personaTheme });
      setPersona(result);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Persona Generation Failed', description: 'Could not generate a persona. Please try again.' });
    } finally {
      setIsPersonaLoading(false);
    }
  };
  
  const handleGenerateStory = async () => {
    if (!isPersonaGenerated || !storyTone || !storyLength) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a tone and length for the story.' });
      return;
    }
    setIsStoryLoading(true);
    setStory(null);
    try {
      const result = await generateAiStory({
        persona: persona!.loreText,
        tone: storyTone as any,
        length: storyLength as any,
        petName: pet.name,
      });
      setStory(result);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Story Generation Failed', description: 'Could not generate a story. Please try again.' });
    } finally {
      setIsStoryLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Step 1: Pet Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PawPrint className="text-primary"/> Step 1: Your Pet's Details</CardTitle>
          <CardDescription>Provide some basic information and a photo of your pet.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Pet's Name</Label>
              <Input id="name" name="name" value={pet.name} onChange={handlePetChange} placeholder="e.g., Captain Fluffy" />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <Label htmlFor="species">Species</Label>
                  <Input id="species" name="species" value={pet.species} onChange={handlePetChange} placeholder="e.g., Cat" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="breed">Breed</Label>
                  <Input id="breed" name="breed" value={pet.breed} onChange={handlePetChange} placeholder="e.g., Maine Coon" />
                </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" name="bio" value={pet.bio} onChange={handlePetChange} placeholder="Loves tuna, long naps, and plotting world domination..." />
            </div>
          </div>
          <div className="space-y-2 flex flex-col items-center justify-center">
            <Label htmlFor="photo" className="text-center">Reference Photo</Label>
            <div className="relative aspect-square w-48 rounded-lg border-2 border-dashed border-muted-foreground/50 flex items-center justify-center">
              {pet.photoDataUri ? (
                <Image src={pet.photoDataUri} alt="Pet preview" layout="fill" objectFit="cover" className="rounded-lg" />
              ) : (
                <div className="text-center text-muted-foreground p-4">
                   {petAvatarDefault && <Image src={petAvatarDefault.imageUrl} alt="Default pet avatar" width={60} height={60} className="mx-auto mb-2 opacity-50" />}
                   <Upload className="mx-auto h-8 w-8 mb-2" />
                   <p className="text-sm">Click to upload</p>
                </div>
              )}
               <Input id="photo" type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </div>
             <p className="text-xs text-muted-foreground">Upload a clear photo of your pet</p>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: AI Persona */}
      <Card className={!isPetDetailsComplete ? 'opacity-50 pointer-events-none' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><WandSparkles className="text-primary"/> Step 2: Generate Persona</CardTitle>
          <CardDescription>Choose a theme and let our AI create a unique persona and artwork for your pet.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select value={personaTheme} onValueChange={setPersonaTheme}>
                  <SelectTrigger id="theme">
                    <SelectValue placeholder="Select a theme..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Superhero">Superhero</SelectItem>
                    <SelectItem value="Detective">Detective</SelectItem>
                    <SelectItem value="Knight">Knight</SelectItem>
                    <SelectItem value="Wizard">Wizard</SelectItem>
                    <SelectItem value="Cyberpunk">Cyberpunk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleGeneratePersona} disabled={isPersonaLoading} className="w-full">
                {isPersonaLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><WandSparkles className="mr-2 h-4 w-4" /> Generate Persona</>}
              </Button>
            </div>
            <div className="space-y-4">
              {isPersonaLoading && (
                <div className="aspect-square w-full rounded-lg bg-muted animate-pulse flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                </div>
              )}
              {persona && (
                <div className="space-y-4">
                  <Image src={persona.personaImage} alt="Generated pet persona" width={400} height={400} className="rounded-lg aspect-square object-cover bg-muted" />
                  <div>
                    <h3 className="font-bold">Persona Lore</h3>
                    <p className="text-sm text-muted-foreground">{persona.loreText}</p>
                  </div>
                   <Button onClick={handleGeneratePersona} variant="outline" size="sm" disabled={isPersonaLoading}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Step 3: AI Story */}
      <Card className={!isPersonaGenerated ? 'opacity-50 pointer-events-none' : ''}>
         <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen className="text-primary"/> Step 3: Create a Story</CardTitle>
          <CardDescription>Generate a captivating story based on your pet's new persona.</CardDescription>
        </CardHeader>
        <CardContent>
           <div className="grid gap-6 md:grid-cols-2">
             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="tone">Tone</Label>
                        <Select value={storyTone} onValueChange={setStoryTone}>
                            <SelectTrigger id="tone"><SelectValue placeholder="Select a tone..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Wholesome">Wholesome</SelectItem>
                                <SelectItem value="Funny">Funny</SelectItem>
                                <SelectItem value="Epic">Epic</SelectItem>
                                <SelectItem value="Mystery">Mystery</SelectItem>
                                <SelectItem value="Sad">Sad</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="length">Length</Label>
                        <Select value={storyLength} onValueChange={setStoryLength}>
                            <SelectTrigger id="length"><SelectValue placeholder="Select a length..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Short Post">Short Post</SelectItem>
                                <SelectItem value="Story Page">Story Page</SelectItem>
                                <SelectItem value="Full Tale">Full Tale</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <Button onClick={handleGenerateStory} disabled={isStoryLoading} className="w-full">
                  {isStoryLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><BookOpen className="mr-2 h-4 w-4" /> Generate Story</>}
                </Button>
             </div>
             <div className="space-y-4">
              {isStoryLoading && (
                <div className="w-full h-48 rounded-lg bg-muted animate-pulse flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                </div>
              )}
              {story && (
                <div className="space-y-4 rounded-lg border bg-card p-4">
                  <h3 className="font-bold text-lg font-headline">{story.title}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{story.story}</p>
                   <div className="flex flex-wrap gap-2 pt-4">
                    <Button variant="outline" size="sm" onClick={handleGenerateStory} disabled={isStoryLoading}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
                    </Button>
                     <Button variant="outline" size="sm"><Save className="mr-2 h-4 w-4" /> Save</Button>
                     <Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4" /> Edit</Button>
                     <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" /> Download</Button>
                  </div>
                </div>
              )}
            </div>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
