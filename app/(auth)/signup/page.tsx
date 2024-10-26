"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { checkInvitation, signUp } from "@/lib/actions/supabaseActions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [role, setRole] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const toggleVisibility = () => setIsVisible((prevState) => !prevState);

  useEffect(() => {
    if (token) {
      checkInvitation(token)
        .then((invitation) => {
          if (invitation) {
            setEmail(invitation.email);
            setRole(invitation.role);
          } else {
            setError("Invalid or expired invitation");
          }
        })
        .catch((err) => {
          setError("Error checking invitation");
          console.error(err);
        });
    }
  }, [token]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signUp(email, password, role);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <form onSubmit={handleSignUp} className='space-y-4 max-w-md mx-auto mt-8'>
      <Input
        type='email'
        value={email}
        readOnly
        disabled
        className='bg-gray-100'
      />
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            className="pe-9"
            placeholder="Password"
            type={isVisible ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            className="absolute inset-y-px end-px flex h-full w-9 items-center justify-center rounded-e-lg text-muted-foreground/80 ring-offset-background transition-shadow hover:text-foreground focus-visible:border focus-visible:border-ring focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={toggleVisibility}
            aria-label={isVisible ? "Hide password" : "Show password"}
            aria-pressed={isVisible}
            aria-controls="password"
          >
            {isVisible ? (
              <EyeOff size={16} strokeWidth={2} aria-hidden="true" />
            ) : (
              <Eye size={16} strokeWidth={2} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      <Button type='submit' className='w-full'>
        Sign Up
      </Button>
    </form>
  );
}
