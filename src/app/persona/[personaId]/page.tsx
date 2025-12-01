import React from 'react';
import Image from 'next/image';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config'; // Assumes you have a db export in firebase config
import { Metadata, ResolvingMetadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot } from 'lucide-react';

type Props = {
  params: { personaId: string }
}

// Fetch data for the persona
async function getPersonaData(personaId: string) {
  const personaRef = doc(db, 'publicPersonas', personaId);
  const personaSnap = await getDoc(personaRef);

  if (!personaSnap.exists()) {
    return null;
  }
  return personaSnap.data();
}

// Generate metadata for social sharing
export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const personaId = params.personaId;
  const persona = await getPersonaData(personaId);

  if (!persona) {
    return {
      title: 'Persona Not Found',
    }
  }

  return {
    title: `${persona.petName}'s ${persona.theme} Persona`,
    description: persona.loreText.substring(0, 150) + '...',
    openGraph: {
      title: `${persona.petName}'s ${persona.theme} Persona`,
      description: persona.loreText.substring(0, 150) + '...',
      images: [
        {
          url: persona.imageUrl,
          width: 1200,
          height: 630,
          alt: `${persona.petName} as a ${persona.theme}`,
        },
      ],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${persona.petName}'s ${persona.theme} Persona`,
      description: persona.loreText.substring(0, 150) + '...',
      images: [persona.imageUrl],
    },
  }
}

// The public page component
export default async function PublicPersonaPage({ params }: Props) {
  const persona = await getPersonaData(params.personaId);

  if (!persona) {
    return <div className="flex h-screen items-center justify-center">Persona not found.</div>;
  }

  return (
    <div className="bg-muted min-h-screen py-12">
      <div className="container mx-auto max-w-2xl">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Image
              src={persona.imageUrl}
              alt={persona.theme}
              width={800}
              height={800}
              className="aspect-square w-full object-cover"
            />
          </CardContent>
          <CardHeader>
            <CardTitle className="font-headline text-3xl">{persona.petName} as a {persona.theme}</CardTitle>
            <CardDescription>Generated on {new Date(persona.generationDate).toLocaleDateString()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <Bot />
                AI-Generated Lore
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{persona.loreText}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
