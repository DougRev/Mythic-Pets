'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Gem, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDoc } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function AccountPage() {
  const { user, firestore } = useAuth();
  const { toast } = useToast();
  const [isUpgrading, setIsUpgrading] = React.useState(false);

  const userProfileRef = React.useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading, refetch: refetchProfile } = useDoc<any>(userProfileRef);

  const handleUpgrade = async () => {
    if (!userProfileRef) return;

    setIsUpgrading(true);
    try {
      await updateDoc(userProfileRef, {
        planType: 'pro',
        regenerationCredits: -1, // -1 for unlimited
      });
      toast({
        title: 'Upgrade Successful!',
        description: 'Welcome to the Pro Plan! You now have unlimited regeneration credits.',
      });
      refetchProfile(); // Refresh the user profile data
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upgrade Failed',
        description: 'Could not complete the upgrade. Please try again.',
      });
    } finally {
      setIsUpgrading(false);
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
                    <div className="flex items-center gap-2 text-primary font-semibold">
                        <CheckCircle2 /> Current Plan
                    </div>
                ) : (
                    <Button onClick={handleUpgrade} disabled={isUpgrading}>
                        {isUpgrading ? <Loader2 className="mr-2 animate-spin"/> : <Gem className="mr-2" />}
                        {isUpgrading ? 'Upgrading...' : 'Upgrade to Pro'}
                    </Button>
                )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
