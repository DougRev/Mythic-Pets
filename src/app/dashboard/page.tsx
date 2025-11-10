import { CreationWorkflow } from '@/components/CreationWorkflow';

export default function CreatePage() {
  return (
    <div className="container mx-auto max-w-4xl py-8 px-4 md:px-6">
      <div className="space-y-4 mb-8">
        <h1 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">Create Your Pet's Legend</h1>
        <p className="text-lg text-muted-foreground">
          Follow the steps below to bring your pet's mythic persona to life.
        </p>
      </div>
      <CreationWorkflow />
    </div>
  );
}
