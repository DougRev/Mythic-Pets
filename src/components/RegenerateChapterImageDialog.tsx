'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useDoc } from '@/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, Save, XCircle, Gem } from 'lucide-react';
import { regenerateChapterImage } from '@/ai/flows/regenerate-chapter-image';
import { uploadFile } from '@/firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RegenerateChapterImageDialogProps {
  children: React.ReactNode;
  chapter: any; 
  persona: any;
  story: any;
  onRegenerationComplete: () => void;
}

export function RegenerateChapterImageDialog({ children, chapter, persona, story, onRegenerationComplete }: RegenerateChapterImageDialogProps) {
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

  const { data: userProfile } = useDoc<any>(userProfileRef);

  const isPro = userProfile?.planType === 'pro';

  const handleGenerate = async () => {
    if (!user || !userProfileRef || !chapter || !persona || !storage) {
      toast({ variant: 'destructive', title: 'Error', description: 'Missing required data to regenerate.' });
      return;
    }
    
    if (!isPro) {
        toast({
            variant: 'destructive',
            title: 'Pro Feature Only',
            description: 'Please upgrade to a Pro plan to regenerate chapter images.',
        });
        return;
    }

    setIsGenerating(true);
    setNewImageUrl(null);
    try {
        const result = await regenerateChapterImage({
            chapterText: chapter.chapterText,
            personaImage: persona.imageUrl,
            feedback: feedback || 'Make the image more dynamic and exciting.',
        });

        if (!result.newImageUrl) {
            throw new Error('AI failed to return a new image.');
        }

        setNewImageUrl(result.newImageUrl); // Show confirmation screen

    } catch (error: any) {
        console.error('Chapter image regeneration failed:', error);
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
      if (!newImageUrl || !user || !storage || !firestore || !chapter.id) return;
      
      setIsGenerating(true); // Reuse loading state for saving
      try {
        const imagePath = `users/${user.uid}/stories/${story.id}/${uuidv4()}`;
        const finalImageUrl = await uploadFile(storage, imagePath, newImageUrl);

        const chapterRef = doc(firestore, 'users', user.uid, 'petProfiles', persona.petProfileId, 'aiPersonas', persona.id, 'aiStories', story.id, 'chapters', chapter.id);
        await updateDoc(chapterRef, { imageUrl: finalImageUrl });
        
        toast({ title: 'Image Saved!', description: 'Your chapter has a fresh new illustration.' });
        onRegenerationComplete();
        resetAndClose();

      } catch (error: any) {
          console.error("Failed to save new chapter image:", error);
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

  const renderContent = () => {
    if (!isPro && open) {
        return (
          <>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><Gem /> Pro Feature</DialogTitle>
                <DialogDescription>
                Regenerating chapter images is an exclusive feature for our Pro subscribers.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <p>Upgrade to a Pro plan to get unlimited regenerations for all your content, including story illustrations!</p>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={resetAndClose}>Maybe Later</Button>
                <Button onClick={() => router.push('/dashboard/account')}>
                    <Gem className="mr-2"/> Go Pro
                </Button>
            </DialogFooter>
          </>
        )
    }

    if (newImageUrl) {
        return (
            <>
              <DialogHeader>
                <DialogTitle>Review New Image</DialogTitle>
                <DialogDescription>
                  Do you want to save this new image for your chapter or discard it?
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                    <Label>Original</Label>
                    <Image src={chapter.imageUrl} alt="Original Chapter Image" width={200} height={200} className="rounded-md w-full aspect-square object-cover" />
                </div>
                <div className="space-y-2">
                    <Label>New</Label>
                    <Image src={newImageUrl} alt="New Chapter Image" width={200} height={200} className="rounded-md w-full aspect-square object-cover" />
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
    }
    
    return (
        <>
          <DialogHeader>
            <DialogTitle>Regenerate Chapter Image</DialogTitle>
            <DialogDescription>
              Provide some feedback to guide the AI, then regenerate the illustration for this chapter.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="feedback">What should we change?</Label>
            <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g., 'Show the character looking more heroic', 'Add a spooky forest in the background.'"
                rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetAndClose}>Cancel</Button>
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? <><Loader2 className="mr-2 animate-spin" /> Generating...</> : <><Wand2 className="mr-2" /> Regenerate</>}
            </Button>
          </DialogFooter>
        </>
      );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent onInteractOutside={(e) => { if (isGenerating) e.preventDefault(); }}>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
