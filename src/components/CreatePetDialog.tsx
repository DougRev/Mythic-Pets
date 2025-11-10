'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Upload, PawPrint, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useAuth, useFirestore, useStorage, uploadFile } from '@/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';


type PetDetails = {
  name: string;
  species: string;
  breed: string;
  photoDataUri: string | null;
};

const petAvatarDefault = PlaceHolderImages.find(p => p.id === 'pet-avatar-default');

export function CreatePetDialog({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const firestore = useFirestore();
  const storage = useStorage();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pet, setPet] = useState<PetDetails>({ name: '', species: '', breed: '', photoDataUri: null });

  const handlePetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPet({ ...pet, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPet({ ...pet, photoDataUri: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePet = async () => {
    if (!user || !firestore || !storage) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to create a pet.' });
      return;
    }
    if (!pet.name || !pet.photoDataUri) {
      toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide your pet\'s name and a photo.' });
      return;
    }
    
    setIsLoading(true);

    try {
      // 1. Upload image to Firebase Storage
      const imagePath = `users/${user.uid}/pets/${uuidv4()}`;
      const photoURL = await uploadFile(storage, imagePath, pet.photoDataUri);

      // 2. Save pet data to Firestore with the image URL
      const petData = {
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        photoURL: photoURL, // Use the public URL from Storage
        userProfileId: user.uid,
        createdAt: new Date().toISOString(),
      };
      
      const petsCollection = collection(firestore, 'users', user.uid, 'petProfiles');
      await addDoc(petsCollection, petData);

      toast({ title: 'Pet Created!', description: `${pet.name} has been added to your family.` });
      setPet({ name: '', species: '', breed: '', photoDataUri: null }); // Reset form
      setOpen(false); // Close dialog

    } catch (error) {
      console.error("Error creating pet:", error);
      toast({ variant: 'destructive', title: 'Creation Failed', description: 'Could not save the pet. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PawPrint /> Add a New Pet</DialogTitle>
          <DialogDescription>
            Enter the details for your new companion. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <div className="space-y-2 flex flex-col items-center justify-center">
                <Label htmlFor="photo" className="text-center sr-only">Reference Photo</Label>
                <div className="relative aspect-square w-32 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center">
                {pet.photoDataUri ? (
                    <Image src={pet.photoDataUri} alt="Pet preview" layout="fill" objectFit="cover" className="rounded-full" />
                ) : (
                    <div className="text-center text-muted-foreground p-4">
                    {petAvatarDefault && <Image src={petAvatarDefault.imageUrl} alt="Default pet avatar" width={40} height={40} className="mx-auto mb-1 opacity-50" />}
                    <Upload className="mx-auto h-6 w-6" />
                    </div>
                )}
                <Input id="photo" type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
                <p className="text-xs text-muted-foreground">Upload a photo</p>
            </div>
            <div className="space-y-2">
                <Label htmlFor="name">Pet's Name</Label>
                <Input id="name" name="name" value={pet.name} onChange={handlePetChange} placeholder="Captain Fluffy" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="species">Species</Label>
                    <Input id="species" name="species" value={pet.species} onChange={handlePetChange} placeholder="Cat" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="breed">Breed</Label>
                    <Input id="breed" name="breed" value={pet.breed} onChange={handlePetChange} placeholder="Maine Coon" />
                </div>
            </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSavePet} disabled={isLoading}>
            {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Pet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
