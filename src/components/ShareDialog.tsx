'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Share2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from './ui/input';

interface ShareDialogProps {
  children: React.ReactNode;
  title: string;
  body: string;
  url: string;
  imageUrl: string;
}

export function ShareDialog({ children, title, body, url, imageUrl }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    if (!imageUrl) return;

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const mimeType = blob.type;
      const extension = mimeType.split('/')[1] ?? 'png';
      const filename = `mythic-pet-${title.toLowerCase().replace(/\s+/g, '-')}.${extension}`;
      
      const link = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      link.href = objectUrl;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(objectUrl);
    } catch (error) {
        console.error("Download failed:", error);
        toast({
            variant: "destructive",
            title: "Download Failed",
            description: "Could not download the image. Please try right-clicking the image to save."
        });
    }
  };
  
  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    toast({ title: 'Copied!', description: 'The link has been copied to your clipboard.' });
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Creation</DialogTitle>
          <DialogDescription>
            Download the image or copy the link to share with your friends.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
             <div className="relative aspect-square w-full overflow-hidden rounded-md">
                {imageUrl && <Image src={imageUrl} alt={title} fill className="object-cover" />}
             </div>
             <div className="flex w-full items-center space-x-2">
                <Input value={url} readOnly />
                <Button type="button" size="icon" onClick={handleCopy}>
                    <Copy className="h-4 w-4" />
                    <span className="sr-only">Copy Link</span>
                </Button>
            </div>
        </div>
        <DialogFooter className="sm:justify-start">
          <Button onClick={handleDownload} className="w-full">
              <Download className="mr-2" />
              Download Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
