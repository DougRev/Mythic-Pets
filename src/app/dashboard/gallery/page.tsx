'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Share2, Heart } from 'lucide-react';
import { useCollection } from '@/firebase';
import { collection, query, orderBy, runTransaction, doc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter, FirestorePermissionError } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface PublishedPersona {
  id: string;
  personaImageUrl: string;
  personaTheme: string;
  authorAvatarUrl: string;
  authorName: string;
  likes: number;
  likedBy: string[];
}

export default function GalleryPage() {
  const { firestore, user } = useAuth();
  const { toast } = useToast();

  const publishedPersonasQuery = React.useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'publishedPersonas'), orderBy('publishedDate', 'desc'));
  }, [firestore]);

  const { data: personas, isLoading } = useCollection<PublishedPersona>(publishedPersonasQuery);

  const handleLike = async (personaId: string) => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Not logged in',
        description: 'You must be logged in to like a persona.',
      });
      return;
    }

    const personaRef = doc(firestore, 'publishedPersonas', personaId);

    runTransaction(firestore, async (transaction) => {
      const personaDoc = await transaction.get(personaRef);
      if (!personaDoc.exists()) {
        throw 'Persona does not exist!';
      }

      const personaData = personaDoc.data();
      const likedBy = personaData.likedBy || [];
      const userHasLiked = likedBy.includes(user.uid);
      
      let newLikedBy;
      let newLikes;

      if (userHasLiked) {
        // Unlike the persona
        newLikedBy = arrayRemove(user.uid);
        newLikes = increment(-1);
      } else {
        // Like the persona
        newLikedBy = arrayUnion(user.uid);
        newLikes = increment(1);
      }

      transaction.update(personaRef, {
        likedBy: newLikedBy,
        likes: newLikes
      });
    }).catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: personaRef.path,
          operation: 'update',
          requestResourceData: {
            likes: 'increment/decrement',
            likedBy: 'arrayUnion/arrayRemove'
          }
        });
        errorEmitter.emit('permission-error', permissionError);
    });
  };

  if (isLoading) {
    return (
        <div className="container mx-auto py-8 px-4 md:px-6">
            <div className="space-y-4 mb-8">
                <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">Community Showcase</h1>
                <p className="text-lg text-muted-foreground">
                Browse the mythic personas from our community.
                </p>
            </div>
            <p>Loading personas...</p>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="space-y-4 mb-8">
        <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">Community Showcase</h1>
        <p className="text-lg text-muted-foreground">
          Browse the mythic personas from our community.
        </p>
      </div>

      {!personas || personas.length === 0 ? (
        <div className="text-center py-16">
            <h2 className="text-2xl font-semibold">The Showcase is Empty</h2>
            <p className="text-muted-foreground mt-2">Be the first to publish a persona and share your pet's legend!</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {personas.map((persona) => {
              const userHasLiked = user && persona.likedBy?.includes(user.uid);
              return (
                <Link key={persona.id} href={`/gallery/${persona.id}`} className="group">
                  <Card className="flex flex-col overflow-hidden h-full transition-all duration-200 ease-in-out group-hover:shadow-xl group-hover:-translate-y-1">
                      <CardHeader className="p-0">
                      <Image
                          src={persona.personaImageUrl}
                        alt={persona.personaTheme}
                        width={400}
                        height={400}
                        className="aspect-square w-full object-cover"
                    />
                    </CardHeader>
                    <CardContent className="flex-1 p-4">
                      <CardTitle className="font-headline text-lg leading-tight mb-2">{persona.personaTheme}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={persona.authorAvatarUrl} alt={persona.authorName} />
                          <AvatarFallback>{persona.authorName?.charAt(0) || 'A'}</AvatarFallback>
                        </Avatar>
                        <span>{persona.authorName}</span>
                      </div>
                    </CardContent>
                    <CardFooter className="p-4 pt-0 flex justify-between items-center">
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLike(persona.id); }} disabled={!user}>
                                <Heart className={`h-5 w-5 ${userHasLiked ? 'text-red-500 fill-current' : ''}`} />
                                <span className="sr-only">Like</span>
                            </Button>
                            <span className="text-sm text-muted-foreground">{persona.likes || 0}</span>
                        </div>
                        {/* Add Share logic if needed */}
                    </CardFooter>
                </Card>
            )})}
        </div>
      )}
    </div>
  );
}
