"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { checkInvitation, signUp } from "@/lib/actions/supabaseActions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import Image from "next/image";
import localFont from "next/font/local";
import { Metadata } from "next";

const geistMono = localFont({
  src: "../../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Sign Up | UMS POS",
  description: "Create a new account",
};

export default function SignUpPage() {
  return (
    <div>
      {/* Your signup form component */}
    </div>
  );
}
