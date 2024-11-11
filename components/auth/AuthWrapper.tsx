"use client";

import { useEffect, useState, ReactNode, Suspense } from "react";
import { useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import Loader from "@/components/Loader";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

// Dynamically import heavy components
const Layout = dynamic(() => import("@/components/Sidebar"), {
  ssr: false,
  loading: () => <Loader />,
});

const Navbar = dynamic(() => import("@/components/Navbar"), {
  ssr: false,
  loading: () => <Loader />,
});

const AIChatAssistant = dynamic(
  () =>
    import("@/components/AIChatAssistant").then((mod) => mod.AIChatAssistant),
  {
    ssr: false,
    loading: () => null,
  }
);

// Routes configuration
const ADMIN_ROUTES = ["/daily-reports"];
const PUBLIC_ROUTES = ["/", "/signin", "/signup", "/deactivated"];

const AuthWrapper = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const { user, userRole, isLoading, isAuthenticated } = useAuth();
  const [shouldRedirect, setShouldRedirect] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Helper function to check if current route is public
  const isPublicRoute = (path: string): boolean => {
    return PUBLIC_ROUTES.includes(path);
  };

  // Clear query cache when auth state changes
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      queryClient.clear();
    }
  }, [isAuthenticated, isLoading, queryClient]);

  // Handle access control
  useEffect(() => {
    // Skip checks for public routes
    if (isPublicRoute(pathname)) {
      return;
    }

    // Wait for auth to initialize
    if (isLoading) {
      return;
    }

    // Handle unauthenticated users
    if (!isAuthenticated) {
      router.replace("/signin");
      return;
    }

    // Handle admin routes
    if (ADMIN_ROUTES.includes(pathname) && userRole !== "admin") {
      router.replace("/dashboard");
      return;
    }
  }, [pathname, isAuthenticated, isLoading, userRole, router]);

  // Render logic
  if (isPublicRoute(pathname)) {
    return <>{children}</>;
  }

  if (isLoading) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return <Loader />;
  }

  // Render authenticated layout
  return (
    <div className='flex h-screen'>
      <Layout>
        <div className='flex flex-col w-full'>
          <Navbar />
          <main className='flex-grow p-4'>{children}</main>
        </div>
      </Layout>
      <AIChatAssistant />
    </div>
  );
};

export default AuthWrapper;
