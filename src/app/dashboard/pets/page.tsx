'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { PlusCircle, Pencil } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ManagePetDialog } from '@/components/CreatePetDialog';
import { useAuth } from '@/hooks/useAuth';
import { useCollection } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import React from 'react';
import { Button } from '@/components/ui/button';

export default function PetSelectionPage() {
  const { user, firestore } = useAuth();

  const petsQuery = React.useMemo(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'petProfiles'));
  }, [firestore, user]);

  const { data: pets, isLoading } = useCollection<any>(petsQuery);
  const petAvatarDefault = PlaceHolderImages.find(p => p.id === 'pet-avatar-default');

  if (isLoading) {
    return <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">Loading pets...</div>;
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
            <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">Select a Pet</h1>
            <p className="text-lg text-muted-foreground">
            Choose a pet to view their mythic personas.
            </p>
        </div>
        <ManagePetDialog>
          <button className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Pet
          </button>
        </ManagePetDialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {pets && pets.map((pet) => (
          <Card key={pet.id} className="group overflow-hidden transition-all duration-200 ease-in-out hover:shadow-lg hover:-translate-y-1">
             <div className="relative">
                <Link href={`/dashboard/pets/${pet.id}`} className="block">
                    <div className="relative aspect-square">
                    <Image
                        src={pet.photoURL || (petAvatarDefault?.imageUrl || '/default-avatar.jpg')}
                        alt={pet.name}
                        fill
                        className="object-cover"
                        data-ai-hint={pet.name}
                    />
                    </div>
                </Link>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ManagePetDialog pet={pet}>
                        <Button variant="secondary" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit Pet</span>
                        </Button>
                    </ManagePetDialog>
                </div>
             </div>
            <CardContent className="p-4">
                <Link href={`/dashboard/pets/${pet.id}`}>
                    <h3 className="font-bold text-lg text-center truncate">{pet.name}</h3>
                </Link>
            </CardContent>
          </Card>
        ))}
        {/* Add new pet card */}
        <ManagePetDialog>
          <Card className="h-full border-2 border-dashed bg-transparent hover:border-primary hover:bg-muted/50 transition-colors duration-200 cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center h-full p-4">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  {petAvatarDefault && <Image src={petAvatarDefault.imageUrl} alt="Default pet avatar" width={80} height={80} className="mb-4 opacity-60" />}
                  <PlusCircle className="h-10 w-10 mb-2" />
                  <p className="font-semibold text-center">Add New Pet</p>
              </div>
            </CardContent>
          </Card>
        </ManagePetDialog>
      </div>
    </div>
  );
}
