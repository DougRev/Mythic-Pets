'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Bot, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export default function PublishedPersonaPage() {
  const router = useRouter();
  const params = useParams();
  const personaId = params.personaId as string;
  const { user, firestore } = useAuth();

  const personaRef = React.useMemo(() => {
    if (!firestore || !personaId) return null;
    return doc(firestore, 'publishedPersonas', personaId);
  }, [firestore, personaId]);

  const { data: persona, isLoading } = useDoc<any>(personaRef);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading persona...</div>;
  }

  if (!persona) {
    return <div className="flex h-screen items-center justify-center">Persona not found.</div>;
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">
      <Button variant="ghost" onClick={() => router.back()} className="mb-4">
        <ArrowLeft className="mr-2" />
        Back to Gallery
      </Button>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <Image
                src={persona.personaImageUrl}
                alt={persona.personaTheme}
                width={600}
                height={600}
                className="aspect-square w-full object-cover"
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-3xl">{persona.personaTheme}</CardTitle>
              <CardDescription>
                Published on {new Date(persona.publishedDate.toDate()).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <Bot />
                  AI-Generated Lore
                </h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{persona.personaLore}</p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t">
                 <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Avatar>
                        <AvatarImage src={persona.authorAvatarUrl} alt={persona.authorName} />
                        <AvatarFallback>{persona.authorName?.charAt(0) || 'A'}</AvatarFallback>
                    </Avatar>
                    <span>{persona.authorName} for {persona.petName}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Heart className="text-red-500" />
                    <span className="font-bold">{persona.likes || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
