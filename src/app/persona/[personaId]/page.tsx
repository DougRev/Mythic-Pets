import React from 'react';
import Image from 'next/image';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot } from 'lucide-react';

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  initializeApp({ credential: applicationDefault() });
}
const db = getFirestore();

type Props = {
  params: { personaId: string }
}

// Fetch data for the persona using the Admin SDK
async function getPersonaData(personaId: string) {
  try {
    const personaRef = db.collection('publicPersonas').doc(personaId);
    const personaSnap = await personaRef.get();

    if (!personaSnap.exists) {
      return null;
    }
    return personaSnap.data();
  } catch (error) {
    console.error("Error fetching persona data with Admin SDK:", error);
    return null;
  }
}

// Generate metadata for social sharing
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const personaId = params.personaId;
  const persona = await getPersonaData(personaId);

  if (!persona) {
    return {
      title: 'Persona Not Found',
    }
  }

  const description = persona.loreText ? persona.loreText.substring(0, 150) + '...' : 'Check out this Mythic Pet!';

  return {
    title: `${persona.petName}'s ${persona.theme} Persona`,
    description: description,
    openGraph: {
      title: `${persona.petName}'s ${persona.theme} Persona`,
      description: description,
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
      description: description,
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
