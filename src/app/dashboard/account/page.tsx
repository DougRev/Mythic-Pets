'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Gem } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDoc } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function AccountPage() {
  const { user, firestore } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState('');

  const userProfileRef = React.useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading, refetch } = useDoc<any>(userProfileRef);

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName);
    }
  }, [userProfile]);

  const handleSaveChanges = async () => {
    if (!userProfileRef) return;
    try {
      await updateDoc(userProfileRef, { displayName });
      toast({ title: 'Profile Updated', description: 'Your changes have been saved.' });
      refetch();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    }
  };

  if (isLoading) {
    return <div className="container mx-auto max-w-2xl py-8 px-4 md:px-6">Loading account details...</div>;
  }

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
                 <AvatarImage src={userProfile?.photoURL} alt={userProfile?.displayName} />
                 <AvatarFallback>{userProfile?.displayName?.substring(0, 2) || 'MP'}</AvatarFallback>
               </Avatar>
               {/* Photo change functionality can be added later */}
               {/* <Button variant="outline">Change Photo</Button> */}
            </div>
             <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
             <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={userProfile?.email} disabled />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveChanges}>Save Changes</Button>
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
                    <h3 className="font-bold capitalize">{userProfile?.planType || 'Free'} Plan</h3>
                    <p className="text-sm text-muted-foreground">
                      {userProfile?.planType === 'pro' 
                        ? 'You have unlimited access to all features.'
                        : `You are on the free plan. You have ${userProfile?.regenerationCredits || 0} credits left.`
                      }
                    </p>
                </div>
                {userProfile?.planType !== 'pro' && (
                  <Button asChild>
                    <Link href="/dashboard/upgrade">
                      <Gem className="mr-2 h-4 w-4" />
                      Upgrade to Pro
                    </Link>
                  </Button>
                )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
