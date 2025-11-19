'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Share2, Download, Copy } from 'lucide-react';
import { createShareImage } from '@/ai/flows/create-share-image';

interface ShareDialogProps {
  children: React.ReactNode;
  title: string;
  body: string;
  imageUrl: string;
}

export function ShareDialog({ children, title, body, imageUrl }: ShareDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareableImageUrl, setShareableImageUrl] = useState<string | null>(null);
  const [isShareApiAvailable, setIsShareApiAvailable] = useState(false);

  useEffect(() => {
    // The Web Share API is only available in secure contexts (HTTPS) and on certain browsers.
    if (typeof window !== 'undefined' && 'share' in navigator) {
      setIsShareApiAvailable(true);
    }
  }, []);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      // Reset state when dialog opens
      setShareableImageUrl(null);
      handleGenerateImage();
    }
  };

  const handleGenerateImage = async () => {
    setIsGenerating(true);
    try {
      const result = await createShareImage({
        title: title,
        body: body,
        imageUrl: imageUrl,
        footerText: 'Created with Mythic Pets',
      });
      if (!result.shareImageUrl) {
        throw new Error('AI failed to return a sharable image.');
      }
      setShareableImageUrl(result.shareImageUrl);
    } catch (error: any) {
      console.error('Share image generation failed:', error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: 'Could not create a sharable image. Please try again.',
      });
      setOpen(false); // Close dialog on error
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!navigator.share || !shareableImageUrl) return;

    try {
      const response = await fetch(shareableImageUrl);
      const blob = await response.blob();
      const file = new File([blob], 'mythic-pet.png', { type: 'image/png' });

      await navigator.share({
        title: `Meet ${title}!`,
        text: `Check out my pet's mythic persona! #MythicPets`,
        files: [file],
      });
    } catch (error: any) {
      // Don't show an error if the user cancels the share dialog
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
        toast({
          variant: 'destructive',
          title: 'Share Failed',
          description: 'Could not share the image.',
        });
      }
    }
  };

  const handleDownload = () => {
    if (!shareableImageUrl) return;
    const link = document.createElement('a');
    link.href = shareableImageUrl;
    link.download = `mythic-pet-${title.toLowerCase().replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleCopyToClipboard = () => {
     const caption = `Check out my pet's mythic persona: ${title}! Created with #MythicPets.`;
     navigator.clipboard.writeText(caption).then(() => {
        toast({ title: 'Copied to Clipboard!', description: 'Social media caption is ready to paste.'});
     }, (err) => {
        toast({ variant: 'destructive', title: 'Copy Failed', description: 'Could not copy caption.' });
     });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Creation</DialogTitle>
          <DialogDescription>
            Share this mythic persona with your friends and followers!
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex items-center justify-center">
          {isGenerating && (
            <div className="w-full aspect-square flex flex-col items-center justify-center bg-muted rounded-lg">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Creating sharable image...</p>
            </div>
          )}
          {!isGenerating && shareableImageUrl && (
            <Image
              src={shareableImageUrl}
              alt="Sharable image of pet persona"
              width={500}
              height={500}
              className="rounded-lg shadow-md aspect-square object-contain"
            />
          )}
        </div>
        <DialogFooter className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button onClick={handleCopyToClipboard} variant="outline" disabled={isGenerating || !shareableImageUrl}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Caption
            </Button>
            {isShareApiAvailable ? (
                 <Button onClick={handleShare} disabled={isGenerating || !shareableImageUrl}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                </Button>
            ) : (
                <Button onClick={handleDownload} disabled={isGenerating || !shareableImageUrl}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Image
                </Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
