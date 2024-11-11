"use client";

import { useEffect, useState, ReactNode, Suspense } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "@/lib/actions/supabaseActions";
import dynamic from 'next/dynamic';
import Loader from '@/components/Loader';
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from '@tanstack/react-query';

// Dynamically import heavy components
const Layout = dynamic(() => import("@/components/Sidebar"), {
  ssr: false,
  loading: () => <Loader />
});

const Navbar = dynamic(() => import("@/components/Navbar"), {
  ssr: false,
  loading: () => <Loader />
});

const AIChatAssistant = dynamic(() => 
  import("@/components/AIChatAssistant").then(mod => mod.AIChatAssistant), {
  ssr: false,
  loading: () => null
});

// Routes configuration
const ADMIN_ROUTES = ["/daily-reports"];
const PUBLIC_ROUTES = ["/", "/signin", "/signup", "/deactivated"];

const AuthWrapper = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userRole, isLoading, isAuthenticated, updateAuthState } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Clear all caches when auth state changes
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      queryClient.clear();
      localStorage.clear();
      sessionStorage.clear();
    }
  }, [isAuthenticated, isLoading, queryClient]);

  // Helper function to check if current route is public
  const isPublicRoute = (path: string) => {
    return PUBLIC_ROUTES.includes(path);
  };

  // Main authentication and authorization check
  useEffect(() => {
    const checkAccess = async () => {
      // Allow access to public routes
      if (isPublicRoute(pathname)) {
        return;
      }

      // Redirect to signin if not authenticated
      if (!isAuthenticated && !isLoading) {
        setShouldRedirect("/signin");
        return;
      }

      // Check admin routes access
      if (ADMIN_ROUTES.includes(pathname) && userRole !== "admin") {
        setShouldRedirect("/dashboard");
        return;
      }
    };

    checkAccess();
  }, [pathname, isAuthenticated, isLoading, userRole]);

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

  if (!isAuthenticated && !isPublicRoute(pathname)) {
    return <Loader />;
  }

  // Render authenticated layout
  return isAuthenticated ? (
    <Suspense fallback={<Loader />}>
      <div className='flex h-screen'>
        <Layout>
          <div className='flex flex-col w-full'>
            <Navbar />
            <main className='flex-grow p-4'>{children}</main>
          </div>
        </Layout>
        <AIChatAssistant />
      </div>
    </Suspense>
  ) : (
    <Loader />
  );
};

export default AuthWrapper;
