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
  const [isShareApiAvailable, setIsShareApiAvailable] = useState(false);

  useEffect(() => {
    // The Web Share API is only available in secure contexts (HTTPS) and on certain browsers.
    if (typeof window !== 'undefined' && 'share' in navigator) {
      setIsShareApiAvailable(true);
    }
  }, []);


  const handleShare = async () => {
    if (!navigator.share || !imageUrl) return;

    try {
      // Fetch the image to share it as a file. This is more robust than sharing a URL.
      const response = await fetch(imageUrl);
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
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    // To trigger download, we might need to fetch the image and create a blob URL if CORS issues arise.
    // For now, a direct download link is simpler.
    link.download = `mythic-pet-${title.toLowerCase().replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleCopyToClipboard = () => {
     const caption = `Check out my pet's mythic persona: ${title}! Created with #MythicPets. \n\n${body}`;
     navigator.clipboard.writeText(caption).then(() => {
        toast({ title: 'Copied to Clipboard!', description: 'Social media caption is ready to paste.'});
     }, (err) => {
        toast({ variant: 'destructive', title: 'Copy Failed', description: 'Could not copy caption.' });
     });
  };

  return (
    <Dialog>
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
              alt="Sharable image of pet persona"
              width={500}
              height={500}
              className="rounded-lg shadow-md aspect-square object-contain"
            />
        </div>
        <DialogFooter className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button onClick={handleCopyToClipboard} variant="outline">
                <Copy className="mr-2 h-4 w-4" />
                Copy Caption
            </Button>
            {isShareApiAvailable ? (
                 <Button onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                </Button>
            ) : (
                <Button onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Image
                </Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
