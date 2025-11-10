import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockStories } from '@/lib/data';
import { Share2, Heart, Download } from 'lucide-react';

export default function GalleryPage() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="space-y-4 mb-8">
        <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">Story Gallery</h1>
        <p className="text-lg text-muted-foreground">
          Browse the legendary tales of your mythic pets.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {mockStories.map((story) => (
          <Card key={story.id} className="flex flex-col overflow-hidden">
            <CardHeader className="p-0">
              <Image
                src={story.personaImage}
                alt={story.title}
                width={400}
                height={300}
                data-ai-hint={story.imageHint}
                className="aspect-4/3 w-full object-cover"
              />
            </CardHeader>
            <CardContent className="flex-1 p-4">
              <CardTitle className="font-headline text-lg leading-tight mb-1">{story.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{story.createdAt}</p>
            </CardContent>
            <CardFooter className="p-4 pt-0 flex justify-between">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                    <Heart className="h-5 w-5" />
                    <span className="sr-only">Favorite</span>
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                    <Share2 className="h-5 w-5" />
                    <span className="sr-only">Share</span>
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                    <Download className="h-5 w-5" />
                    <span className="sr-only">Download</span>
                </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
