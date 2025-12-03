
'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCollection } from '@/firebase';
import { collectionGroup, query, where } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookHeart, Loader2 } from 'lucide-react';
import Link from 'next/link';

// We need a more detailed type for stories to reconstruct the link
interface UserStory {
    id: string;
    title: string;
    aiPersonaId: string;
    // We need the petId. We can get it from the document path.
    petProfileId: string;
    lastChapter: number;
    status: string;
}

export default function MyStoriesPage() {
  const { user, firestore } = useAuth();

  const storiesQuery = React.useMemo(() => {
    if (!user || !firestore) return null;
    // This query finds all 'aiStories' documents across all subcollections.
    // The security rule will ensure only the user's own stories are returned.
    return query(
      collectionGroup(firestore, 'aiStories')
    );
  }, [firestore, user]);

  const { data: stories, isLoading } = useCollection<any>(storiesQuery);

  const enrichedStories = React.useMemo(() => {
    if (!stories) return [];
    
    // We need to extract the petId and personaId from the document reference path
    return stories.filter(story => story.ref.path.includes(user!.uid)).map(story => {
        // The path will be something like: users/{userId}/petProfiles/{petId}/aiPersonas/{personaId}/aiStories/{storyId}
        const pathSegments = story.ref.path.split('/');
        const petIdIndex = pathSegments.indexOf('petProfiles') + 1;
        const personaIdIndex = pathSegments.indexOf('aiPersonas') + 1;
        
        const petProfileId = pathSegments[petIdIndex];
        const aiPersonaId = pathSegments[personaIdIndex];
        
        return { ...story, petProfileId, aiPersonaId };
    });
  }, [stories, user]);


  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="mr-2 animate-spin" />
          <span>Loading your epic tales...</span>
        </div>
      );
    }

    if (!enrichedStories || enrichedStories.length === 0) {
      return (
        <Card className="text-center">
            <CardHeader>
                <CardTitle>The Library is Empty</CardTitle>
                <CardDescription>You haven't created any stories yet. Let's start a new adventure!</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href="/dashboard/pets">Create Your First Story</Link>
                </Button>
            </CardContent>
        </Card>
      );
    }

    return (
        <div className="space-y-4">
            {enrichedStories.map((story) => (
                <Link key={story.id} href={`/dashboard/pets/${story.petProfileId}/personas/${story.aiPersonaId}/stories/${story.id}`}>
                    <Card className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg">{story.title}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {story.lastChapter} {story.lastChapter > 1 ? 'chapters' : 'chapter'} - {story.status === 'completed' ? 'Completed' : 'In Progress'}
                                </p>
                            </div>
                            <Button variant="outline" size="sm">Continue Reading</Button>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">
      <div className="space-y-2 mb-8">
        <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl flex items-center gap-3">
          <BookHeart className="h-8 w-8" />
          My Story Library
        </h1>
        <p className="text-lg text-muted-foreground">
          All your legendary tales, conveniently gathered in one place.
        </p>
      </div>
      {renderContent()}
    </div>
  );
}
