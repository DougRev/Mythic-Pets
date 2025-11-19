'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { Gem, Loader2, PartyPopper, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function UpgradePage() {
  const { user, firestore } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleUpgrade = async () => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to upgrade.' });
      return;
    }

    setIsUpgrading(true);
    try {
      const userProfileRef = doc(firestore, 'users', user.uid);
      await updateDoc(userProfileRef, {
        planType: 'pro',
      });
      setIsSuccess(true);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upgrade Failed',
        description: error.message || 'Could not complete the upgrade. Please try again.',
      });
      setIsUpgrading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="container mx-auto max-w-lg py-8 px-4 md:px-6 flex items-center justify-center min-h-screen">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto bg-green-100 dark:bg-green-900/50 rounded-full p-3 w-fit">
                <PartyPopper className="h-12 w-12 text-green-500" />
              </div>
              <CardTitle className="font-headline text-3xl mt-4">You're a Pro!</CardTitle>
              <CardDescription>
                Welcome to the Pro Plan! You now have unlimited access to all features, including content regeneration.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-col gap-4">
              <Button asChild className="w-full">
                  <Link href="/dashboard/account">Go to My Account</Link>
              </Button>
               <Button asChild variant="ghost" className="w-full">
                  <Link href="/dashboard">Back to Dashboard</Link>
              </Button>
            </CardFooter>
          </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-lg py-8 px-4 md:px-6">
       <Button asChild variant="ghost" className="mb-4">
        <Link href="/dashboard/account">
            <ArrowLeft className="mr-2" />
            Back to Account
        </Link>
      </Button>
      <Card>
        <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit">
              <Gem className="h-12 w-12 text-primary" />
            </div>
          <CardTitle className="font-headline text-3xl mt-4">Upgrade to Pro</CardTitle>
          <CardDescription>
            Unlock unlimited AI generations, high-resolution downloads, and more.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-center">
                <p className="text-5xl font-bold">$9.99<span className="text-lg font-normal text-muted-foreground">/month</span></p>
                <p className="text-xs text-muted-foreground mt-1">Billed monthly. Cancel anytime.</p>
            </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleUpgrade} disabled={isUpgrading} className="w-full" size="lg">
            {isUpgrading ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Upgrading...</>
            ) : (
              'Confirm Upgrade'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
