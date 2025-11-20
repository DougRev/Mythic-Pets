'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Share2, Heart, Trash2 } from 'lucide-react';
import { useCollection } from '@/firebase';
import { collection, query, orderBy, runTransaction, doc, arrayUnion, arrayRemove, increment, getDocs, writeBatch, updateDoc, deleteField } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter, FirestorePermissionError } from '@/firebase';

export default function GalleryPage() {
  const { firestore, user } = useAuth();
  const { toast } = useToast();

  const publishedStoriesQuery = React.useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'publishedStories'), orderBy('publishedDate', 'desc'));
  }, [firestore]);

  const { data: stories, isLoading, refetch: refetchStories } = useCollection<any>(publishedStoriesQuery);

  const handleLike = async (storyId: string) => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Not logged in',
        description: 'You must be logged in to like a story.',
      });
      return;
    }

    const storyRef = doc(firestore, 'publishedStories', storyId);

    runTransaction(firestore, async (transaction) => {
      const storyDoc = await transaction.get(storyRef);
      if (!storyDoc.exists()) {
        throw 'Story does not exist!';
      }

      const storyData = storyDoc.data();
      const likedBy = storyData.likedBy || [];
      const userHasLiked = likedBy.includes(user.uid);
      
      let newLikedBy;
      let newLikes;

      if (userHasLiked) {
        // Unlike the story
        newLikedBy = arrayRemove(user.uid);
        newLikes = increment(-1);
      } else {
        // Like the story
        newLikedBy = arrayUnion(user.uid);
        newLikes = increment(1);
      }

      transaction.update(storyRef, { 
        likedBy: newLikedBy,
        likes: newLikes
      });
    }).catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: storyRef.path,
          operation: 'update',
          requestResourceData: {
            likes: 'increment/decrement',
            likedBy: 'arrayUnion/arrayRemove'
          }
        });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleDelete = async (story: any) => {
    if (!firestore || !user || user.uid !== story.authorId) {
        toast({ variant: 'destructive', title: 'Unauthorized', description: 'You can only delete your own stories.' });
        return;
    }

    const publicStoryRef = doc(firestore, 'publishedStories', story.id);
    const originalStoryRef = doc(firestore, 'users', story.authorId, 'petProfiles', story.petProfileId, 'aiPersonas', story.aiPersonaId, 'aiStories', story.originalStoryId);

    try {
        const batch = writeBatch(firestore);

        // 1. Get and delete all chapters in the subcollection
        const chaptersSnapshot = await getDocs(collection(publicStoryRef, 'chapters'));
        chaptersSnapshot.forEach(chapterDoc => {
            batch.delete(chapterDoc.ref);
        });

        // 2. Delete the main public story document
        batch.delete(publicStoryRef);

        // 3. Unlink the original story
        if(story.originalStoryId) {
            const privateStoryRef = doc(firestore, 'users', user.uid, 'petProfiles', story.petProfileId, 'aiPersonas', story.aiPersonaId, 'aiStories', story.originalStoryId);
             batch.update(privateStoryRef, { publishedStoryId: deleteField() });
        }


        await batch.commit();
        
        toast({ title: 'Story Unpublished', description: `"${story.storyTitle}" has been removed from the gallery.` });
        refetchStories(); // Refresh the gallery view

    } catch (error) {
        console.error("Failed to delete story: ", error);
        toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not remove the story from the gallery.' });
    }
  };


  if (isLoading) {
    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <div className="space-y-4 mb-8">
                <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">Story Gallery</h1>
                <p className="text-lg text-muted-foreground">
                Browse the legendary tales of mythic pets from our community.
                </p>
            </div>
            <p>Loading stories...</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="space-y-4 mb-8">
        <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">Story Gallery</h1>
        <p className="text-lg text-muted-foreground">
          Browse the legendary tales of mythic pets from our community.
        </p>
      </div>

      {!stories || stories.length === 0 ? (
        <div className="text-center py-16">
            <h2 className="text-2xl font-semibold">The Gallery is Empty</h2>
            <p className="text-muted-foreground mt-2">Be the first to publish a story and share your pet's legend!</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {stories.map((story) => {
              const userHasLiked = user && story.likedBy?.includes(user.uid);
              const isAuthor = user && story.authorId === user.uid;
              return (
                <Card key={story.id} className="group flex flex-col overflow-hidden transition-all duration-200 ease-in-out hover:shadow-xl hover:-translate-y-1">
                    <Link href={`/gallery/${story.id}`} className="group h-full flex flex-col">
                        <CardHeader className="p-0">
                          <div className="relative aspect-square w-full">
                            <Image
                                src={story.personaImage}
                                alt={story.storyTitle}
                                fill
                                data-ai-hint={story.personaTheme}
                                className="object-cover"
                            />
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-4">
                        <CardTitle className="font-headline text-lg leading-tight mb-1">{story.storyTitle}</CardTitle>
                        <p className="text-sm text-muted-foreground">By {story.authorName}</p>
                        </CardContent>
                    </Link>
                    <CardFooter className="p-4 pt-0 flex justify-between items-center mt-auto">
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLike(story.id); }} disabled={!user}>
                                <Heart className={`h-5 w-5 ${userHasLiked ? 'text-red-500 fill-current' : ''}`} />
                                <span className="sr-only">Like</span>
                            </Button>
                            <span className="text-sm text-muted-foreground">{story.likes || 0}</span>
                        </div>
                        <div className="flex items-center">
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); /* Share logic here */ }}>
                                <Share2 className="h-5 w-5" />
                                <span className="sr-only">Share</span>
                            </Button>
                             {isAuthor && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                      <Trash2 className="h-5 w-5" />
                                      <span className="sr-only">Delete</span>
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently remove your story from the public gallery. It will not delete your original private copy.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(story)}>Unpublish</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                    </CardFooter>
                </Card>
            )})}
        </div>
      )}
    </div>
  );
}
