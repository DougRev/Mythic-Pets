'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCollection, useDoc } from '@/firebase';
import { collection, doc, query } from 'firebase/firestore';
import React from 'react';

export default function PersonaGalleryPage({ params: { petId } }: { params: { petId: string } }) {
  const { user, firestore } = useAuth();

  const petRef = React.useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid, 'petProfiles', petId);
  }, [firestore, user, petId]);

  const { data: pet, isLoading: isPetLoading } = useDoc<any>(petRef);

  const personasQuery = React.useMemo(() => {
    if (!petRef) return null;
    return query(collection(petRef, 'aiPersonas'));
  }, [petRef]);

  const { data: personas, isLoading: isPersonasLoading } = useCollection<any>(personasQuery);

  if (isPetLoading) {
    return <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">Loading...</div>;
  }

  if (!pet) {
    return <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">Pet not found.</div>;
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">
      <div className="flex items-center justify-between mb-8">
         <div className="space-y-2">
            <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">
              {pet.name}'s Personas
            </h1>
            <p className="text-lg text-muted-foreground">
              Select a persona to see their stories or create a new one.
            </p>
        </div>
        <Button asChild>
          <Link href={`/dashboard/pets/${petId}/create-persona`}>
             <PlusCircle className="mr-2 h-4 w-4" />
             Create New Persona
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {isPersonasLoading && <p>Loading personas...</p>}
        {personas && personas.map((persona) => (
          <Link key={persona.id} href={`/dashboard/pets/${petId}/personas/${persona.id}`} className="group">
            <Card className="overflow-hidden transition-all duration-200 ease-in-out group-hover:shadow-xl group-hover:-translate-y-1">
              <CardContent className="p-0">
                <div className="relative aspect-square">
                  <Image
                    src={persona.imageUrl}
                    alt={persona.theme}
                    fill
                    className="object-cover"
                    data-ai-hint={persona.theme}
                  />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                   <div className="absolute bottom-0 left-0 p-4">
                    <h3 className="font-bold text-xl text-white font-headline">{persona.theme}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
         <Link href={`/dashboard/pets/${petId}/create-persona`} className="group">
            <Card className="h-full border-2 border-dashed bg-transparent hover:border-primary hover:bg-muted/50 transition-colors duration-200">
              <CardContent className="flex flex-col items-center justify-center h-full p-4">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <PlusCircle className="h-12 w-12 mb-4" />
                    <p className="font-semibold text-lg text-center">Create New Persona</p>
                </div>
              </CardContent>
            </Card>
        </Link>
      </div>
    </div>
  );
}
