'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookImage, PawPrint } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const navItems = [
  { href: '/dashboard/pets', label: 'Pets', icon: PawPrint },
  { href: '/gallery', label: 'Gallery', icon: BookImage },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <TooltipProvider>
      <nav className="flex flex-col gap-2 p-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Link href={item.href}>
                  <div
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="group-[[data-state=collapsed]]:hidden">{item.label}</span>
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="group-[[data-state=expanded]]:hidden">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}
