'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Bot, Edit, Share2, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';

export default function PersonaDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const petId = params.petId as string;
  const personaId = params.personaId as string;
  const { user, firestore } = useAuth();
  

  const personaRef = React.useMemo(() => {
    if (!user || !firestore || !petId || !personaId) return null;
    return doc(firestore, 'users', user.uid, 'petProfiles', petId, 'aiPersonas', personaId);
  }, [firestore, user, petId, personaId]);

  const { data: persona, isLoading } = useDoc<any>(personaRef);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading persona...</div>;
  }

  if (!persona) {
    return <div className="flex h-screen items-center justify-center">Persona not found.</div>;
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">
      <Button variant="ghost" onClick={() => router.push(`/dashboard/pets/${petId}`)} className="mb-4">
        <ArrowLeft className="mr-2" />
        Back to All Personas
      </Button>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <Image
                src={persona.imageUrl}
                alt={persona.theme}
                width={600}
                height={600}
                className="aspect-square w-full object-cover"
              />
            </CardContent>
          </Card>
           <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline"><Share2 className="mr-2"/>Share</Button>
            <Button variant="outline"><Trash2 className="mr-2"/>Delete</Button>
          </div>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-3xl">{persona.theme} Persona</CardTitle>
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
               <Button variant="outline" className="w-full">
                <Sparkles className="mr-2" /> Regenerate Lore
              </Button>
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
                <CardTitle>Stories</CardTitle>
                <CardDescription>No stories have been generated for this persona yet.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button className="w-full">
                    <Edit className="mr-2"/>
                    Create First Story
                </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
