'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ShareDialogProps {
  children: React.ReactNode;
  title: string;
  body: string;
  imageUrl: string;
}

export function ShareDialog({ children, title, body, imageUrl }: ShareDialogProps) {
  const [open, setOpen] = useState(false);

  const handleDownload = () => {
    if (!imageUrl) return;
    
    const link = document.createElement('a');
    link.href = imageUrl;

    // Robustly extract mime type and determine file extension
    let extension = 'png'; // Default extension
    if (imageUrl.startsWith('data:image')) {
        const mimeTypeMatch = imageUrl.match(/^data:image\/(.*?);/);
        if (mimeTypeMatch && mimeTypeMatch[1]) {
            extension = mimeTypeMatch[1];
        }
    } else {
        try {
            // For regular URLs, try to get from path
            const urlPath = new URL(imageUrl).pathname;
            const lastPart = urlPath.split('.').pop();
            if(lastPart && ['png', 'jpg', 'jpeg', 'gif'].includes(lastPart)) {
                extension = lastPart;
            }
        } catch (e) {
            console.error("Could not parse URL to determine extension, defaulting to png.", e);
        }
    }
    
    // Set a proper filename with the correct extension
    const filename = `mythic-pet-${title.toLowerCase().replace(/\s+/g, '-')}.${extension}`;
    link.download = filename;

    // Append to the document, trigger the-click, and then remove it
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Creation</DialogTitle>
          <DialogDescription>
            Download the image to share with your friends and followers!
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
        <DialogFooter>
          <Button onClick={handleDownload} className="w-full">
              <Download className="mr-2" />
              Download Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
