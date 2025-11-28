'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Share2, Download, Copy } from 'lucide-react';

interface ShareDialogProps {
  children: React.ReactNode;
  title: string;
  body: string;
  imageUrl: string;
}

export function ShareDialog({ children, title, body, imageUrl }: ShareDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isShareApiAvailable, setIsShareApiAvailable] = useState(false);

  useEffect(() => {
    // The Web Share API is only available in secure contexts (HTTPS) and on certain browsers.
    if (typeof window !== 'undefined' && 'share' in navigator) {
      setIsShareApiAvailable(true);
    }
  }, []);

  const dataUrlToBlob = async (dataUrl: string) => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return blob;
  }

  const handleShare = async () => {
    if (!navigator.share || !imageUrl) return;

    try {
      // When fetching from Firebase Storage, we need to specify CORS mode.
      const response = await fetch(imageUrl, { mode: 'cors' });
      if (!response.ok) {
        throw new Error(`Failed to fetch image, status: ${response.status}`);
      }
      const blob = await response.blob();

      const file = new File([blob], 'mythic-pet.png', { type: blob.type || 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Meet ${title}!`,
          text: `Check out my pet's mythic persona! #MythicPets`,
          files: [file],
        });
      } else {
         await navigator.share({
            title: `Meet ${title}!`,
            text: `Check out my pet's mythic persona and their story! #MythicPets`,
            url: window.location.href, // Fallback to sharing the URL
        });
      }
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
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Creation</DialogTitle>
          <DialogDescription>
            Share this mythic persona with your friends and followers!
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 flex items-center justify-center">
            <Image
              src={imageUrl}
              alt={`Shareable image of ${title}`}
              width={500}
              height={500}
              className="rounded-lg shadow-md aspect-square object-contain"
            />
        </div>
        <DialogFooter className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button onClick={handleCopyToClipboard} variant="outline">
                <Copy className="mr-2" />
                Copy Caption
            </Button>
            {isShareApiAvailable ? (
                 <Button onClick={handleShare}>
                    <Share2 className="mr-2" />
                    Share
                </Button>
            ) : (
              <Button onClick={handleDownload}>
                  <Download className="mr-2" />
                  Download Image
              </Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
