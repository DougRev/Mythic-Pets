'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCollection, useDoc } from '@/firebase';
import { doc, collection, query, orderBy, addDoc, updateDoc, writeBatch, deleteField } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Loader2, Wand2, CheckCircle2, UploadCloud, RefreshCw, Gem } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { continueAiStory } from '@/ai/flows/continue-ai-story';
import { uploadFile } from '@/firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { errorEmitter, FirestorePermissionError } from '@/firebase';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RegenerateChapterImageDialog } from '@/components/RegenerateChapterImageDialog';


export default function StoryDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, firestore, storage } = useAuth();
  const { toast } = useToast();

  const petId = params.petId as string;
  const personaId = params.personaId as string;
  const storyId = params.storyId as string;
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [creativePrompt, setCreativePrompt] = useState('');
  const [isGenerateDialogOpen, setGenerateDialogOpen] = useState(false);

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
  
  const userProfileRef = React.useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  // Data fetching
  const { data: pet, isLoading: isPetLoading } = useDoc<any>(petRef);
  const { data: persona, isLoading: isPersonaLoading } = useDoc<any>(personaRef);
  const { data: story, isLoading: isStoryLoading, refetch: refetchStory } = useDoc<any>(storyRef);
  const { data: chapters, isLoading: areChaptersLoading, refetch: refetchChapters } = useCollection<any>(chaptersQuery);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);

  useEffect(() => {
    if (story) {
        // Navigate to the last read or latest chapter
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
    
    if (userProfile?.planType === 'free' && userProfile?.generationCredits <= 0) {
      toast({
        variant: 'destructive',
        title: 'Out of Credits',
        description: 'Please upgrade to the Pro plan for unlimited generations.',
      });
      setGenerateDialogOpen(false);
      return;
    }
    
    setIsGenerating(true);
    try {
        const previousChaptersText = chapters
            .sort((a, b) => a.chapterNumber - b.chapterNumber)
            .map(c => `Chapter ${c.chapterNumber}: ${c.chapterTitle}\n${c.chapterText}`)
            .join('\n\n');
        
        const nextChapterNumber = story.lastChapter + 1;

        const nextChapterResult = await continueAiStory({
            petName: pet.name,
            personaName: persona.personaName,
            petSpecies: persona.petSpecies,
            petBreed: persona.petBreed,
            persona: `Theme: ${persona.theme}\nLore: ${persona.loreText}`,
            tone: story.tone,
            previousChapters: previousChaptersText,
            personaImage: persona.imageUrl,
            storyLength: story.storyLength,
            currentChapter: nextChapterNumber,
            prompt: creativePrompt,
            userId: user.uid,
        });

        if (!nextChapterResult || !nextChapterResult.chapterTitle || !nextChapterResult.chapterText || !nextChapterResult.chapterImage) {
            throw new Error('AI generation failed to return a complete next chapter.');
        }

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
        
        const storyUpdates: { lastChapter: number, status?: string } = {
            lastChapter: nextChapterNumber,
        };

        if (nextChapterResult.isFinalChapter) {
            storyUpdates.status = 'completed';
        }
        
        await updateDoc(storyRef, storyUpdates);

        refetchStory();
        refetchChapters();

        setCurrentChapter(nextChapterNumber);
        setCreativePrompt(''); // Reset prompt
        setGenerateDialogOpen(false); // Close dialog

        toast({
            title: nextChapterResult.isFinalChapter ? 'Story Concluded!' : 'Chapter Generated!',
            description: nextChapterResult.isFinalChapter 
                ? `The epic tale of "${story.title}" is now complete.`
                : `Chapter ${nextChapterNumber} of "${story.title}" has been written.`,
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

  const handlePublish = async () => {
    if (!story || !chapters || !pet || !persona || !user || !firestore || !storyRef) {
        toast({ variant: 'destructive', title: 'Error', description: 'Missing required data to publish.' });
        return;
    }

    setIsPublishing(true);
    
    // Create the main published story document
    const publishedStoryRef = doc(collection(firestore, 'publishedStories'));
    const publishedStoryId = publishedStoryRef.id;

    const publishedStoryData = {
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        petName: pet.name,
        personaTheme: persona.theme,
        personaImage: persona.imageUrl,
        storyTitle: story.title,
        storyTone: story.tone,
        likes: 0,
        likedBy: [],
        publishedDate: new Date().toISOString(),
        id: publishedStoryId,
        // Add references needed for deletion
        petProfileId: petId,
        aiPersonaId: personaId,
        originalStoryId: storyId,
    };
    
    // Use a batch write to ensure atomicity
    const batch = writeBatch(firestore);

    // 1. Create the main published story document
    batch.set(publishedStoryRef, publishedStoryData);

    // 2. Copy all chapters to the new subcollection
    const publishedChaptersCol = collection(publishedStoryRef, 'chapters');
    chapters.forEach(chapter => {
        const { id, ...chapterData } = chapter; // Exclude local 'id'
        const newChapterRef = doc(publishedChaptersCol);
        batch.set(newChapterRef, chapterData);
    });
    
    // 3. Link the original story to the published one
    batch.update(storyRef, { publishedStoryId: publishedStoryId });

    // Commit the batch
    batch.commit()
      .then(() => {
        toast({
            title: 'Story Published!',
            description: `"${story.title}" is now live in the gallery for everyone to see.`,
        });
        refetchStory(); // Refresh to get the new publishedStoryId
        setIsPublishing(false);
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
            path: publishedStoryRef.path, 
            operation: 'create',
            requestResourceData: publishedStoryData,
        });
        errorEmitter.emit('permission-error', permissionError);
        setIsPublishing(false);
      });
  };
  
  if (isStoryLoading || areChaptersLoading || isPetLoading || isPersonaLoading || isProfileLoading) {
    return <div className="flex h-screen items-center justify-center">Loading story...</div>;
  }

  if (!story || !chapters || chapters.length === 0) {
    return <div className="flex h-screen items-center justify-center">Story or chapters not found.</div>;
  }

  const chapterData = chapters.find(c => c.chapterNumber === currentChapter);

  if (!chapterData) {
     return <div className="flex h-screen items-center justify-center">Chapter {currentChapter} not found.</div>;
  }

  const isStoryCompleted = story.status === 'completed';
  const isFreeTier = userProfile?.planType === 'free';
  const hasNoCredits = isFreeTier && userProfile?.generationCredits <= 0;

  const NextChapterButton = () => {
    if (isStoryCompleted) return null;

    if (hasNoCredits) {
      return (
        <Button asChild>
            <Link href="/dashboard/account">
                <Gem className="mr-2" /> Go Pro to Continue
            </Link>
        </Button>
      );
    }

    return (
      <Dialog open={isGenerateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogTrigger asChild>
          <Button>
            <Wand2 className="mr-2" /> Generate Next Chapter
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Next Chapter</DialogTitle>
            <DialogDescription>
              Add some creative direction for the next chapter, or leave it blank for the AI to decide.
              {isFreeTier && ` You have ${userProfile.generationCredits} credits remaining.`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="creative-prompt">Creative Direction (Optional)</Label>
            <Textarea
              id="creative-prompt"
              value={creativePrompt}
              onChange={(e) => setCreativePrompt(e.target.value)}
              placeholder="e.g., Introduce a mysterious new character..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerateNextChapter} disabled={isGenerating}>
              {isGenerating ? (
                <><Loader2 className="mr-2 animate-spin" /> Generating...</>
              ) : (
                <><Wand2 className="mr-2" /> Generate</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">
      <Button variant="ghost" onClick={() => router.push(`/dashboard/pets/${petId}/personas/${personaId}`)} className="mb-4">
        <ArrowLeft className="mr-2" />
        Back to Persona
      </Button>

      <div className="text-center mb-8">
        <h1 className="font-headline text-4xl font-bold">{story.title}</h1>
        <p className="text-muted-foreground">A {story.storyLength}, {story.tone} tale</p>
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
             {isStoryCompleted && chapterData.chapterNumber === story.lastChapter && (
                <CardFooter>
                    <div className="w-full text-center text-lg font-semibold text-muted-foreground flex items-center justify-center gap-2">
                        <CheckCircle2 /> The End
                    </div>
                </CardFooter>
             )}
        </Card>
        <div className="md:col-span-1 flex flex-col gap-4">
            <Card className="overflow-hidden relative group">
                <Image
                    src={chapterData.imageUrl}
                    alt={`Illustration for ${chapterData.chapterTitle}`}
                    width={500}
                    height={500}
                    className="aspect-square w-full object-cover"
                    key={chapterData.imageUrl}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <RegenerateChapterImageDialog
                        chapter={chapterData}
                        persona={persona}
                        story={story}
                        onRegenerationComplete={refetchChapters}
                    >
                        <Button variant="secondary">
                            <RefreshCw className="mr-2" /> Regenerate Image
                        </Button>
                    </RegenerateChapterImageDialog>
                </div>
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
            <NextChapterButton />
             {isStoryCompleted && !story.publishedStoryId && (
                <Button onClick={handlePublish} disabled={isPublishing}>
                   {isPublishing ? (
                       <><Loader2 className="mr-2 animate-spin" /> Publishing...</>
                   ) : (
                       <><UploadCloud className="mr-2" /> Publish to Gallery</>
                   )}
               </Button>
            )}
            {story.publishedStoryId && (
                <Button variant="secondary" asChild>
                    <Link href={`/gallery/${story.publishedStoryId}`}>
                       <CheckCircle2 className="mr-2" /> View in Gallery
                    </Link>
                </Button>
            )}
        </div>
      </div>
    </div>
  );
}

    