'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { CreatePetDialog } from '@/components/CreatePetDialog';
import { DeleteDialog } from '@/components/DeleteDialog';
import { useAuth } from '@/hooks/useAuth';
import { useCollection } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { deleteDocumentAndSubcollections } from '@/ai/flows/delete-collection-flow';
import React from 'react';

export default function PetSelectionPage() {
  const { user, firestore } = useAuth();
  const { toast } = useToast();

  const petsQuery = React.useMemo(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'petProfiles'));
  }, [firestore, user]);

  const { data: pets, isLoading, refetch: refetchPets } = useCollection<any>(petsQuery);
  const petAvatarDefault = PlaceHolderImages.find(p => p.id === 'pet-avatar-default');

  const handleDeletePet = async (petId: string, petName: string) => {
    if (!user || !firestore) return;
    try {
        const petDocRef = doc(firestore, 'users', user.uid, 'petProfiles', petId);
        await deleteDocumentAndSubcollections({ docPath: petDocRef.path });
        toast({
            title: 'Pet Deleted',
            description: `${petName} and all their personas have been deleted.`,
        });
        refetchPets();
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Deletion Failed',
            description: error.message || `Could not delete ${petName}.`,
        });
    }
  };

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
        <CreatePetDialog onPetCreated={refetchPets}>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Pet
          </Button>
        </CreatePetDialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {pets && pets.map((pet) => (
          <Card key={pet.id} className="group/item overflow-hidden transition-all duration-200 ease-in-out hover:shadow-lg hover:-translate-y-1">
            <Link href={`/dashboard/pets/${pet.id}`} className="group">
              <CardContent className="p-0">
                <div className="relative aspect-square">
                  <Image
                    src={pet.photoURL || (petAvatarDefault?.imageUrl || '/default-avatar.jpg')}
                    alt={pet.name}
                    fill
                    className="object-cover"
                    data-ai-hint={pet.name}
                  />
                   <div className="absolute top-1 right-1 z-10">
                        <DeleteDialog
                            onConfirm={() => handleDeletePet(pet.id, pet.name)}
                            title={`Delete ${pet.name}?`}
                            description="Are you sure you want to delete this pet? This will also delete all of their personas and stories forever."
                        >
                            <Button variant="destructive" size="icon" className="h-8 w-8 opacity-0 group-hover/item:opacity-100 transition-opacity" onClick={(e) => {e.preventDefault(); e.stopPropagation();}}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete pet</span>
                            </Button>
                        </DeleteDialog>
                    </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg text-center">{pet.name}</h3>
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
        {/* Add new pet card */}
        <CreatePetDialog onPetCreated={refetchPets}>
          <Card className="h-full border-2 border-dashed bg-transparent hover:border-primary hover:bg-muted/50 transition-colors duration-200 cursor-pointer">
            <CardContent className="flex flex-col items-center justify-center h-full p-4">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  {petAvatarDefault && <Image src={petAvatarDefault.imageUrl} alt="Default pet avatar" width={80} height={80} className="mb-4 opacity-60" />}
                  <PlusCircle className="h-10 w-10 mb-2" />
                  <p className="font-semibold text-center">Add New Pet</p>
              </div>
            </CardContent>
          </Card>
        </CreatePetDialog>
      </div>
    </div>
  );
}
