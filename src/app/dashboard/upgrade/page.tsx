'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Gem, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { getStripe } from '@/lib/stripe-client';

export default function UpgradePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Not Authenticated', description: 'You must be logged in to upgrade.' });
      return;
    }

    setIsUpgrading(true);

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (!res.ok) {
        const errorBody = await res.json();
        throw new Error(errorBody.error || 'Failed to create checkout session.');
      }

      const { sessionId } = await res.json();
      const stripe = await getStripe();
      if (!stripe) {
          throw new Error('Stripe.js has not loaded yet.');
      }

      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        throw new Error(error.message);
      }

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upgrade Failed',
        description: error.message || 'Could not initiate the upgrade. Please try again.',
      });
      setIsUpgrading(false);
    }
  };

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
            <ul className="space-y-3 mt-8 text-sm">
                <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Unlimited Pet Profiles</span>
                </li>
                 <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Unlimited AI Generations & Regenerations</span>
                </li>
                 <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Advanced Story Editing</span>
                </li>
                 <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>High-Resolution Image Downloads</span>
                </li>
                 <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Remove Watermarks</span>
                </li>
            </ul>
        </CardContent>
        <CardFooter>
          <Button onClick={handleUpgrade} disabled={isUpgrading} className="w-full" size="lg">
            {isUpgrading ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</>
            ) : (
              'Upgrade to Pro'
            )}
          </Button>
        </CardFooter>
      </Card>
       <div className="text-center mt-4">
        <Button asChild variant="link">
          <Link href="/success?session_id={CHECKOUT_SESSION_ID}">Go to Success Page (Test)</Link>
        </Button>
         <Button asChild variant="link">
          <Link href="/canceled">Go to Canceled Page (Test)</Link>
        </Button>
      </div>
    </div>
  );
}
