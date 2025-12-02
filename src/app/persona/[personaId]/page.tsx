'use client';

import React from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Loader2 } from 'lucide-react';
import { useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';

export default function PublicPersonaPage() {
  const params = useParams();
  const personaId = params.personaId as string;
  const { firestore } = useAuth();

  const personaRef = React.useMemo(() => {
    if (!firestore || !personaId) return null;
    return doc(firestore, 'publicPersonas', personaId);
  }, [firestore, personaId]);

  const { data: persona, isLoading } = useDoc<any>(personaRef);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <span>Loading Persona...</span>
      </div>
    );
  }

  if (!persona) {
    return <div className="flex h-screen items-center justify-center">Persona not found.</div>;
  }

  return (
    <div className="bg-muted min-h-screen py-12">
      <div className="container mx-auto max-w-2xl">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Image
              src={persona.imageUrl}
              alt={persona.theme}
              width={800}
              height={800}
              className="aspect-square w-full object-cover"
            />
          </CardContent>
          <CardHeader>
            <CardTitle className="font-headline text-3xl">{persona.petName} as a {persona.theme}</CardTitle>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
