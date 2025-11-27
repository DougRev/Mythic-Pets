'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDoc } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, Save, XCircle, Gem } from 'lucide-react';
import { regenerateAiLore } from '@/ai/flows/regenerate-lore';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface RegenerateLoreDialogProps {
  children: React.ReactNode;
  persona: any; 
  pet: any;
  onRegenerationComplete: () => void;
}

export function RegenerateLoreDialog({ children, persona, pet, onRegenerationComplete }: RegenerateLoreDialogProps) {
  const { user, firestore } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [newLore, setNewLore] = useState<string | null>(null);

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
    
    setIsGenerating(true);
    setNewLore(null);
    try {
        const result = await regenerateAiLore({
            petName: pet.name,
            theme: persona.theme,
            feedback: feedback || 'Make the lore more exciting and detailed.',
            userId: user.uid,
        });

        if (!result.newLoreText) {
            throw new Error('AI failed to return new lore.');
        }

        setNewLore(result.newLoreText);

    } catch (error: any) {
        console.error('Lore regeneration failed:', error);
        toast({
            variant: 'destructive',
            title: 'Generation Failed',
            description: error.message || 'Could not regenerate the lore. Please try again.',
        });
    } finally {
        setIsGenerating(false);
    }
  };

  const handleSave = async () => {
      if (!newLore || !user || !firestore || !userProfileRef) return;
      
      setIsGenerating(true);
      try {
        // Update the persona document
        const personaRef = doc(firestore, 'users', user.uid, 'petProfiles', pet.id, 'aiPersonas', persona.id);
        await updateDoc(personaRef, { loreText: newLore });
        
        toast({ title: 'Lore Saved!', description: 'Your persona has a fresh new backstory.' });
        onRegenerationComplete();
        refetchUserProfile();
        resetAndClose();

      } catch (error: any) {
          console.error("Failed to save new lore:", error);
          toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the new lore.' });
      } finally {
          setIsGenerating(false);
      }
  };

  const resetAndClose = () => {
    setOpen(false);
    setFeedback('');
    setNewLore(null);
    setIsGenerating(false);
  };
  
  const handleDiscard = () => {
    setNewLore(null);
  };


  const renderInitialContent = () => (
    <>
      <DialogHeader>
        <DialogTitle>Regenerate Persona Lore</DialogTitle>
        <DialogDescription>
          Provide some feedback to guide the AI, then regenerate the lore.
          {isFreeTier && ` You have ${userProfile.generationCredits || 0} credits remaining.`}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <Label htmlFor="feedback">What should we change?</Label>
        <Textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="e.g., 'Make the story more heroic', 'Mention their love for chasing squirrels', 'Add a mysterious artifact.'"
            rows={4}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="cursor-not-allowed">
                        <Button onClick={handleGenerate} disabled={isGenerating || hasNoCredits}>
                        {isGenerating ? <><Loader2 className="mr-2 animate-spin" /> Generating...</> : <><Wand2 className="mr-2" /> Regenerate</>}
                        </Button>
                    </div>
                </TooltipTrigger>
                {hasNoCredits && (
                    <TooltipContent>
                        <p className="flex items-center gap-2"><Gem className="h-4 w-4"/> Upgrade to Pro for unlimited generations.</p>
                    </TooltipContent>
                )}
            </Tooltip>
        </TooltipProvider>
      </DialogFooter>
    </>
  );

  const renderConfirmationContent = () => (
    <>
      <DialogHeader>
        <DialogTitle>Review New Lore</DialogTitle>
        <DialogDescription>
          Do you want to save this new lore or discard it? Saving will use one generation credit for Free Tier users.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 max-h-[50vh] overflow-y-auto">
        <div className="space-y-2 p-3 rounded-md border">
            <Label>Original Lore</Label>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{persona.loreText}</p>
        </div>
        <div className="space-y-2 p-3 rounded-md border bg-muted/50">
            <Label>New Lore</Label>
            {newLore && <p className="text-sm text-foreground whitespace-pre-wrap">{newLore}</p>}
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={handleDiscard} disabled={isGenerating}>
            <XCircle className="mr-2"/> Discard & Try Again
        </Button>
        <Button onClick={handleSave} disabled={isGenerating}>
            {isGenerating ? <><Loader2 className="mr-2 animate-spin" /> Saving...</> : <><Save className="mr-2" /> Save New Lore</>}
        </Button>
      </DialogFooter>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl" onInteractOutside={(e) => { if (isGenerating) e.preventDefault(); }}>
        {newLore ? renderConfirmationContent() : renderInitialContent()}
      </DialogContent>
    </Dialog>
  );
}
