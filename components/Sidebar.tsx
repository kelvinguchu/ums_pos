import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./Appsidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  // Move the initialization to useEffect to handle client-side only
  const [isOpen, setIsOpen] = React.useState(() => {
    if (typeof window === 'undefined') return !isMobile;
    return localStorage.getItem('sidebarState') === 'true' || window.innerWidth >= 768;
  });

  return (
    <SidebarProvider defaultOpen={isOpen}>
      <AppSidebar />
      <div className="relative bg-background">
        {!isMobile && (
          <div className="sticky top-16 z-40 h-12 flex items-center px-4 bg-background">
            <SidebarTrigger />
          </div>
        )}
        <main className={`${isMobile ? "mt-0" : "mt-4"} bg-background`}>
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
