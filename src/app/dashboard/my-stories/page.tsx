
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCollection } from '@/firebase';
import { collection, query, doc, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookHeart, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface EnrichedStory {
    id: string;
    title: string;
    petProfileId: string;
    aiPersonaId: string;
    lastChapter: number;
    status: string;
}

const StoryList = ({ petId, personaId }: { petId: string; personaId: string }) => {
  const { user, firestore } = useAuth();
  
  const storiesQuery = React.useMemo(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'petProfiles', petId, 'aiPersonas', personaId, 'aiStories'));
  }, [user, firestore, petId, personaId]);

  const { data: stories, isLoading } = useCollection<any>(storiesQuery);

  if (isLoading || !stories) {
    return null; // Or a smaller loader
  }

  return (
    <>
      {stories.map((story) => (
          <Link key={story.id} href={`/dashboard/pets/${petId}/personas/${personaId}/stories/${story.id}`}>
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
    </>
  );
};

const PersonaStories = ({ petId }: { petId: string }) => {
    const { user, firestore } = useAuth();
    const personasQuery = React.useMemo(() => {
        if (!user || !firestore) return null;
        return query(collection(firestore, 'users', user.uid, 'petProfiles', petId, 'aiPersonas'));
    }, [user, firestore, petId]);
    const { data: personas, isLoading } = useCollection<any>(personasQuery);

    if (isLoading || !personas) return null;

    return (
        <>
            {personas.map(persona => (
                <StoryList key={persona.id} petId={petId} personaId={persona.id} />
            ))}
        </>
    );
};

export default function MyStoriesPage() {
  const { user, firestore } = useAuth();
  
  const petsQuery = React.useMemo(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'petProfiles'));
  }, [user, firestore]);

  const { data: pets, isLoading: arePetsLoading } = useCollection<any>(petsQuery);
  
  const [allStoriesExist, setAllStoriesExist] = useState(false);

  // A bit of a hacky way to check if there are any stories at all after loading everything
  // In a real app, you might have a count on the user profile or a more robust check
  useEffect(() => {
    if (!arePetsLoading && pets) {
        // This is a simplified check. It doesn't guarantee stories exist, but it's a good proxy.
        // A better solution would involve checking if any of the pets have personas or stories.
        const checkStories = async () => {
            if (!firestore || !user) return;
            let storiesFound = false;
            for (const pet of pets) {
                const personasCollection = collection(firestore, 'users', user.uid, 'petProfiles', pet.id, 'aiPersonas');
                const personasSnap = await getDocs(personasCollection);
                if (!personasSnap.empty) {
                    for (const personaDoc of personasSnap.docs) {
                         const storiesCollection = collection(personaDoc.ref, 'aiStories');
                         const storiesSnap = await getDocs(storiesCollection);
                         if (!storiesSnap.empty) {
                             storiesFound = true;
                             break;
                         }
                    }
                }
                if (storiesFound) break;
            }
            setAllStoriesExist(storiesFound);
        };
        checkStories();
    }
  }, [arePetsLoading, pets, firestore, user]);

  const renderContent = () => {
    if (arePetsLoading) {
      return (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="mr-2 animate-spin" />
          <span>Loading your epic tales...</span>
        </div>
      );
    }

    if (!pets || pets.length === 0 || !allStoriesExist) {
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
            {pets.map(pet => (
                <PersonaStories key={pet.id} petId={pet.id} />
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
