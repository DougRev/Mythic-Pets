'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCollection, useDoc } from '@/firebase';
import { doc, collection, query, orderBy, addDoc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Loader2, Wand2 } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { continueAiStory } from '@/ai/flows/continue-ai-story';
import { uploadFile } from '@/firebase/storage';
import { v4 as uuidv4 } from 'uuid';

export default function StoryDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, firestore, storage } = useAuth();
  const { toast } = useToast();

  const petId = params.petId as string;
  const personaId = params.personaId as string;
  const storyId = params.storyId as string;
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(1);

  // Memoized references
  const petRef = React.useMemo(() => {
    if (!user || !firestore || !petId) return null;
    return doc(firestore, 'users', user.uid, 'petProfiles', petId);
  }, [firestore, user, petId]);
  
  const personaRef = React.useMemo(() => {
    if (!petRef || !personaId) return null;
    return doc(petRef, 'aiPersonas', personaId);
  }, [petRef, personaId]);

  const storyRef = React.useMemo(() => {
    if (!personaRef || !storyId) return null;
    return doc(personaRef, 'aiStories', storyId);
  }, [personaRef, storyId]);
  
  const chaptersQuery = React.useMemo(() => {
    if(!storyRef) return null;
    return query(collection(storyRef, 'chapters'), orderBy('chapterNumber'));
  }, [storyRef]);

  // Data fetching
  const { data: pet, isLoading: isPetLoading } = useDoc<any>(petRef);
  const { data: persona, isLoading: isPersonaLoading } = useDoc<any>(personaRef);
  const { data: story, isLoading: isStoryLoading, refetch: refetchStory } = useDoc<any>(storyRef);
  const { data: chapters, isLoading: areChaptersLoading } = useCollection<any>(chaptersQuery);

  useEffect(() => {
    if (story) {
        setCurrentChapter(story.lastChapter);
    }
  }, [story]);


  const handleGenerateNextChapter = async () => {
    if (!story || !chapters || !pet || !persona || !user || !firestore || !storage || !storyRef) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not generate next chapter. Missing required data.',
        });
        return;
    }
    
    setIsGenerating(true);
    try {
        const previousChaptersText = chapters
            .sort((a, b) => a.chapterNumber - b.chapterNumber)
            .map(c => `Chapter ${c.chapterNumber}: ${c.chapterTitle}\n${c.chapterText}`)
            .join('\n\n');

        const nextChapterResult = await continueAiStory({
            petName: pet.name,
            persona: `Theme: ${persona.theme}\nLore: ${persona.loreText}`,
            tone: story.tone,
            previousChapters: previousChaptersText,
            personaImage: persona.imageUrl
        });

        if (!nextChapterResult || !nextChapterResult.chapterTitle || !nextChapterResult.chapterText || !nextChapterResult.chapterImage) {
            throw new Error('AI generation failed to return a complete next chapter.');
        }

        const nextChapterNumber = story.lastChapter + 1;

        const imagePath = `users/${user.uid}/stories/${storyId}/${uuidv4()}`;
        const imageUrl = await uploadFile(storage, imagePath, nextChapterResult.chapterImage);

        const chaptersCollection = collection(storyRef, 'chapters');
        await addDoc(chaptersCollection, {
            chapterNumber: nextChapterNumber,
            chapterTitle: nextChapterResult.chapterTitle,
            chapterText: nextChapterResult.chapterText,
            imageUrl: imageUrl,
            generationDate: new Date().toISOString(),
        });
        
        await updateDoc(storyRef, {
            lastChapter: nextChapterNumber,
        });

        await refetchStory();

        setCurrentChapter(nextChapterNumber);

        toast({
            title: 'Chapter Generated!',
            description: `Chapter ${nextChapterNumber} of "${story.title}" has been written.`,
        });

    } catch (error: any) {
        console.error("Next chapter generation failed:", error);
        toast({
            variant: 'destructive',
            title: 'Generation Failed',
            description: error.message || 'Could not generate the next chapter. Please try again.',
        });
    } finally {
        setIsGenerating(false);
    }
  };
  
  if (isStoryLoading || areChaptersLoading || isPetLoading || isPersonaLoading) {
    return <div className="flex h-screen items-center justify-center">Loading story...</div>;
  }

  if (!story || !chapters || chapters.length === 0) {
    return <div className="flex h-screen items-center justify-center">Story or chapters not found.</div>;
  }

  const chapterData = chapters.find(c => c.chapterNumber === currentChapter);

  if (!chapterData) {
     return <div className="flex h-screen items-center justify-center">Chapter {currentChapter} not found.</div>;
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">
      <Button variant="ghost" onClick={() => router.push(`/dashboard/pets/${petId}/personas/${personaId}`)} className="mb-4">
        <ArrowLeft className="mr-2" />
        Back to Persona
      </Button>

      <div className="text-center mb-8">
        <h1 className="font-headline text-4xl font-bold">{story.title}</h1>
        <p className="text-muted-foreground">A {story.tone} tale</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="md:col-span-1">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">{chapterData.chapterTitle}</CardTitle>
                <CardDescription>Chapter {chapterData.chapterNumber}</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                <p>{chapterData.chapterText}</p>
            </div>
            </CardContent>
        </Card>
        <div className="md:col-span-1 flex flex-col gap-4">
            <Card className="overflow-hidden">
                <Image
                    src={chapterData.imageUrl}
                    alt={`Illustration for ${chapterData.chapterTitle}`}
                    width={500}
                    height={500}
                    className="aspect-square w-full object-cover"
                />
            </Card>
            <div className="grid grid-cols-2 gap-2">
                <Button 
                    onClick={() => setCurrentChapter(c => c - 1)} 
                    disabled={currentChapter <= 1}
                    variant="outline"
                >
                    Previous Chapter
                </Button>
                <Button 
                    onClick={() => setCurrentChapter(c => c + 1)}
                    disabled={currentChapter >= story.lastChapter}
                    variant="outline"
                >
                    Next Chapter
                </Button>
            </div>
             <Button onClick={handleGenerateNextChapter} disabled={isGenerating}>
                {isGenerating ? (
                    <><Loader2 className="mr-2 animate-spin" /> Generating...</>
                ) : (
                    <><Wand2 className="mr-2" /> Generate Next Chapter</>
                )}
            </Button>
        </div>
      </div>
    </div>
  );
}
