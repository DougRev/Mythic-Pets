'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Bot, Share2, Sparkles, BookOpen, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useCollection, useDoc } from '@/firebase';
import { doc, collection, query, orderBy, getDocs, writeBatch } from 'firebase/firestore';
import { RegenerateImageDialog } from '@/components/RegenerateImageDialog';
import { RegenerateLoreDialog } from '@/components/RegenerateLoreDialog';
import { ShareDialog } from '@/components/ShareDialog';
import { DeleteDialog } from '@/components/DeleteDialog';
import { useToast } from '@/hooks/use-toast';

export default function PersonaDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const petId = params.petId as string;
  const personaId = params.personaId as string;
  const { user, firestore } = useAuth();
  
  const petRef = React.useMemo(() => {
    if (!user || !firestore || !petId) return null;
    return doc(firestore, 'users', user.uid, 'petProfiles', petId);
  }, [firestore, user, petId]);
  
  const personaRef = React.useMemo(() => {
    if (!petRef || !personaId) return null;
    return doc(petRef, 'aiPersonas', personaId);
  }, [petRef, personaId]);

  const { data: pet, isLoading: isPetLoading } = useDoc<any>(petRef);
  const { data: persona, isLoading: isPersonaLoading, refetch: refetchPersona } = useDoc<any>(personaRef);


  const storiesQuery = React.useMemo(() => {
    if (!personaRef) return null;
    return query(collection(personaRef, 'aiStories'), orderBy('generationDate', 'desc'));
  }, [personaRef]);

  const { data: stories, isLoading: areStoriesLoading, refetch: refetchStories } = useCollection<any>(storiesQuery);

  const handleDeletePersona = async () => {
    if (!personaRef || !firestore || !pet) return;
    try {
      const batch = writeBatch(firestore);

      // 1. Get all stories for the persona
      const storiesSnapshot = await getDocs(collection(personaRef, 'aiStories'));

      for (const storyDoc of storiesSnapshot.docs) {
        // 2. For each story, get and delete all chapters
        const chaptersSnapshot = await getDocs(collection(storyDoc.ref, 'chapters'));
        chaptersSnapshot.forEach(chapterDoc => {
          batch.delete(chapterDoc.ref);
        });

        // 3. Delete the story itself
        batch.delete(storyDoc.ref);
      }

      // 4. Delete the persona document
      batch.delete(personaRef);

      await batch.commit();

      toast({
        title: 'Persona Deleted',
        description: `The "${persona.theme}" persona for ${pet.name} has been deleted.`,
      });
      router.push(`/dashboard/pets/${petId}`);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: error.message || 'Could not delete the persona. Please try again.',
      });
    }
  };
  
  const handleDeleteStory = async (storyId: string, storyTitle: string) => {
    if (!personaRef || !firestore) return;
    try {
      const storyRef = doc(personaRef, 'aiStories', storyId);
      const batch = writeBatch(firestore);
      
      // Delete all chapters in the story
      const chaptersSnapshot = await getDocs(collection(storyRef, 'chapters'));
      chaptersSnapshot.forEach(chapterDoc => {
        batch.delete(chapterDoc.ref);
      });
      
      // Delete the story document itself
      batch.delete(storyRef);
      
      await batch.commit();

      toast({
        title: 'Story Deleted',
        description: `The story "${storyTitle}" has been deleted.`
      });
      refetchStories(); // Refresh the list of stories
    } catch (error: any) {
       toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: error.message || 'Could not delete the story. Please try again.',
      });
    }
  };

  if (isPersonaLoading || isPetLoading) {
    return <div className="flex h-screen items-center justify-center">Loading persona...</div>;
  }

  if (!persona || !pet) {
    return <div className="flex h-screen items-center justify-center">Persona not found.</div>;
  }

  const remixPath = `/dashboard/pets/${pet.id}/create-persona?theme=${encodeURIComponent(persona.theme)}&imageStyle=${encodeURIComponent(persona.imageStyle)}`;

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">
      <Button variant="ghost" onClick={() => router.push(`/dashboard/pets/${petId}`)} className="mb-4">
        <ArrowLeft className="mr-2" />
        Back to All Personas
      </Button>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <Image
                src={persona.imageUrl}
                alt={persona.theme}
                width={600}
                height={600}
                className="aspect-square w-full object-cover"
                key={persona.imageUrl} // Re-renders the image when URL changes
              />
            </CardContent>
          </Card>
           <div className="mt-4 grid grid-cols-3 gap-2">
            <RegenerateImageDialog persona={persona} pet={pet} onRegenerationComplete={refetchPersona}>
              <Button variant="outline" className="w-full"><RefreshCw className="mr-2 h-4 w-4"/>Image</Button>
            </RegenerateImageDialog>
            <ShareDialog persona={persona} pet={pet}>
              <Button variant="outline" className="w-full"><Share2 className="mr-2 h-4 w-4"/>Share</Button>
            </ShareDialog>
            <DeleteDialog
              onConfirm={handleDeletePersona}
              title="Delete Persona"
              description={`Are you sure you want to delete the "${persona.theme}" persona? This will also delete all associated stories and cannot be undone.`}
            >
              <Button variant="destructive-outline" className="w-full"><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
            </DeleteDialog>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-3xl">{persona.theme} Persona</CardTitle>
              <CardDescription>Generated on {new Date(persona.generationDate).toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <Bot />
                  AI-Generated Lore
                </h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{persona.loreText}</p>
              </div>
              <RegenerateLoreDialog persona={persona} pet={pet} onRegenerationComplete={refetchPersona}>
                <Button variant="outline" className="w-full">
                  <Sparkles className="mr-2 h-4 w-4" /> Regenerate Lore
                </Button>
              </RegenerateLoreDialog>
            </CardContent>
          </Card>
          
          <Card className="flex-1">
            <CardHeader>
                <CardTitle>Stories</CardTitle>
                {areStoriesLoading && <CardDescription>Loading stories...</CardDescription>}
                {!areStoriesLoading && (!stories || stories.length === 0) && (
                  <CardDescription>No stories have been generated for this persona yet.</CardDescription>
                )}
            </CardHeader>
            <CardContent>
              {stories && stories.length > 0 && (
                <div className="space-y-2">
                  {stories.map(story => (
                    <div key={story.id} className="group/item flex items-center justify-between p-4 -mx-4 rounded-lg hover:bg-muted transition-colors">
                       <Link href={`/dashboard/pets/${petId}/personas/${personaId}/stories/${story.id}`} className="flex-grow">
                        <h4 className="font-bold flex items-center gap-2"><BookOpen className="h-4 w-4" />{story.title}</h4>
                        <p className="text-sm text-muted-foreground pl-6">{story.lastChapter} {story.lastChapter > 1 ? 'chapters' : 'chapter'}</p>
                      </Link>
                       <DeleteDialog
                        onConfirm={() => handleDeleteStory(story.id, story.title)}
                        title="Delete Story"
                        description={`Are you sure you want to delete the story "${story.title}"? This cannot be undone.`}
                      >
                         <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover/item:opacity-100 transition-opacity">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete story</span>
                         </Button>
                      </DeleteDialog>
                    </div>
                  ))}
                </div>
              )}
              <Button asChild className="w-full mt-4">
                  <Link href={`/dashboard/pets/${petId}/personas/${personaId}/create-story`}>
                    {stories && stories.length > 0 ? 'Create Another Story' : 'Create First Story'}
                  </Link>
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
