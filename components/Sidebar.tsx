import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./Appsidebar";
import { useIsMobile } from "@/hooks/use-mobile";

const Layout = ({
  children,
  user,
}: {
  children: React.ReactNode;
  user: any;
}) => {
  const initialSidebarState =
    typeof window !== "undefined"
      ? localStorage.getItem("sidebarState") === "true"
      : true;
  
  const isMobile = useIsMobile();

  return (
    <SidebarProvider defaultOpen={initialSidebarState}>
      <AppSidebar user={user} />
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
