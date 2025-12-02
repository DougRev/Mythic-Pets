'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Share2, Download, Copy, Link as LinkIcon, GalleryHorizontal } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { publishPersona } from '@/app/actions';

interface Pet {
  id: string;
  name: string;
}

interface Persona {
  id: string;
  title: string;
  loreText: string;
  imageUrl: string;
  imageStyle: string;
}

interface ShareDialogProps {
  children: React.ReactNode;
  persona: Persona;
  pet: Pet;
}

export function ShareDialog({ children, persona, pet }: ShareDialogProps) {
  const { title, loreText: body, imageUrl } = persona;
  const remixPath = `/dashboard/pets/${pet.id}/create-persona?theme=${encodeURIComponent(title)}&imageStyle=${encodeURIComponent(persona.imageStyle)}`;
  const { toast } = useToast();
  const [isShareApiAvailable, setIsShareApiAvailable] = useState(false);
  const [remixUrl, setRemixUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!!navigator.share) {
        setIsShareApiAvailable(true);
      }
      // Construct the full URL client-side
      setRemixUrl(`${window.location.origin}${remixPath}`);
    }
  }, [remixPath]);


  const handleShare = async () => {
    if (!navigator.share) return;
  
    try {
      // Share text and a URL instead of a file for better compatibility.
      await navigator.share({
        title: `Meet ${title}!`,
        text: `Check out my pet's mythic persona! #MythicPets\n\nRemix this persona for your own pet:`,
        url: remixUrl, // Share the remix link
      });
    } catch (error: any) {
      // Don't show an error if the user simply closes the share dialog (AbortError).
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
        toast({
          variant: 'destructive',
          title: 'Share Failed',
          description: 'Could not share your creation. Please try again.',
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
  
  const handleCopyToClipboard = (textToCopy: string, toastMessage: string) => {
     navigator.clipboard.writeText(textToCopy).then(() => {
        toast({ title: 'Copied to Clipboard!', description: toastMessage});
     }, (err) => {
        toast({ variant: 'destructive', title: 'Copy Failed', description: 'Could not copy to clipboard.' });
     });
  };

  const socialCaption = `Check out my pet's mythic persona: ${title}! Created with #MythicPets. \n\n${body}\n\nRemix this persona for your pet: ${remixUrl}`;

  const handlePublish = async () => {
    try {
      await publishPersona(pet.id, persona.id);
      toast({
        title: 'Published to Gallery!',
        description: 'Your mythic persona is now visible to the community.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Publishing Failed',
        description: error.message || 'Could not publish your persona. Please try again.',
      });
    }
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
        <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => handleCopyToClipboard(socialCaption, 'Social media caption is ready to paste.')} variant="outline">
                <Copy className="mr-2 h-4 w-4" />
                Copy Caption
            </Button>
            <Button onClick={() => handleCopyToClipboard(remixUrl, 'Remix link copied!')} variant="outline">
                <LinkIcon className="mr-2 h-4 w-4" />
                Copy Remix Link
            </Button>
        </div>
         <div className="mt-4 pt-4 border-t">
          <Button onClick={handlePublish} variant="secondary" className="w-full">
            <GalleryHorizontal className="mr-2 h-4 w-4" />
            Publish to Community Gallery
          </Button>
        </div>
        <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={handleDownload} variant="outline" className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Download Image
            </Button>
            {isShareApiAvailable && (
                 <Button onClick={handleShare} className="w-full sm:w-auto">
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                </Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
