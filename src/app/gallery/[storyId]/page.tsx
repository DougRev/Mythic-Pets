'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useDoc, useCollection } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

export default function PublicStoryPage() {
  const params = useParams();
  const router = useRouter();
  const { firestore } = useAuth();

  const storyId = params.storyId as string;
  
  const [currentChapter, setCurrentChapter] = useState(1);

  // Memoized reference to the published story
  const storyRef = React.useMemo(() => {
    if (!firestore || !storyId) return null;
    return doc(firestore, 'publishedStories', storyId);
  }, [firestore, storyId]);
  
  // Data fetching for the main story document
  const { data: story, isLoading: isStoryLoading } = useDoc<any>(storyRef);

  // Memoized reference to the chapters subcollection
  const chaptersQuery = React.useMemo(() => {
    if(!storyRef) return null;
    return query(collection(storyRef, 'chapters'), orderBy('chapterNumber'));
  }, [storyRef]);
  
  const { data: chapters, isLoading: areChaptersLoading } = useCollection<any>(chaptersQuery);

  const lastChapterNumber = chapters ? Math.max(...chapters.map(c => c.chapterNumber)) : 1;

  if (isStoryLoading || areChaptersLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin mr-2"/> Loading story...</div>;
  }

  if (!story) {
    return (
        <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6 text-center">
            <h1 className="text-2xl font-bold mb-4">Story Not Found</h1>
            <p className="text-muted-foreground mb-8">This legend seems to have been lost to time.</p>
            <Button asChild>
                <Link href="/dashboard/gallery">Back to Gallery</Link>
            </Button>
        </div>
    );
  }
  
  const chapterData = chapters?.find(c => c.chapterNumber === currentChapter);

  if (!chapterData) {
     return <div className="flex h-screen items-center justify-center">Chapter data is missing from this story.</div>;
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2" />
        Back
      </Button>

      <div className="text-center mb-8">
        <h1 className="font-headline text-4xl font-bold">{story.storyTitle}</h1>
        <p className="text-muted-foreground">A {story.storyTone} tale by {story.authorName}</p>
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
             {chapterData.chapterNumber === lastChapterNumber && (
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
                    disabled={currentChapter <= 1}
                    variant="outline"
                >
                    Previous Chapter
                </Button>
                <Button 
                    onClick={() => setCurrentChapter(c => c + 1)}
                    disabled={currentChapter >= lastChapterNumber}
                    variant="outline"
                >
                    Next Chapter
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
