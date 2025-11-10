import Link from 'next/link';
import Image from 'next/image';
import { PawPrint, Shield, BookOpen, Share2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const AppLogo = () => (
  <Link href="/" className="flex items-center gap-2">
    <PawPrint className="h-6 w-6 text-primary" />
    <span className="text-xl font-bold tracking-tight text-foreground">Mythic Pets</span>
  </Link>
);

const Header = () => (
  <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm">
    <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
      <AppLogo />
      <nav className="hidden items-center gap-6 md:flex">
        <Link href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Features</Link>
        <Link href="#pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">Pricing</Link>
      </nav>
      <div className="flex items-center gap-2">
        <Button variant="ghost" asChild>
          <Link href="/login">Log In</Link>
        </Button>
        <Button asChild>
          <Link href="/signup">Sign Up</Link>
        </Button>
      </div>
    </div>
  </header>
);

const Hero = () => {
  const heroImage = PlaceHolderImages.find(p => p.id === 'landing-hero');
  return (
    <section className="w-full pt-24 md:pt-32 lg:pt-40">
      <div className="container mx-auto grid gap-8 px-4 md:grid-cols-2 md:gap-16 md:px-6">
        <div className="flex flex-col items-start justify-center space-y-4">
          <h1 className="font-headline text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
            Unleash Your Pet's Inner Legend.
          </h1>
          <p className="max-w-[600px] text-muted-foreground md:text-xl">
            Transform your furry friend into a mythical hero with AI-generated personas, artwork, and epic stories. What legend will your pet become?
          </p>
          <div className="flex flex-col gap-2 min-[400px]:flex-row">
            <Button size="lg" asChild>
              <Link href="/signup">Create Your Pet's Myth</Link>
            </Button>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-xl shadow-2xl">
          {heroImage && (
             <Image
              src={heroImage.imageUrl}
              alt={heroImage.description}
              width={600}
              height={400}
              className="aspect-[3/2] w-full object-cover"
              data-ai-hint={heroImage.imageHint}
            />
          )}
        </div>
      </div>
    </section>
  );
};

const features = [
  {
    icon: Shield,
    title: 'AI Persona Generation',
    description: 'Transform pet photos into stunning AI art. Choose from themes like Superhero, Wizard, or Cyberpunk to create a unique persona.',
    image: PlaceHolderImages.find(p => p.id === 'feature-persona'),
  },
  {
    icon: BookOpen,
    title: 'AI Story Weaver',
    description: 'Generate captivating stories based on your pet\'s new persona. Select the tone and length, from a short post to a full tale.',
    image: PlaceHolderImages.find(p => p.id === 'feature-story'),
  },
  {
    icon: Share2,
    title: 'Share Your Saga',
    description: 'Easily share your pet’s persona and stories on social media with pre-formatted captions and a unique "Remix" call to action.',
    image: PlaceHolderImages.find(p => p.id === 'feature-share'),
  },
];

const Features = () => (
  <section id="features" className="w-full py-12 md:py-24 lg:py-32">
    <div className="container mx-auto space-y-12 px-4 md:px-6">
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-5xl">From Pet to Protagonist</h2>
        <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
          Mythic Pets provides all the tools you need to build a legendary universe for your companion.
        </p>
      </div>
      <div className="mx-auto grid items-start gap-8 sm:max-w-4xl sm:grid-cols-1 md:gap-12 lg:max-w-5xl lg:grid-cols-3">
        {features.map((feature, index) => (
          <Card key={index} className="flex flex-col overflow-hidden">
             {feature.image && (
              <Image
                src={feature.image.imageUrl}
                alt={feature.image.description}
                width={400}
                height={250}
                className="aspect-video w-full object-cover"
                data-ai-hint={feature.image.imageHint}
              />
            )}
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <CardTitle className="font-headline text-xl">{feature.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </section>
);


const pricingTiers = [
    {
        name: "Free Tier",
        price: "$0",
        period: "/ month",
        description: "Get started and see what legends your pet can become.",
        features: [
            "1 Pet Profile",
            "5 AI Persona Generations/mo",
            "5 AI Story Generations/mo",
            "Basic Sharing Options"
        ],
        cta: "Start for Free",
        variant: "secondary" as const,
    },
    {
        name: "Pro Plan",
        price: "$9.99",
        period: "/ month",
        description: "For the ultimate storyteller and pet lover.",
        features: [
            "Unlimited Pet Profiles",
            "Unlimited AI Generations",
            "Advanced Story Editing",
            "High-Resolution Downloads",
            "Remove Watermarks"
        ],
        cta: "Go Pro",
        variant: "default" as const,
        popular: true,
    }
];

const Pricing = () => (
    <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 bg-secondary">
        <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-5xl">Choose Your Adventure</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    A plan for every myth-maker. Upgrade to unlock the full power of Mythic Pets.
                </p>
            </div>
            <div className="mx-auto mt-12 grid max-w-sm items-start gap-8 lg:max-w-4xl lg:grid-cols-2">
                {pricingTiers.map((tier) => (
                    <Card key={tier.name} className={`relative ${tier.popular ? "border-2 border-primary shadow-lg" : ""}`}>
                        {tier.popular && (
                            <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                                <div className="inline-flex items-center gap-x-1.5 rounded-full bg-primary px-3 py-1 text-sm font-semibold text-primary-foreground">
                                    Most Popular
                                </div>
                            </div>
                        )}
                        <CardHeader className="pt-12">
                            <CardTitle className="font-headline text-2xl">{tier.name}</CardTitle>
                            <p className="text-muted-foreground">{tier.description}</p>
                            <div className="flex items-baseline gap-1 pt-4">
                                <span className="text-4xl font-bold tracking-tight">{tier.price}</span>
                                <span className="text-sm font-semibold text-muted-foreground">{tier.period}</span>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1">
                            <ul className="space-y-3">
                                {tier.features.map((feature, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <Star className="h-5 w-5 text-accent" />
                                        <span>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                        <div className="p-6 pt-0">
                           <Button asChild size="lg" className="w-full" variant={tier.variant}>
                                <Link href="/signup">{tier.cta}</Link>
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    </section>
);


const Footer = () => (
  <footer className="w-full border-t">
    <div className="container mx-auto flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0 px-4 md:px-6">
      <AppLogo />
      <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Mythic Pets. All rights reserved.</p>
    </div>
  </footer>
);

export default function Home() {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <Features />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
