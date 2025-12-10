'use client';

import React from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export function PersonaGallery() {

  // Filter for gallery items from the placeholder data
  const galleryImages = PlaceHolderImages.filter(p => p.id.startsWith('gallery-item-'));

  if (galleryImages.length === 0) {
    return null; // Don't show the section if there are no curated images
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {galleryImages.map((persona) => (
            <Card key={persona.id} className="overflow-hidden">
              <CardContent className="p-0">
                <Image
                  src={persona.imageUrl}
                  alt={persona.description}
                  width={400}
                  height={400}
                  className="aspect-square w-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                  data-ai-hint={persona.imageHint}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
