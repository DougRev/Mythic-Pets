'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export function AppLogo({ className }: { className?: string }) {
  const { user } = useAuth();
  const href = user ? "/dashboard" : "/";

  return (
    <Link href={href} className={cn("flex items-center gap-2", className)}>
      <Image src="/logo/transparent-logo.png" alt="Mythic Pets Logo" width={32} height={32} />
      <span className="text-xl font-bold tracking-tight text-foreground">Mythic Pets</span>
    </Link>
  );
}
