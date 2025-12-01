'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { OnboardingGuide } from '@/components/OnboardingGuide';

export default function DashboardPage() {
  const { user, isUserLoading } = useAuth();

  if (isUserLoading) {
    return (
        <div className="flex items-center justify-center h-screen">
            <p>Loading...</p>
        </div>
    );
  }

  if (!user) {
    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <Card className="max-w-md">
                <CardHeader>
                    <CardTitle>Welcome to Mythic Pets</CardTitle>
                    <CardDescription>
                        Please log in to begin your adventure and create legendary personas for your pets.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild className="w-full">
                        <Link href="/login">Log In</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">
      <div className="space-y-4 mb-8 text-center">
        <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">Welcome, {user.displayName || 'Myth-Maker'}!</h1>
        <p className="text-lg text-muted-foreground">
          You're all set to begin a legendary journey. What would you like to do first?
        </p>
      </div>

      {/* Onboarding component will only appear if the user has no pets */}
      <OnboardingGuide />

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle>Manage Your Pets</CardTitle>
                <CardDescription>View your existing pets, add new companions to your roster, and start building their mythic legacies.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-end">
                <Button asChild className="w-full">
                    <Link href="/dashboard/pets">Go to My Pets</Link>
                </Button>
            </CardContent>
        </Card>
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle>Explore the Gallery</CardTitle>
                <CardDescription>Browse through all the amazing personas and epic stories you've created for your mythic pets.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex items-end">
                <Button asChild className="w-full">
                    <Link href="/dashboard/gallery">View Story Gallery</Link>
                </Button>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
