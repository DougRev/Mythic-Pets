'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PartyPopper } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export function SuccessDisplay() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  // Here you could potentially use the session_id to fetch session details
  // from Stripe and display customer-specific information.
  // For now, we'll just show a generic success message.

  return (
    <div className="container mx-auto max-w-lg py-8 px-4 md:px-6 flex items-center justify-center min-h-screen">
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto bg-green-100 dark:bg-green-900/50 rounded-full p-3 w-fit">
            <PartyPopper className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle className="font-headline text-3xl mt-4">Upgrade Successful!</CardTitle>
          <CardDescription>
            Welcome to the Pro Plan! You now have unlimited access to all features. Your account has been updated.
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
