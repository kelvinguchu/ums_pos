"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut, getCurrentUser } from "@/lib/actions/supabaseActions";
import Layout from "@/components/dashboard/Sidebar";
import Navbar from "@/components/Navbar";
import Loader from "@/components/Loader"; 

export default function AuthWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      if (!currentUser && !isPublicRoute(pathname)) {
        router.push("/signin");
      }
    };
    checkUser();
  }, [router, pathname]);

  // Commenting out the inactivity logout logic for now
  // useEffect(() => {
  //   let inactivityTimer: NodeJS.Timeout;

  //   const resetInactivityTimer = () => {
  //     clearTimeout(inactivityTimer);
  //     inactivityTimer = setTimeout(async () => {
  //       await signOut();
  //       router.push("/signin");
  //     }, 5 * 60 * 1000); // 5 minutes
  //   };

  //   if (user) {
  //     const events = ["mousedown", "keydown", "touchstart", "scroll"];
  //     events.forEach((event) => {
  //       document.addEventListener(event, resetInactivityTimer);
  //     });

  //     resetInactivityTimer();

  //     return () => {
  //       events.forEach((event) => {
  //         document.removeEventListener(event, resetInactivityTimer);
  //       });
  //       clearTimeout(inactivityTimer);
  //     };
  //   }
  // }, [router, user]);

  const isPublicRoute = (path: string) => {
    return path === "/" || path === "/signin" || path === "/signup";
  };

  if (isPublicRoute(pathname)) {
    return <>{children}</>;
  }

  if (!user) {
    return <div> <Loader /> </div>;
  }

  return (
    <div className="flex h-screen">
      <Layout user={user}>
        <div className="flex flex-col w-full">
          <Navbar />
          <main className="flex-grow p-4">{children}</main>
        </div>
      </Layout>
    </div>
  );
}
