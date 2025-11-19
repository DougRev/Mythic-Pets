'use client';

import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2, Heart } from 'lucide-react';
import { useCollection } from '@/firebase';
import { collection, query, orderBy, runTransaction, doc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export default function GalleryPage() {
  const { firestore, user } = useAuth();
  const { toast } = useToast();

  const publishedStoriesQuery = React.useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'publishedStories'), orderBy('publishedDate', 'desc'));
  }, [firestore]);

  const { data: stories, isLoading } = useCollection<any>(publishedStoriesQuery);

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

    try {
      await runTransaction(firestore, async (transaction) => {
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
      });
    } catch (error) {
      console.error('Like transaction failed: ', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not update like status.',
      });
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
              return (
                <Card key={story.id} className="flex flex-col overflow-hidden">
                    <CardHeader className="p-0">
                    <Image
                        src={story.personaImage}
                        alt={story.storyTitle}
                        width={400}
                        height={300}
                        data-ai-hint={story.personaTheme}
                        className="aspect-4/3 w-full object-cover"
                    />
                    </CardHeader>
                    <CardContent className="flex-1 p-4">
                    <CardTitle className="font-headline text-lg leading-tight mb-1">{story.storyTitle}</CardTitle>
                    <p className="text-sm text-muted-foreground">By {story.authorName}</p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex justify-between items-center">
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={() => handleLike(story.id)} disabled={!user}>
                                <Heart className={`h-5 w-5 ${userHasLiked ? 'text-red-500 fill-current' : ''}`} />
                                <span className="sr-only">Like</span>
                            </Button>
                            <span className="text-sm text-muted-foreground">{story.likes || 0}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                            <Share2 className="h-5 w-5" />
                            <span className="sr-only">Share</span>
                        </Button>
                    </CardFooter>
                </Card>
            )})}
        </div>
      )}
    </div>
  );
}

    