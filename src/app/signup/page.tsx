
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, KeyRound, Eye, EyeOff, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { AppLogo } from '@/components/AppLogo';

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 48 48" {...props}><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C44.962,32.645,48,27.455,48,20C48,17.222,47.389,14.625,46.336,12.331l-6.522,5.025C41.1,18.73,42.532,20,43.611,20.083z"></path></svg>
);

const AppleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" {...props}><path d="M19.3,4.74A5.8,5.8,0,0,0,15,3.13a5.53,5.53,0,0,0-4.32,2.3,5.71,5.71,0,0,0-4.33-2.3,5.89,5.89,0,0,0-4.43,1.61,6,6,0,0,0-1.8,4.53c0,3.52,2.61,6.23,4,7.56,1.23,1.14,2.5,2.28,4.3,2.28s3.07-1.14,4.3-2.28c1.39-1.33,4-4,4-7.56A5.92,5.92,0,0,0,19.3,4.74Zm-7.6,13a.85.85,0,0,1-.53-.17,11.32,11.32,0,0,1-2.47-2.4c-1-1.3-2.31-3.64-2.31-5.71,0-1.84.92-2.82,2-2.82A2.78,2.78,0,0,1,11.13,8.8a.78.78,0,0,1,1.44-.65,2.83,2.83,0,0,1,2.79-1.3,2.57,2.57,0,0,1,1.91,1,2.81,2.81,0,0,1,.73,2.1,5.26,5.26,0,0,1-2.3,4.36A11.31,11.31,0,0,1,13,17.58.7.7,0,0,1,11.7,17.77Z"></path><path d="M15.13,2.44a3.86,3.86,0,0,0-3.4,2.08,3.56,3.56,0,0,0-3.32-2.08A4.1,4.1,0,0,0,4.8,4.36,3.76,3.76,0,0,1,7.09,4,4,0,0,1,11.7,2,a4.4,4.4,0,0,0,3.7,2.1,3.43,3.43,0,0,0,3.31-2.18,3.8,3.8,0,0,0,3.42,2.18,4.32,4.32,0,0,0,3.7-2.1c.09-.17,1.38-2.52-1.38-4A4.14,4.14,0,0,0,15.13,2.44Z"></path></svg>
);

// A simple list of inappropriate words. This should be expanded.
const inappropriateWords = ['admin', 'moderator', 'root', 'badword'];

export default function SignupPage() {
  const router = useRouter();
  const { signUpWithEmail, signInWithGoogle, signInWithApple, user, isUserLoading } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSocialLoading, setSocialLoading] = React.useState<null | 'google' | 'apple'>(null);


  React.useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Sign-up Failed",
        description: "Passwords do not match.",
      });
      return;
    }

    const lowerCaseDisplayName = displayName.toLowerCase();
    if (inappropriateWords.some(word => lowerCaseDisplayName.includes(word))) {
      toast({
        variant: "destructive",
        title: "Sign-up Failed",
        description: "Please choose a different display name.",
      });
      return;
    }

    setIsLoading(true);
    try {
      await signUpWithEmail(email, password, displayName);
      // Let the useEffect handle the redirect
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sign-up Failed",
        description: error.message || "An unknown error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setSocialLoading(provider);
    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else {
        await signInWithApple();
      }
      // Successful login will be handled by the useEffect hook which redirects to dashboard.
    } catch (error: any) {
      // Avoid showing a toast if the user intentionally closes the popup.
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        toast({
          variant: "destructive",
          title: "Sign-up Failed",
          description: "Could not sign up with the selected provider. Please try again.",
        });
      }
    } finally {
      setSocialLoading(null);
    }
  }

  if (isUserLoading || user) {
     return (
        <div className="flex items-center justify-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }


  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
       <div className="absolute top-8 left-8">
         <AppLogo />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-2xl">Create Your Account</CardTitle>
          <CardDescription>Begin your pet's legendary journey.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSignup}>
            <div className="space-y-2">
              <Label htmlFor="displayName">Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="displayName" type="text" placeholder="Mythic Maker" required className="pl-10" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="hero@example.com" required className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} required className="pl-10 pr-10" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}/>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="confirmPassword" type={showPassword ? "text" : "password"} required className="pl-10 pr-10" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}/>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
               {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
           <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" onClick={() => handleSocialLogin('google')} disabled={!!isSocialLoading}>
                {isSocialLoading === 'google' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4"/>}
                Google
              </Button>
              <Button variant="outline" onClick={() => handleSocialLogin('apple')} disabled={!!isSocialLoading}>
                {isSocialLoading === 'apple' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AppleIcon className="mr-2 h-4 w-4" fill="currentColor"/>}
                Apple
              </Button>
          </div>
        </CardContent>
        <CardFooter className="justify-center text-sm">
          <p>
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
