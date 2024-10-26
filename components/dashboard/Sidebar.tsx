import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/Appsidebar";

export default function Layout({ children, user }: { children: React.ReactNode; user: any }) {
  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <main className='mt-16 sticky top-16'>
        <SidebarTrigger />
        {children}
      </main>
    </SidebarProvider>
  );
}
