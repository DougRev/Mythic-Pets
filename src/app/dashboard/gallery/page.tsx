'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2, Heart, Download } from 'lucide-react';
import { useCollection } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';

export default function GalleryPage() {
  const { firestore } = useAuth();

  const publishedStoriesQuery = React.useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'publishedStories'), orderBy('publishedDate', 'desc'));
  }, [firestore]);

  const { data: stories, isLoading } = useCollection<any>(publishedStoriesQuery);

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
            {stories.map((story) => (
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
                <CardFooter className="p-4 pt-0 flex justify-between">
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                        <Heart className="h-5 w-5" />
                        <span className="sr-only">Favorite</span>
                    </Button>
                    <span className="text-sm text-muted-foreground">{story.likes || 0}</span>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                        <Share2 className="h-5 w-5" />
                        <span className="sr-only">Share</span>
                    </Button>
                </CardFooter>
            </Card>
            ))}
        </div>
      )}
    </div>
  );
}

    