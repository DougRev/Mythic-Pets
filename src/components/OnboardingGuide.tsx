'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCollection } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, PlusCircle } from 'lucide-react';
import { ManagePetDialog } from './ManagePetDialog';

export function OnboardingGuide() {
  const { user, firestore } = useAuth();

  const petsQuery = React.useMemo(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'users', user.uid, 'petProfiles'));
  }, [firestore, user]);

  const { data: pets, isLoading } = useCollection<any>(petsQuery);

  // Render nothing if pets are loading, if there are pets, or if the user is not logged in.
  if (isLoading || (pets && pets.length > 0) || !user) {
    return null;
  }

  // Display the onboarding guide only if the user has zero pets.
  return (
    <Card className="mb-8 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Welcome to Your Mythic Journey!</CardTitle>
        <CardDescription>
          It looks like you're new here. The first step is to create a profile for your pet. Let's add your first companion.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ManagePetDialog>
          <Button size="lg">
            <PlusCircle className="mr-2" />
            Add Your First Pet
            <ArrowRight className="ml-2" />
          </Button>
        </ManagePetDialog>
      </CardContent>
    </Card>
  );
}
