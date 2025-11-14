'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';

export default function StoryDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, firestore } = useAuth();

  const petId = params.petId as string;
  const personaId = params.personaId as string;
  const storyId = params.storyId as string;

  const storyRef = React.useMemo(() => {
    if (!user || !firestore || !petId || !personaId || !storyId) return null;
    return doc(firestore, 'users', user.uid, 'petProfiles', petId, 'aiPersonas', personaId, 'aiStories', storyId);
  }, [firestore, user, petId, personaId, storyId]);

  const { data: story, isLoading: isStoryLoading } = useDoc<any>(storyRef);

  if (isStoryLoading) {
    return <div className="flex h-screen items-center justify-center">Loading story...</div>;
  }

  if (!story) {
    return <div className="flex h-screen items-center justify-center">Story not found.</div>;
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4 md:px-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2" />
        Back to Persona
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl">{story.title}</CardTitle>
          <CardDescription>
            A {story.length} story with a {story.tone} tone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
            <p>{story.storyText}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
