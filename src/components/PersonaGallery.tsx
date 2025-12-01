'use client';

import React from 'react';
import Image from 'next/image';
import { useCollection } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';

export function PersonaGallery() {
  const { firestore } = useAuth();

  const personasQuery = React.useMemo(() => {
    if (!firestore) return null;
    // Query for personas that are marked as public
    return query(
      collection(firestore, 'publicPersonas'),
      limit(6)
    );
  }, [firestore]);

  const { data: personas, isLoading } = useCollection<any>(personasQuery);

  if (isLoading) {
    return <div className="text-center">Loading gallery...</div>;
  }

  if (!personas || personas.length === 0) {
    return null; // Don't show the section if there's nothing to show
  }

  return (
    <section id="gallery" className="w-full py-12 md:py-24 lg:py-32 bg-muted">
      <div className="container mx-auto space-y-12 px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-5xl">Hall of Mythic Pets</h2>
          <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            See what legends other users have created for their companions.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {personas.map((persona) => (
            <Card key={persona.id} className="overflow-hidden">
              <CardContent className="p-0">
                <Image
                  src={persona.imageUrl}
                  alt={persona.theme}
                  width={400}
                  height={400}
                  className="aspect-square w-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
