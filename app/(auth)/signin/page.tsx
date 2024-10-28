"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/actions/supabaseActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import Image from "next/image";
import localFont from "next/font/local";

const geistMono = localFont({
  src: "../../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export default function SignIn() {
  const [emailPrefix, setEmailPrefix] = useState("");
  const [password, setPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const toggleVisibility = () => setIsVisible((prevState) => !prevState);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const email = `${emailPrefix}@gmail.com`;
    try {
      const { user, session, error } = await signIn(email, password);
      if (error) throw error;
      if (session) {
        router.push("/dashboard");
      }
    } catch (error: any) {
      if (error.message === "ACCOUNT_DEACTIVATED") {
        router.push("/deactivated");
      } else {
        setError(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`${geistMono.className} flex flex-col items-center justify-center space-y-4 min-h-screen bg-background`}>
      <Image src='/logo.png' alt='logo' width={100} height={100} className='' />
      <h1 className='uppercase text-4xl font-bold'>POS System</h1>
      <Card className='w-[350px]'>
        <CardHeader>
          <CardTitle className='text-center uppercase'>Sign In</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn}>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='email' className='text-xl'>
                  Email
                </Label>
                <div className='flex rounded-lg shadow-sm shadow-black/[.04]'>
                  <Input
                    id='email'
                    className='-me-px rounded-e-none shadow-none'
                    placeholder='johndoe'
                    type='text'
                    value={emailPrefix}
                    onChange={(e) => setEmailPrefix(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <span className='inline-flex items-center rounded-e-lg border border-input bg-white px-3 text-sm'>
                    @gmail.com
                  </span>
                </div>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='password' className='text-xl'>
                  Password
                </Label>
                <div className='relative'>
                  <Input
                    id='password'
                    className='pe-9'
                    placeholder='Password'
                    type={isVisible ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <button
                    className='absolute inset-y-px end-px flex h-full w-9 items-center justify-center rounded-e-lg text-muted-foreground/80 ring-offset-background transition-shadow hover:text-foreground focus-visible:border focus-visible:border-ring focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
                    type='button'
                    onClick={toggleVisibility}
                    aria-label={isVisible ? "Hide password" : "Show password"}
                    aria-pressed={isVisible}
                    aria-controls='password'
                    disabled={isLoading}>
                    {isVisible ? (
                      <EyeOff size={16} strokeWidth={2} aria-hidden='true' />
                    ) : (
                      <Eye size={16} strokeWidth={2} aria-hidden='true' />
                    )}
                  </button>
                </div>
              </div>
            </div>
            {error && <p className='text-red-500 text-sm mt-2'>{error}</p>}
            <Button 
              type='submit' 
              className='w-full mt-4 bg-[#000080] hover:bg-[#000061]'
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className='text-sm text-center w-full'>
            Don't have an account? Contact an admin for an invitation.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
