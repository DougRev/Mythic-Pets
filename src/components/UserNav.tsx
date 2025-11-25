'use client';

import Link from 'next/link';
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Gem, LogOut, User as UserIcon, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';

export function UserNav() {
  const { user, firestore, signOut } = useAuth();
  
  const userProfileRef = React.useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc<any>(userProfileRef);

  if (!user) {
    return null;
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'MP';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2);
  }

  const renderCredits = () => {
    if (!userProfile) {
        return null;
    }
    const isPro = userProfile.planType === 'pro';
    return (
        <DropdownMenuItem disabled className="opacity-100">
            {isPro ? <Gem className="mr-2 h-4 w-4 text-primary"/> : <Sparkles className="mr-2 h-4 w-4 text-primary" />}
            <span>
                {isPro ? 'Unlimited Credits' : `${userProfile.generationCredits} Credits Remaining`}
            </span>
        </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName || 'Mythic User'}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
            {renderCredits()}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href="/dashboard/account">
            <DropdownMenuItem>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>Account</span>
            </DropdownMenuItem>
          </Link>
          <Link href="/dashboard/account">
            <DropdownMenuItem>
                <Gem className="mr-2 h-4 w-4" />
                <span>Upgrade to Pro</span>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

    