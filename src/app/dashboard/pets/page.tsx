'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

// Mock data - replace with data from Firestore
const pets = [
  { id: '1', name: 'Zarathos', imageUrl: 'https://picsum.photos/seed/cat1/300/300', imageHint: 'black cat' },
  { id: '2', name: 'Luna', imageUrl: 'https://picsum.photos/seed/cat2/300/300', imageHint: 'white cat' },
  { id: '3', name: 'Simba', imageUrl: 'https://picsum.photos/seed/cat3/300/300', imageHint: 'orange cat' },
];

const petAvatarDefault = PlaceHolderImages.find(p => p.id === 'pet-avatar-default');

export default function PetSelectionPage() {
  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
            <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">Select a Pet</h1>
            <p className="text-lg text-muted-foreground">
            Choose a pet to view their mythic personas.
            </p>
        </div>
        <Button asChild>
            <Link href="/dashboard">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add New Pet
            </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {pets.map((pet) => (
          <Link key={pet.id} href={`/dashboard/pets/${pet.id}`} className="group">
            <Card className="overflow-hidden transition-all duration-200 ease-in-out group-hover:shadow-lg group-hover:-translate-y-1">
              <CardContent className="p-0">
                <div className="relative aspect-square">
                  <Image
                    src={pet.imageUrl}
                    alt={pet.name}
                    fill
                    className="object-cover"
                    data-ai-hint={pet.imageHint}
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg text-center">{pet.name}</h3>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {/* Add new pet card */}
        <Link href="/dashboard" className="group">
            <Card className="h-full border-2 border-dashed bg-transparent hover:border-primary hover:bg-muted/50 transition-colors duration-200">
              <CardContent className="flex flex-col items-center justify-center h-full p-4">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    {petAvatarDefault && <Image src={petAvatarDefault.imageUrl} alt="Default pet avatar" width={80} height={80} className="mb-4 opacity-60" />}
                    <PlusCircle className="h-10 w-10 mb-2" />
                    <p className="font-semibold text-center">Add New Pet</p>
                </div>
              </CardContent>
            </Card>
        </Link>
      </div>
    </div>
  );
}
