'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';

interface ShareDialogProps {
  children: React.ReactNode;
  title: string;
  body: string;
  url: string;
}

export function ShareDialog({ children, title, body, url }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share !== 'undefined') {
      setCanShare(true);
    }
  }, []);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: body,
          url: url,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
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
            Share this link with your friends and followers!
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input value={url} readOnly />
        </div>
        <DialogFooter className="sm:justify-start">
          <Button onClick={handleCopy} className="w-full sm:w-auto flex-1">
            Copy Link
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
