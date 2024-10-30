"use client";

import { useEffect, useState, ReactNode, Suspense } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  signOut,
  getCurrentUser,
  getUserProfile,
} from "@/lib/actions/supabaseActions";
import dynamic from 'next/dynamic';
import Loader from '@/components/Loader';

// Dynamically import heavy components to prevent circular dependencies
// and improve initial load time
const Layout = dynamic(() => import("@/components/dashboard/Sidebar"), {
  ssr: false,
  loading: () => <Loader />
});

const Navbar = dynamic(() => import("@/components/Navbar"), {
  ssr: false,
  loading: () => <Loader />
});

// Routes configuration
const ADMIN_ROUTES = ["/daily-reports"];
const PUBLIC_ROUTES = ["/", "/signin", "/signup", "/deactivated"];

const AuthWrapper = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);

  // Helper function to check if current route is public
  const isPublicRoute = (path: string) => {
    return PUBLIC_ROUTES.includes(path);
  };

  // Main authentication and authorization check
  useEffect(() => {
    const checkUserAndAccess = async () => {
      try {
        setIsLoading(true);
        const currentUser = await getCurrentUser();

        // Redirect to signin if no user on protected route
        if (!currentUser && !isPublicRoute(pathname)) {
          setShouldRedirect("/signin");
          return;
        }

        if (currentUser) {
          const profile = await getUserProfile(currentUser.id);

          // Handle deactivated accounts
          if (!profile || !profile.is_active) {
            await signOut();
            setShouldRedirect("/deactivated");
            return;
          }

          // Set user data and check role-based access
          setUser(currentUser);
          setUserRole(profile.role || "");

          // Redirect non-admin users from admin routes
          if (ADMIN_ROUTES.includes(pathname) && profile.role !== "admin") {
            setShouldRedirect("/dashboard");
            return;
          }
        }
      } catch (error: any) {
        // Handle authentication errors
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

  // Handle navigation redirects
  useEffect(() => {
    if (shouldRedirect) {
      router.push(shouldRedirect);
    }
  }, [shouldRedirect, router]);

  // Render logic for different states
  if (isPublicRoute(pathname)) {
    return <>{children}</>;
  }

  if (isLoading) {
    return <Loader />;
  }

  if (!user && !isPublicRoute(pathname)) {
    return <Loader />;
  }

  // Render authenticated layout with proper loading states
  return user ? (
    <Suspense fallback={<Loader />}>
      <div className='flex h-screen'>
        <Layout user={user}>
          <div className='flex flex-col w-full'>
            <Navbar />
            <main className='flex-grow p-4'>{children}</main>
          </div>
        </Layout>
      </div>
    </Suspense>
  ) : (
    <Loader />
  );
};

export default AuthWrapper;
