'use client';

import React from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { useAnalytics } from '@/hooks/useAnalytics';
import { ShareDialog } from './ShareDialog';
import { Button } from './ui/button';
import { Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SharePublicPersonaProps {
  persona: any;
  pet: any;
  personaId: string;
}

export function SharePublicPersona({ persona, pet, personaId }: SharePublicPersonaProps) {
  const { user, firestore } = useAuth();
  const { toast } = useToast();
  const { trackEvent } = useAnalytics();

  const handlePublish = async () => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not connect to the database.' });
      return;
    }

    try {
      // Create a public version of the persona data
      const publicPersonaData = {
        theme: persona.theme,
        loreText: persona.loreText,
        imageUrl: persona.imageUrl,
        generationDate: persona.generationDate,
        petName: pet.name,
        authorId: user.uid, // Add authorId for security rules
      };

      // Write it to the public collection
      await setDoc(doc(firestore, 'publicPersonas', personaId), publicPersonaData);

      trackEvent('persona_published', { persona_id: personaId, theme: persona.theme });
      toast({ title: 'Persona Published', description: 'A public, shareable link has been created.' });

    } catch (error) {
      console.error("Failed to publish persona:", error);
      toast({ variant: 'destructive', title: 'Publishing Failed', description: 'Could not create a public link for this persona.' });
    }
  };

  const publicUrl = `${window.location.origin}/persona/${personaId}`;

  return (
    <ShareDialog
      title={persona.theme}
      body={`Check out my pet, ${pet.name}, as a ${persona.theme}!`}
      url={publicUrl}
      imageUrl={persona.imageUrl}
    >
      <Button variant="outline" onClick={handlePublish}><Share2 className="mr-2"/>Share</Button>
    </ShareDialog>
  );
}
