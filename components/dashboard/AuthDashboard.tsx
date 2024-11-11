"use client";

import { useEffect } from "react";
import Dashboard from "./Dashboard";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import localFont from "next/font/local";
import { useAuth } from "@/contexts/AuthContext";

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const AuthDashboard = () => {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/signin");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return <Loader />;
  }

  return (
    <div className={`${geistMono.className} mt-8`}>
      <Dashboard user={user} />
    </div>
  );
};

export default AuthDashboard;
