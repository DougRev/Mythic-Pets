import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Gem } from 'lucide-react';

export default function AccountPage() {
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
                 <AvatarImage src="/avatars/01.png" alt="User" />
                 <AvatarFallback>MP</AvatarFallback>
               </Avatar>
               <Button variant="outline">Change Photo</Button>
            </div>
             <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" defaultValue="Mythic User" />
            </div>
             <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue="user@example.com" disabled />
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
                    <h3 className="font-bold">Free Tier</h3>
                    <p className="text-sm text-muted-foreground">You are currently on the free plan.</p>
                </div>
                <Button>
                    <Gem className="mr-2 h-4 w-4" />
                    Upgrade to Pro
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
