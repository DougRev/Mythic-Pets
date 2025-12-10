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
  const { firestore } = useAuth();
  const { toast } = useToast();
  const { trackEvent } = useAnalytics();

  const handleCreatePublicLink = async () => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not connect to the database.' });
      return;
    }

    try {
      // Create a public version of the persona data for the shareable page
      const publicPersonaData = {
        theme: persona.theme,
        loreText: persona.loreText,
        imageUrl: persona.imageUrl,
        generationDate: persona.generationDate,
        petName: pet.name,
      };

      // Write it to the public collection so the link will work
      await setDoc(doc(firestore, 'publicPersonas', personaId), publicPersonaData);

      trackEvent('persona_shared', { persona_id: personaId, theme: persona.theme });
      toast({ title: 'Share Link Ready', description: 'Your unique link has been created.' });

    } catch (error) {
      console.error("Failed to publish persona:", error);
      toast({ variant: 'destructive', title: 'Sharing Failed', description: 'Could not create a public link for this persona.' });
    }
  };

  const publicUrl = `${window.location.origin}/persona/${personaId}`;

  return (
    <ShareDialog
      title={`Meet ${persona.personaName}, the ${persona.theme}`}
      body={`Check out my pet, ${pet.name}, as "${persona.personaName}"! Created with Mythic Pets.`}
      url={publicUrl}
    >
      <Button variant="outline" onClick={handleCreatePublicLink}><Share2 className="mr-2"/>Share</Button>
    </ShareDialog>
  );
}
