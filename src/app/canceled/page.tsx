'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle } from 'lucide-react';

export default function CanceledPage() {
  return (
    <div className="container mx-auto max-w-lg py-8 px-4 md:px-6 flex items-center justify-center min-h-screen">
        <Card className="text-center">
        <CardHeader>
            <div className="mx-auto bg-red-100 dark:bg-red-900/50 rounded-full p-3 w-fit">
            <XCircle className="h-12 w-12 text-red-500" />
            </div>
            <CardTitle className="font-headline text-3xl mt-4">Payment Canceled</CardTitle>
            <CardDescription>
                Your upgrade process was canceled. You have not been charged. You can try again anytime from your account page.
            </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col gap-4">
            <Button asChild className="w-full">
                <Link href="/dashboard/account">Back to My Account</Link>
            </Button>
        </CardFooter>
        </Card>
    </div>
  );
}
