"use client";

import { useEffect, useState, ReactNode } from "react";
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
  () => import("@/components/AIChatAssistant").then((mod) => mod.AIChatAssistant),
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
    let timeoutId: NodeJS.Timeout;

    const checkAccess = () => {
      if (isPublicRoute(pathname)) {
        return;
      }

      if (!isLoading && !isAuthenticated) {
        timeoutId = setTimeout(() => {
          router.replace("/signin");
        }, 100);
        return;
      }

      if (!isLoading && isAuthenticated && ADMIN_ROUTES.includes(pathname) && userRole !== "admin") {
        timeoutId = setTimeout(() => {
          router.replace("/dashboard");
        }, 100);
      }
    };

    checkAccess();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [pathname, isAuthenticated, isLoading, userRole, router]);

  // Render logic
  if (isPublicRoute(pathname)) {
    return <>{children}</>;
  }

  // Show loader only during initial auth check
  if (isLoading) {
    return <Loader />;
  }

  // Redirect to signin if not authenticated
  if (!isAuthenticated && !isPublicRoute(pathname)) {
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
