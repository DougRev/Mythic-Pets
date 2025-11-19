'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useCollection, useDoc } from '@/firebase';
import { doc, collection, query, orderBy, addDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Loader2, Wand2, CheckCircle2, UploadCloud, Edit, Save, XCircle } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { continueAiStory } from '@/ai/flows/continue-ai-story';
import { uploadFile } from '@/firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { errorEmitter, FirestorePermissionError } from '@/firebase';

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
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');

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
  const { data: chapters, isLoading: areChaptersLoading, refetch: refetchChapters } = useCollection<any>(chaptersQuery);

  const chapterData = chapters?.find(c => c.chapterNumber === currentChapter);

  useEffect(() => {
    if (story) {
        setCurrentChapter(story.lastChapter);
    }
  }, [story]);
  
  useEffect(() => {
      if (isEditing && chapterData) {
        setEditedText(chapterData.chapterText);
      }
  }, [isEditing, chapterData]);


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
        
        const nextChapterNumber = story.lastChapter + 1;

        const nextChapterResult = await continueAiStory({
            petName: pet.name,
            persona: `Theme: ${persona.theme}\nLore: ${persona.loreText}`,
            tone: story.tone,
            previousChapters: previousChaptersText,
            personaImage: persona.imageUrl,
            storyLength: story.storyLength,
            currentChapter: nextChapterNumber
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

  const handlePublish = () => {
    if (!story || !chapters || !pet || !persona || !user || !firestore || !storyRef) {
        toast({ variant: 'destructive', title: 'Error', description: 'Missing required data to publish.' });
        return;
    }

    setIsPublishing(true);

    const batch = writeBatch(firestore);
    
    // 1. Create the new published story document
    const publishedStoryRef = doc(collection(firestore, 'publishedStories'));
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
        id: publishedStoryRef.id,
    };
    batch.set(publishedStoryRef, publishedStoryData);

    // 2. Copy all chapters to the new published story
    const publishedChaptersCol = collection(publishedStoryRef, 'chapters');
    chapters.forEach(chapter => {
        const newChapterRef = doc(publishedChaptersCol);
        const chapterCopy = { ...chapter };
        delete (chapterCopy as any).id;
        batch.set(newChapterRef, chapterCopy);
    });
    
    // 3. Update the original story to link to the published version
    batch.update(storyRef, { publishedStoryId: publishedStoryRef.id });

    // 4. Commit all changes atomically
    batch.commit()
      .then(() => {
        toast({
            title: 'Story Published!',
            description: `"${story.title}" is now live in the gallery for everyone to see.`,
        });
        refetchStory(); // Refresh story to get the publishedStoryId
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
            path: publishedStoryRef.path, // Use the path of the document we tried to create
            operation: 'create', // The batch write is primarily a create operation for the public story
            requestResourceData: publishedStoryData, // Provide the data that was denied
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsPublishing(false);
      });
  };

  const handleSaveEdit = async () => {
      if (!storyRef || !chapterData) return;
      setIsGenerating(true); // Reuse loading state
      try {
        const chapterDocRef = doc(storyRef, 'chapters', chapterData.id);
        await updateDoc(chapterDocRef, { chapterText: editedText });
        toast({ title: 'Chapter Saved!', description: 'Your edits have been saved.' });
        refetchChapters(); // Refresh chapters to show new text
        setIsEditing(false);
      } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: error.message || 'Could not save your changes.',
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

  if (!chapterData) {
     return <div className="flex h-screen items-center justify-center">Chapter {currentChapter} not found.</div>;
  }

  const isStoryCompleted = story.status === 'completed';

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
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="font-headline text-2xl">{chapterData.chapterTitle}</CardTitle>
                  <CardDescription>Chapter {chapterData.chapterNumber}</CardDescription>
                </div>
                {!isEditing && (
                    <Button variant="outline" size="icon" onClick={() => setIsEditing(true)}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit Chapter</span>
                    </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
                {isEditing ? (
                    <div className="space-y-4">
                        <Textarea
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            className="w-full h-64 resize-none"
                        />
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isGenerating}>
                                <XCircle className="mr-2" /> Cancel
                            </Button>
                             <Button onClick={handleSaveEdit} disabled={isGenerating}>
                                {isGenerating ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                                Save
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                        <p>{chapterData.chapterText}</p>
                    </div>
                )}
            </CardContent>
             {isStoryCompleted && chapterData.chapterNumber === story.lastChapter && !isEditing && (
                <CardFooter>
                    <div className="w-full text-center text-lg font-semibold text-muted-foreground flex items-center justify-center gap-2">
                        <CheckCircle2 /> The End
                    </div>
                </CardFooter>
             )}
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
                    disabled={currentChapter <= 1 || isEditing}
                    variant="outline"
                >
                    Previous Chapter
                </Button>
                <Button 
                    onClick={() => setCurrentChapter(c => c + 1)}
                    disabled={currentChapter >= story.lastChapter || isEditing}
                    variant="outline"
                >
                    Next Chapter
                </Button>
            </div>
            {!isStoryCompleted && (
                 <Button onClick={handleGenerateNextChapter} disabled={isGenerating || isEditing}>
                    {isGenerating ? (
                        <><Loader2 className="mr-2 animate-spin" /> Generating...</>
                    ) : (
                        <><Wand2 className="mr-2" /> Generate Next Chapter</>
                    )}
                </Button>
            )}
             {isStoryCompleted && !story.publishedStoryId && (
                <Button onClick={handlePublish} disabled={isPublishing || isEditing}>
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
