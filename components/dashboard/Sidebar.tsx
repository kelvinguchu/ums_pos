import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/Appsidebar";

export default function Layout({
  children,
  user,
}: {
  children: React.ReactNode;
  user: any;
}) {
  const initialSidebarState =
    typeof window !== "undefined"
      ? localStorage.getItem("sidebarState") === "true"
      : true;

  return (
    <SidebarProvider defaultOpen={initialSidebarState}>
      <AppSidebar user={user} />
      <div className="relative">
        <div className="sticky top-16 z-40 h-12 flex items-center px-4 bg-background">
          <SidebarTrigger />
        </div>
        <main className="mt-4">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
