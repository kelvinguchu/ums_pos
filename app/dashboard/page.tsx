"use client";

import { useEffect, useState } from "react";
import Dashboard from "@/components/dashboard/Dashboard";
import { getCurrentUser } from "@/lib/actions/supabaseActions";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import { SalesBarchart } from "@/components/dashboard/SalesBarchart"
import localFont from "next/font/local";

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export default function DashboardPage() {
  const [user, setUser] = useState<any | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        } else {
          // Redirect to login if no user is found
          router.push('/login');
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        router.push('/login');
      }
    };

    fetchUser();
  }, [router]);

  if (!user) {
    return <Loader />;
  }

  return (
    <div className={`${geistMono.className}`}>
      <Dashboard user={user} />
    </div>
  );
}
