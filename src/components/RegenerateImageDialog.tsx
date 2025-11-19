'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDoc } from '@/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2 } from 'lucide-react';
import { regenerateAiImage } from '@/ai/flows/regenerate-image';
import { uploadFile } from '@/firebase/storage';
import { v4 as uuidv4 } from 'uuid';

interface RegenerateImageDialogProps {
  children: React.ReactNode;
  persona: any; 
  pet: any;
  onRegenerationComplete: () => void;
}

export function RegenerateImageDialog({ children, persona, pet, onRegenerationComplete }: RegenerateImageDialogProps) {
  const { user, firestore, storage } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const userProfileRef = React.useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc<any>(userProfileRef);

  const handleRegenerate = async () => {
    if (!user || !firestore || !storage || !userProfileRef || !userProfile || !persona || !pet) {
      toast({ variant: 'destructive', title: 'Error', description: 'Missing required data to regenerate.' });
      return;
    }
    
    // Check credits for free users
    if (userProfile.planType === 'free' && userProfile.regenerationCredits <= 0) {
        toast({
            variant: 'destructive',
            title: 'No Credits Left',
            description: 'Please upgrade to a Pro plan for more regenerations.',
        });
        return;
    }

    setIsGenerating(true);
    try {
        // 1. Call the AI flow
        const result = await regenerateAiImage({
            petName: pet.name,
            theme: persona.theme,
            imageStyle: persona.imageStyle,
            originalImageUrl: persona.imageUrl,
            feedback: feedback || 'Regenerate the image to be better.', // Provide default feedback if empty
        });

        if (!result.newImageUrl) {
            throw new Error('AI failed to return a new image.');
        }

        // 2. Upload the new image to storage
        const imagePath = `users/${user.uid}/personas/${uuidv4()}`;
        const newImageUrl = await uploadFile(storage, imagePath, result.newImageUrl);

        // 3. Update the persona document with the new URL
        const personaRef = doc(firestore, 'users', user.uid, 'petProfiles', pet.id, 'aiPersonas', persona.id);
        await updateDoc(personaRef, { imageUrl: newImageUrl });

        // 4. Decrement credits for free users
        if (userProfile.planType === 'free') {
            await updateDoc(userProfileRef, { regenerationCredits: increment(-1) });
        }
        
        toast({ title: 'Image Regenerated!', description: 'Your persona has a fresh new look.' });
        onRegenerationComplete(); // This will trigger a re-fetch on the parent page
        setOpen(false); // Close the dialog
        setFeedback(''); // Reset feedback

    } catch (error: any) {
        console.error('Image regeneration failed:', error);
        toast({
            variant: 'destructive',
            title: 'Generation Failed',
            description: error.message || 'Could not regenerate the image. Please try again.',
        });
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Regenerate Persona Image</DialogTitle>
          <DialogDescription>
            Provide some feedback to guide the AI, then regenerate the image.
            {userProfile?.planType === 'free' && ` You have ${userProfile.regenerationCredits || 0} credits remaining.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <Label htmlFor="feedback">What should we change?</Label>
            <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g., 'Make the armor silver instead of gold', 'My dog only has 4 legs!', 'Add a pointy wizard hat.'"
                rows={4}
            />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleRegenerate} disabled={isGenerating}>
            {isGenerating ? <><Loader2 className="mr-2 animate-spin" /> Regenerating...</> : <><Wand2 className="mr-2" /> Regenerate</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
    