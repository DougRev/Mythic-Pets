import Link from 'next/link';
import { PawPrint } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppLogo({ className }: { className?: string }) {
  return (
    <Link href="/dashboard" className={cn("flex items-center gap-2", className)}>
      <PawPrint className="h-6 w-6 text-primary" />
      <span className="text-xl font-bold tracking-tight text-foreground">Mythic Pets</span>
    </Link>
  );
}
