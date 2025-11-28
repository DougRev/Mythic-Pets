'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDoc } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, Save, XCircle, Gem } from 'lucide-react';
import { regenerateAiImage } from '@/ai/flows/regenerate-image';
import { uploadFile } from '@/firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';

interface RegenerateImageDialogProps {
  children: React.ReactNode;
  persona: any; 
  pet: any;
  onRegenerationComplete: () => void;
}

export function RegenerateImageDialog({ children, persona, pet, onRegenerationComplete }: RegenerateImageDialogProps) {
  const router = useRouter();
  const { user, firestore, storage } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState<string | null>(null);

  const userProfileRef = React.useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, refetch: refetchUserProfile } = useDoc<any>(userProfileRef);
  
  const isFreeTier = userProfile?.planType === 'free';
  const hasNoCredits = isFreeTier && userProfile?.generationCredits <= 0;

  const handleGenerate = async () => {
    if (!user || !userProfileRef || !userProfile || !persona || !pet) {
      toast({ variant: 'destructive', title: 'Error', description: 'Missing required data to regenerate.' });
      return;
    }
    
    if (hasNoCredits) {
        toast({ variant: 'destructive', title: 'Out of Credits', description: 'Please upgrade to Pro to regenerate content.' });
        return;
    }

    setIsGenerating(true);
    setNewImageUrl(null);
    try {
        const result = await regenerateAiImage({
            petName: pet.name,
            theme: persona.theme,
            imageStyle: persona.imageStyle,
            originalImageUrl: persona.imageUrl,
            feedback: feedback || 'Regenerate the image to be better.',
            userId: user.uid,
        });

        if (!result.newImageUrl) {
            throw new Error('AI failed to return a new image.');
        }

        setNewImageUrl(result.newImageUrl); // Show confirmation screen

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

  const handleSave = async () => {
      if (!newImageUrl || !user || !storage || !firestore || !userProfileRef) return;
      
      setIsGenerating(true); // Reuse loading state for saving
      try {
        // Upload the new image to storage
        const imagePath = `users/${user.uid}/personas/${uuidv4()}`;
        const finalImageUrl = await uploadFile(storage, imagePath, newImageUrl);

        // Update the persona document
        const personaRef = doc(firestore, 'users', user.uid, 'petProfiles', pet.id, 'aiPersonas', persona.id);
        await updateDoc(personaRef, { imageUrl: finalImageUrl });

        toast({ title: 'Image Saved!', description: 'Your persona has a fresh new look.' });
        onRegenerationComplete();
        refetchUserProfile();
        resetAndClose();

      } catch (error: any) {
          console.error("Failed to save new image:", error);
          toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the new image.' });
      } finally {
          setIsGenerating(false);
      }
  };

  const resetAndClose = () => {
    setOpen(false);
    setFeedback('');
    setNewImageUrl(null);
    setIsGenerating(false);
  };
  
  const handleDiscard = () => {
    setNewImageUrl(null);
  };


  const renderInitialContent = () => (
    <>
      <DialogHeader>
        <DialogTitle>Regenerate Persona Image</DialogTitle>
        <DialogDescription>
          Provide some feedback to guide the AI, then regenerate the image.
          {isFreeTier && ` You have ${userProfile.generationCredits || 0} credits remaining.`}
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
        <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
        {hasNoCredits ? (
            <Button asChild>
                <Link href="/dashboard/account">
                    <Gem className="mr-2" /> Go Pro to Regenerate
                </Link>
            </Button>
        ) : (
            <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? <><Loader2 className="mr-2 animate-spin" /> Generating...</> : <><Wand2 className="mr-2" /> Regenerate</>}
            </Button>
        )}
      </DialogFooter>
    </>
  );

  const renderConfirmationContent = () => (
    <>
      <DialogHeader>
        <DialogTitle>Review New Image</DialogTitle>
        <DialogDescription>
          Do you want to save this new image or discard it?
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4 py-4">
        <div className="space-y-2">
            <Label>Original</Label>
            <Image src={persona.imageUrl} alt="Original Persona" width={200} height={200} className="rounded-md w-full aspect-square object-cover" />
        </div>
        <div className="space-y-2">
            <Label>New</Label>
            {newImageUrl && <Image src={newImageUrl} alt="New Persona" width={200} height={200} className="rounded-md w-full aspect-square object-cover" />}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={handleDiscard} disabled={isGenerating}>
            <XCircle className="mr-2"/> Discard & Try Again
        </Button>
        <Button onClick={handleSave} disabled={isGenerating}>
            {isGenerating ? <><Loader2 className="mr-2 animate-spin" /> Saving...</> : <><Save className="mr-2" /> Save New Image</>}
        </Button>
      </DialogFooter>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent onInteractOutside={(e) => { if (isGenerating) e.preventDefault(); }}>
        {newImageUrl ? renderConfirmationContent() : renderInitialContent()}
      </DialogContent>
    </Dialog>
  );
}
