'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Bot, Edit, Share2, Sparkles, Trash2, BookOpen, RefreshCw, Loader2, Download, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useCollection, useDoc } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { RegenerateImageDialog } from '@/components/RegenerateImageDialog';
import { RegenerateLoreDialog } from '@/components/RegenerateLoreDialog';
import { SharePublicPersona } from '@/components/SharePublicPersona';
import { useToast } from '@/hooks/use-toast';
import { deletePersona } from '@/firebase/actions';

async function downloadImage(imageUrl: string, filename: string) {
    try {
        // Fetch the image data
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const blob = await response.blob();

        // Create a temporary URL for the blob
        const url = window.URL.createObjectURL(blob);

        // Create a temporary anchor element and trigger download
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'download.png';
        document.body.appendChild(a);
        a.click();

        // Clean up
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Image download failed:", error);
        // We'll use a toast to notify the user, defined in the component.
        throw error;
    }
}


export default function PersonaDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const petId = params.petId as string;
  const personaId = params.personaId as string;
  const { user, firestore, storage } = useAuth();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = React.useState(false);
  
  const petRef = React.useMemo(() => {
    if (!user || !firestore || !petId) return null;
    return doc(firestore, 'users', user.uid, 'petProfiles', petId);
  }, [firestore, user, petId]);
  
  const personaRef = React.useMemo(() => {
    if (!petRef || !personaId) return null;
    return doc(petRef, 'aiPersonas', personaId);
  }, [petRef, personaId]);

  const { data: pet, isLoading: isPetLoading } = useDoc<any>(petRef);
  const { data: persona, isLoading: isPersonaLoading, refetch: refetchPersona } = useDoc<any>(personaRef);


  const storiesQuery = React.useMemo(() => {
    if (!personaRef) return null;
    return query(collection(personaRef, 'aiStories'), orderBy('generationDate', 'desc'));
  }, [personaRef]);

  const { data: stories, isLoading: areStoriesLoading } = useCollection<any>(storiesQuery);
  
  const handleDeletePersona = async () => {
    if (!user || !firestore || !storage) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete persona. Invalid session.' });
        return;
    }
    setIsDeleting(true);
    try {
        await deletePersona(firestore, storage, user.uid, petId, personaId);
        toast({ title: 'Persona Deleted', description: `The "${persona.theme}" persona has been removed.` });
        router.push(`/dashboard/pets/${petId}`);
    } catch (error) {
        console.error("Failed to delete persona:", error);
        toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not remove the persona and its data.' });
    } finally {
        setIsDeleting(false);
    }
  }

  const handleDownload = async () => {
    toast({ title: 'Preparing Download...', description: 'Your image will begin downloading shortly.' });
    try {
        await downloadImage(persona.imageUrl, `${pet.name}-${persona.theme}.png`);
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Download Failed',
            description: 'Could not download the image. Please try again.',
        });
    }
  };

  const handleShareToSocial = () => {
    toast({
        title: 'Coming Soon!',
        description: 'Sharing to social media is on its way. For now, you can download the image and share it manually.',
    });
  };

  if (isPersonaLoading || isPetLoading) {
    return <div className="flex h-screen items-center justify-center">Loading persona...</div>;
  }

  if (!persona || !pet) {
    return <div className="flex h-screen items-center justify-center">Persona not found.</div>;
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">
      <Button variant="ghost" onClick={() => router.push(`/dashboard/pets/${petId}`)} className="mb-4">
        <ArrowLeft className="mr-2" />
        Back to All Personas
      </Button>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <Image
                src={persona.imageUrl}
                alt={persona.theme}
                width={600}
                height={600}
                className="aspect-square w-full object-cover"
                key={persona.imageUrl} // Re-renders the image when URL changes
              />
            </CardContent>
          </Card>
           <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={handleDownload}><Download className="mr-2"/>Download</Button>
            <Button variant="outline" onClick={handleShareToSocial}><Send className="mr-2"/>Share</Button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <RegenerateImageDialog persona={persona} pet={pet} onRegenerationComplete={refetchPersona}>
              <Button variant="outline"><RefreshCw className="mr-2"/>Regen Image</Button>
            </RegenerateImageDialog>
            <SharePublicPersona persona={persona} pet={pet} personaId={personaId} />
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="mr-2"/>Delete
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the 
                        <span className="font-bold"> {persona.theme}</span> persona and all of its associated stories.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeletePersona} disabled={isDeleting}>
                        {isDeleting ? <><Loader2 className="mr-2 animate-spin"/> Deleting...</> : 'Confirm Delete'}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-3xl">{persona.theme} Persona</CardTitle>
              <CardDescription>Generated on {new Date(persona.generationDate).toLocaleDateString()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold flex items-center gap-2 mb-2">
                  <Bot />
                  AI-Generated Lore
                </h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{persona.loreText}</p>
              </div>
              <RegenerateLoreDialog persona={persona} pet={pet} onRegenerationComplete={refetchPersona}>
                <Button variant="outline" className="w-full">
                  <Sparkles className="mr-2" /> Regenerate Lore
                </Button>
              </RegenerateLoreDialog>
            </CardContent>
          </Card>
          
          <Card className="flex-1">
            <CardHeader>
                <CardTitle>Stories</CardTitle>
                {areStoriesLoading && <CardDescription>Loading stories...</CardDescription>}
                {!areStoriesLoading && (!stories || stories.length === 0) && (
                  <CardDescription>No stories have been generated for this persona yet.</CardDescription>
                )}
            </CardHeader>
            <CardContent>
              {stories && stories.length > 0 && (
                <div className="space-y-2">
                  {stories.map(story => (
                    <Link key={story.id} href={`/dashboard/pets/${petId}/personas/${personaId}/stories/${story.id}`} className="block p-4 border rounded-lg hover:bg-muted transition-colors">
                      <h4 className="font-bold flex items-center gap-2"><BookOpen className="h-4 w-4" />{story.title}</h4>
                      <p className="text-sm text-muted-foreground pl-6">{story.lastChapter} {story.lastChapter > 1 ? 'chapters' : 'chapter'}</p>
                    </Link>
                  ))}
                </div>
              )}
              <Button asChild className="w-full mt-4">
                  <Link href={`/dashboard/pets/${petId}/personas/${personaId}/create-story`}>
                    <Edit className="mr-2"/>
                    {stories && stories.length > 0 ? 'Create Another Story' : 'Create First Story'}
                  </Link>
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
