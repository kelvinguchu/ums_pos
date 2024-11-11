"use client";

import { useEffect, useState, ReactNode, Suspense } from "react";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "@/lib/actions/supabaseActions";
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

  useEffect(() => {
    const checkAccess = async () => {
      // If it's a public route, don't show loader
      if (isPublicRoute(pathname)) {
        return;
      }

      // Only check protected routes after initial auth check
      if (!isLoading) {
        if (!isAuthenticated) {
          setShouldRedirect("/signin");
          return;
        }

        if (ADMIN_ROUTES.includes(pathname) && userRole !== "admin") {
          setShouldRedirect("/dashboard");
          return;
        }
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

  // Simplified render logic
  if (isPublicRoute(pathname)) {
    return <>{children}</>;
  }

  // Only show loader for protected routes during auth check
  if (isLoading && !isPublicRoute(pathname)) {
    return <Loader />;
  }

  // For authenticated routes
  if (!isAuthenticated && !isPublicRoute(pathname)) {
    return <Loader />;
  }

  return (
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
  );
};

export default AuthWrapper;
