'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Gem, Loader2, CheckCircle2, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDoc } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { createCheckoutSession } from '@/ai/flows/create-checkout-session';
import { createBillingPortalSession } from '@/firebase/actions';

export default function AccountPage() {
  const { user, firestore } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isManaging, setIsManaging] = useState(false);

  useEffect(() => {
    if (searchParams.get('success')) {
      toast({
        title: 'Upgrade Successful!',
        description: 'Welcome to the Pro Plan! You now have unlimited creative power.',
      });
    }
    if (searchParams.get('canceled')) {
      toast({
        variant: 'destructive',
        title: 'Upgrade Canceled',
        description: 'Your upgrade process was canceled. You are still on the Free plan.',
      });
    }
  }, [searchParams, toast]);

  const userProfileRef = React.useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<any>(userProfileRef);

  const handleUpgrade = async () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Not signed in', description: 'You must be signed in to upgrade.' });
        return;
    };

    setIsUpgrading(true);
    try {
      const { sessionId, url } = await createCheckoutSession({
          userId: user.uid,
          userEmail: user.email!,
          appUrl: window.location.origin,
      });

      if (url) {
        window.location.href = url;
      } else {
        throw new Error('Could not create a checkout session.');
      }

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upgrade Failed',
        description: error.message || 'Could not complete the upgrade. Please try again.',
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!user || !userProfile?.stripeCustomerId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find a subscription to manage.' });
        return;
    }
    setIsManaging(true);
    try {
        const { url } = await createBillingPortalSession({ 
            customerId: userProfile.stripeCustomerId,
            appUrl: window.location.origin
        });
        window.location.href = url;
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not open billing portal.' });
    } finally {
        setIsManaging(false);
    }
  };
  
  if (isProfileLoading || !userProfile) {
    return <div className="container mx-auto max-w-2xl py-8 px-4 md:px-6">Loading account details...</div>;
  }

  const isPro = userProfile.planType === 'pro';

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4 md:px-6">
      <div className="space-y-4 mb-8">
        <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">Account Settings</h1>
        <p className="text-lg text-muted-foreground">
          Manage your profile and subscription.
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>This is how your profile appears to others on the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
               <Avatar className="h-16 w-16">
                 <AvatarImage src={userProfile.photoURL || '/avatars/01.png'} alt="User" />
                 <AvatarFallback>MP</AvatarFallback>
               </Avatar>
               <Button variant="outline" disabled>Change Photo</Button>
            </div>
             <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" defaultValue={userProfile.displayName} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue={userProfile.email} disabled />
            </div>
          </CardContent>
          <CardFooter>
            <Button>Save Changes</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Manage your billing and subscription plan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-card p-4 flex items-center justify-between">
                <div>
                    <h3 className="font-bold">{isPro ? 'Pro Plan' : 'Free Tier'}</h3>
                    <p className="text-sm text-muted-foreground">
                        {isPro
                            ? 'You have unlimited regeneration credits.'
                            : `You have ${userProfile.regenerationCredits || 0} regeneration credits remaining.`
                        }
                    </p>
                </div>
                {isPro ? (
                    <Button onClick={handleManageSubscription} disabled={isManaging}>
                        {isManaging ? <Loader2 className="mr-2 animate-spin"/> : <Settings className="mr-2" />}
                        {isManaging ? 'Redirecting...' : 'Manage Subscription'}
                    </Button>
                ) : (
                    <Button onClick={handleUpgrade} disabled={isUpgrading}>
                        {isUpgrading ? <Loader2 className="mr-2 animate-spin"/> : <Gem className="mr-2" />}
                        {isUpgrading ? 'Redirecting...' : 'Upgrade to Pro'}
                    </Button>
                )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
