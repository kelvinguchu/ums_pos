"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut, getCurrentUser, getUserProfile } from "@/lib/actions/supabaseActions";
import Layout from "@/components/dashboard/Sidebar";
import Navbar from "@/components/Navbar";
import Loader from "@/components/Loader";

// admin-only routes
const ADMIN_ROUTES = ['/daily-reports'];

// public routes that don't require authentication
const PUBLIC_ROUTES = ['/', '/signin', '/signup', '/deactivated'];

export default function AuthWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);

  const isPublicRoute = (path: string) => {
    return PUBLIC_ROUTES.includes(path);
  };

  useEffect(() => {
    const checkUserAndAccess = async () => {
      try {
        setIsLoading(true);
        const currentUser = await getCurrentUser();

        if (!currentUser && !isPublicRoute(pathname)) {
          setShouldRedirect("/signin");
          return;
        }

        if (currentUser) {
          const profile = await getUserProfile(currentUser.id);
          
          // Enhanced deactivation check
          if (!profile || !profile.is_active) {
            await signOut();
            setShouldRedirect("/deactivated");
            return;
          }

          setUser(currentUser);
          setUserRole(profile.role || "");

          if (ADMIN_ROUTES.includes(pathname) && profile.role !== "admin") {
            setShouldRedirect("/dashboard");
            return;
          }
        }
      } catch (error: any) {
        console.error("Error checking user access:", error);
        if (error.message === "ACCOUNT_DEACTIVATED") {
          await signOut();
          setShouldRedirect("/deactivated");
        } else {
          await signOut();
          setShouldRedirect("/signin");
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkUserAndAccess();
  }, [pathname]);

  // Handle redirects in a separate effect
  useEffect(() => {
    if (shouldRedirect) {
      router.push(shouldRedirect);
    }
  }, [shouldRedirect, router]);

  // Allow access to public routes without checks
  if (isPublicRoute(pathname)) {
    return <>{children}</>;
  }

  // Show loader while checking authentication
  if (isLoading) {
    return <div><Loader /></div>;
  }

  // If not a public route and no user, show loader while redirect happens
  if (!user && !isPublicRoute(pathname)) {
    return <div><Loader /></div>;
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
