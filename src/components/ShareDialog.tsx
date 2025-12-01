'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share2 } from 'lucide-react'; // Import Share2

interface ShareDialogProps {
  children: React.ReactNode;
  title: string;
  body: string;
  imageUrl: string;
}

export function ShareDialog({ children, title, body, imageUrl }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // Check for Web Share API support on component mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      setCanShare(true);
    }
  }, []);

  const handleDownload = async () => {
    if (!imageUrl) return;

    try {
      // Fetch the image data, works for both regular URLs and data URLs
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      // Determine file extension from MIME type
      const extension = blob.type.split('/')[1] ?? 'png';
      const filename = `mythic-pet-${title.toLowerCase().replace(/\s+/g, '-')}.${extension}`;

      // Create a temporary link to trigger the download
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = filename;

      // Append to the document, trigger the click, and then remove it
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the object URL
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback for safety, though less reliable
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `mythic-pet-${title.toLowerCase().replace(/\s+/g, '-')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShare = async () => {
    if (!imageUrl) return;

    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const extension = blob.type.split('/')[1] ?? 'png';
        const filename = `mythic-pet-${title.toLowerCase().replace(/\s+/g, '-')}.${extension}`;
        const file = new File([blob], filename, { type: blob.type });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: title,
                text: body,
                files: [file],
            });
        } else {
            // Fallback if file sharing is not supported, just share text
            await navigator.share({
                title: title,
                text: body,
            });
        }
    } catch (error) {
        console.error('Error sharing:', error);
    }
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Creation</DialogTitle>
          <DialogDescription>
            Share or download the image to show your friends and followers!
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
        <DialogFooter className="sm:justify-start">
          <Button onClick={handleDownload} className="w-full sm:w-auto flex-1">
              <Download className="mr-2" />
              Download
          </Button>
          {canShare && (
            <Button onClick={handleShare} className="w-full sm:w-auto flex-1 mt-2 sm:mt-0">
                <Share2 className="mr-2" />
                Share
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
