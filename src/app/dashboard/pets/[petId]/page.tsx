'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Gem } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCollection, useDoc } from '@/firebase';
import { collection, doc, query } from 'firebase/firestore';

export default function PersonaGalleryPage() {
  const params = useParams();
  const petId = params.petId as string;
  const { user, firestore } = useAuth();

  const userProfileRef = React.useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isUserLoading } = useDoc<any>(userProfileRef);

  const petRef = React.useMemo(() => {
    if (!user || !firestore || !petId) return null;
    return doc(firestore, 'users', user.uid, 'petProfiles', petId);
  }, [firestore, user, petId]);

  const { data: pet, isLoading: isPetLoading } = useDoc<any>(petRef);

  const personasQuery = React.useMemo(() => {
    if (!petRef) return null;
    return query(collection(petRef, 'aiPersonas'));
  }, [petRef]);

  const { data: personas, isLoading: isPersonasLoading } = useCollection<any>(personasQuery);

  const isFreeTier = userProfile?.planType === 'free';
  const hasReachedPersonaLimit = !!(isFreeTier && personas && personas.length >= 2);

  if (isPetLoading || isUserLoading) {
    return <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">Loading...</div>;
  }

  if (!pet) {
    return <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">Pet not found.</div>;
  }
  
  const AddButton = () => {
    if (hasReachedPersonaLimit) {
        return (
            <Button asChild>
                <Link href="/dashboard/account">
                    <Gem className="mr-2 h-4 w-4" />
                    Go Pro for More Personas
                </Link>
            </Button>
        );
    }
    return (
        <Button asChild>
            <Link href={`/dashboard/pets/${petId}/create-persona`}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Persona
            </Link>
        </Button>
    );
  }


  const AddPersonaCard = () => {
    if (hasReachedPersonaLimit) {
        return (
            <Link href="/dashboard/account" className="group">
                <Card className="h-full border-2 border-dashed bg-muted/20 hover:border-primary hover:bg-muted/50 transition-colors duration-200">
                  <CardContent className="flex flex-col items-center justify-center h-full p-4">
                      <div className="flex flex-col items-center justify-center text-center text-muted-foreground group-hover:text-primary transition-colors">
                        <Gem className="h-12 w-12 mb-4" />
                        <p className="font-semibold text-lg">Go Pro for More</p>
                        <p className="text-sm">Upgrade to create unlimited personas.</p>
                    </div>
                  </CardContent>
                </Card>
            </Link>
        );
    }

    return (
         <Link href={`/dashboard/pets/${petId}/create-persona`} className="group">
            <Card className="h-full border-2 border-dashed bg-transparent hover:border-primary hover:bg-muted/50 transition-colors duration-200">
              <CardContent className="flex flex-col items-center justify-center h-full p-4">
                  <div className="flex flex-col items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                    <PlusCircle className="h-12 w-12 mb-4" />
                    <p className="font-semibold text-lg text-center">Create New Persona</p>
                </div>
              </CardContent>
            </Card>
        </Link>
    );
  }

  const renderContent = () => {
    if (isPersonasLoading) {
      return <p>Loading personas...</p>;
    }

    return (
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {personas && personas.map((persona) => (
          <Link key={persona.id} href={`/dashboard/pets/${petId}/personas/${persona.id}`} className="group">
            <Card className="overflow-hidden transition-all duration-200 ease-in-out group-hover:shadow-xl group-hover:-translate-y-1">
              <CardContent className="p-0">
                <div className="relative aspect-square">
                  <Image
                    src={persona.imageUrl}
                    alt={persona.personaName}
                    fill
                    className="object-cover"
                    data-ai-hint={persona.theme}
                  />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                   <div className="absolute bottom-0 left-0 p-4">
                    <h3 className="font-bold text-xl text-white font-headline">{persona.personaName}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        <AddPersonaCard />
      </div>
    );
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
        <AddButton />
      </div>
      {renderContent()}
    </div>
  );
}
