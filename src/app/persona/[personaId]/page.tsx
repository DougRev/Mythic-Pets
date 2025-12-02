

import React from 'react';
import Image from 'next/image';
import { Metadata, ResolvingMetadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot } from 'lucide-react';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK safely for server-side rendering
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : undefined;

if (serviceAccount) {
    if (!getApps().length) {
        initializeApp({
            credential: cert(serviceAccount),
        });
    }
}


async function getPersonaData(personaId: string) {
  if (!serviceAccount) {
    console.error("Firebase Admin SDK not initialized. FIREBASE_SERVICE_ACCOUNT env variable is missing.");
    return null;
  }
  const db = getFirestore();
  const personaRef = db.collection('publicPersonas').doc(personaId);
  const personaSnap = await personaRef.get();

  if (!personaSnap.exists) {
    return null;
  }
  return personaSnap.data();
}

export async function generateMetadata(
  { params }: { params: { personaId: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const personaId = params.personaId;
  const persona = await getPersonaData(personaId);

  if (!persona) {
    return {
      title: 'Persona Not Found',
    }
  }

  const description = persona.loreText ? persona.loreText.substring(0, 150) + '...' : 'A mythic pet persona.';

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

export default async function PublicPersonaPage({ params }: { params: { personaId: string } }) {
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
