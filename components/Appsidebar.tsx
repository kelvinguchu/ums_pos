import { useState, useEffect, useMemo } from "react";
import {
  Home,
  ShoppingCart,
  BarChart2,
  Users,
  PlusCircle,
  DollarSign,
  Calendar,
  HandPlatter,
  SmilePlus,
  LogOut,
  ArrowLeftCircle,
} from "lucide-react";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import InviteUser from "@/components/users/InviteUser";
import AddMeterForm from "@/components/addmeter/AddMeterForm";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getUserProfile } from "@/lib/actions/supabaseActions";
import SellMeters from "@/components/sellmeter/SellMeters";
import CreateUser from "@/components/users/CreateUser";
import localFont from "next/font/local";
import AssignMetersToAgent from "@/components/agents/AssignMetersToAgent";
import CreateAgentDialog from "@/components/agents/CreateAgentDialog";
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "@/lib/actions/supabaseActions";
import { useIsMobile } from "@/hooks/use-mobile";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";
import ReturnSoldMeters from "@/components/returns/ReturnSoldMeters";
import { useQueryClient } from "@tanstack/react-query";

const geistMono = localFont({
  src: "../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const items = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Sales", url: "/sales", icon: ShoppingCart },
  { title: "Reports", url: "/reports", icon: BarChart2 },
  {
    title: "Daily Reports",
    url: "/daily-reports",
    icon: Calendar,
    adminOnly: true,
  },
  { title: "Users", url: "/users", icon: Users },
  { title: "Agents", url: "/agents", icon: HandPlatter },
];

export function AppSidebar() {
  const { user, userRole, updateAuthState } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [userName, setUserName] = useState(user?.name || "");
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isAddMetersOpen, setIsAddMetersOpen] = useState(() => {
    return localStorage.getItem("addMetersSheetOpen") === "true";
  });
  const [isSellMetersOpen, setIsSellMetersOpen] = useState(() => {
    return localStorage.getItem("sellMetersSheetOpen") === "true";
  });
  const [isAssignMetersOpen, setIsAssignMetersOpen] = useState(() => {
    return localStorage.getItem("assignMetersSheetOpen") === "true";
  });
  const [isCreateAgentOpen, setIsCreateAgentOpen] = useState(false);
  const queryClient = useQueryClient();

  // Save sheet states to localStorage
  useEffect(() => {
    localStorage.setItem("addMetersSheetOpen", isAddMetersOpen.toString());
  }, [isAddMetersOpen]);

  useEffect(() => {
    localStorage.setItem("sellMetersSheetOpen", isSellMetersOpen.toString());
  }, [isSellMetersOpen]);

  useEffect(() => {
    localStorage.setItem(
      "assignMetersSheetOpen",
      isAssignMetersOpen.toString()
    );
  }, [isAssignMetersOpen]);

  useEffect(() => {
    return () => {
      // Cleanup when component unmounts
      localStorage.removeItem("addMetersSheetOpen");
      localStorage.removeItem("sellMetersSheetOpen");
      localStorage.removeItem("assignMetersSheetOpen");
    };
  }, []);

  const isAdmin = userRole === "admin";

  const handleLogout = async () => {
    try {
      // Immediately navigate to signin to prevent any further actions
      router.push("/signin");

      // Immediately update auth context to prevent any authenticated actions
      updateAuthState({
        user: null,
        userRole: "",
        isAuthenticated: false,
        isLoading: false,
      });

      // Clear all caches and storage in parallel
      await Promise.all([
        // Clear React Query cache
        queryClient.clear(),

        // Sign out from supabase
        signOut(),

        // Clear all storages
        Promise.resolve(localStorage.clear()),
        Promise.resolve(sessionStorage.clear()),
      ]);
    } catch (error) {
      console.error("Logout error:", error);
      // Even if there's an error, ensure the user is logged out locally
      router.push("/signin");
    }
  };

  // Ensure user is properly typed and available before rendering sensitive components
  const currentUserData = useMemo(() => {
    if (!user?.id || !user?.name) return null;
    return {
      id: user.id,
      name: user.name,
    };
  }, [user]);

  return (
    <Sidebar className='mt-16 flex flex-col justify-between h-[calc(100vh-4rem)] bg-background'>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className='text-lg font-bold drop-shadow-lg'>
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items
                .filter((item) => !item.adminOnly || isAdmin)
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url}>
                        <item.icon className='mr-2 h-4 w-4' />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className='text-lg font-bold drop-shadow-lg'>
            Actions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Sheet
                  open={isSellMetersOpen}
                  onOpenChange={setIsSellMetersOpen}>
                  <SheetTrigger asChild>
                    <SidebarMenuButton>
                      <DollarSign className='mr-2 h-4 w-4 text-blue-600' />
                      <span>Sell Meters</span>
                    </SidebarMenuButton>
                  </SheetTrigger>
                  <SheetContent className='min-w-[50vw]'>
                    <SheetHeader>
                      <SheetTitle className='text-left'>
                        <Badge variant='outline' className='ml-2 bg-blue-100'>
                          {userName}
                        </Badge>
                      </SheetTitle>
                    </SheetHeader>
                    <SellMeters currentUser={user} />
                  </SheetContent>
                </Sheet>
              </SidebarMenuItem>
              {isAdmin && (
                <>
                  {/* <SidebarMenuItem>
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                      <DialogTrigger asChild>
                        <SidebarMenuButton>
                          <PlusCircle className='mr-2 h-4 w-4 text-indigo-600' />
                          <span>Invite User</span>
                        </SidebarMenuButton>
                      </DialogTrigger>
                      <DialogContent>
                        <InviteUser
                          currentUser={user}
                          onClose={() => setIsOpen(false)}
                        />
                      </DialogContent>
                    </Dialog>
                  </SidebarMenuItem> */}
                  <SidebarMenuItem>
                    <Dialog
                      open={isCreateUserOpen}
                      onOpenChange={setIsCreateUserOpen}>
                      <DialogTrigger asChild>
                        <SidebarMenuButton>
                          <SmilePlus className='mr-2 h-4 w-4 text-purple-600' />
                          <span>Create User</span>
                        </SidebarMenuButton>
                      </DialogTrigger>
                      <DialogContent>
                        <CreateUser
                          onClose={() => setIsCreateUserOpen(false)}
                        />
                      </DialogContent>
                    </Dialog>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <Dialog
                      open={isCreateAgentOpen}
                      onOpenChange={setIsCreateAgentOpen}>
                      <DialogTrigger asChild>
                        <SidebarMenuButton>
                          <HandPlatter className='mr-2 h-4 w-4 text-yellow-600' />
                          <span>Create Agent</span>
                        </SidebarMenuButton>
                      </DialogTrigger>
                      <CreateAgentDialog
                        isOpen={isCreateAgentOpen}
                        onClose={() => setIsCreateAgentOpen(false)}
                        onAgentCreated={() => setIsCreateAgentOpen(false)}
                      />
                    </Dialog>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <Sheet
                      open={isAddMetersOpen}
                      onOpenChange={(open) => {
                        setIsAddMetersOpen(open);
                        if (!open) {
                          const currentMeters =
                            localStorage.getItem("cachedMetersTable");
                          const currentDetails =
                            localStorage.getItem("cachedBatchDetails");
                          if (currentMeters) {
                            localStorage.setItem(
                              "cachedAddMetersBackup",
                              currentMeters
                            );
                          }
                          if (currentDetails) {
                            localStorage.setItem(
                              "cachedBatchDetailsBackup",
                              currentDetails
                            );
                          }
                        } else {
                          const backedUpMeters = localStorage.getItem(
                            "cachedAddMetersBackup"
                          );
                          const backedUpDetails = localStorage.getItem(
                            "cachedBatchDetailsBackup"
                          );
                          if (backedUpMeters) {
                            localStorage.setItem(
                              "cachedMetersTable",
                              backedUpMeters
                            );
                          }
                          if (backedUpDetails) {
                            localStorage.setItem(
                              "cachedBatchDetails",
                              backedUpDetails
                            );
                          }
                        }
                      }}>
                      <SheetTrigger asChild>
                        <SidebarMenuButton>
                          <PlusCircle className='mr-2 h-4 w-4 text-green-600' />
                          <span>Add Meters</span>
                        </SidebarMenuButton>
                      </SheetTrigger>
                      <SheetContent className='min-w-[60vw] max-h-[100vh] overflow-y-auto'>
                        <SheetHeader>
                          <SheetTitle className='text-left'>
                            <Badge
                              variant='outline'
                              className='ml-2 bg-blue-100'>
                              {userName}
                            </Badge>
                          </SheetTitle>
                        </SheetHeader>
                        {currentUserData && (
                          <AddMeterForm currentUser={currentUserData} />
                        )}
                      </SheetContent>
                    </Sheet>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <Sheet
                      open={isAssignMetersOpen}
                      onOpenChange={setIsAssignMetersOpen}>
                      <SheetTrigger asChild>
                        <SidebarMenuButton>
                          <Users className='mr-2 h-4 w-4 text-orange-600' />
                          <span>Assign Meters to Agent</span>
                        </SidebarMenuButton>
                      </SheetTrigger>
                      <SheetContent className='min-w-[50vw] max-h-[100vh] overflow-y-auto'>
                        <SheetHeader>
                          <SheetTitle className='text-left'>
                            <Badge
                              variant='outline'
                              className='ml-2 bg-blue-100'>
                              {userName}
                            </Badge>
                          </SheetTitle>
                        </SheetHeader>
                        <AssignMetersToAgent currentUser={user} />
                      </SheetContent>
                    </Sheet>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <Sheet>
                      <SheetTrigger asChild>
                        <SidebarMenuButton>
                          <ArrowLeftCircle className='mr-2 h-4 w-4 text-red-600' />
                          <span>Return Sold Meters</span>
                        </SidebarMenuButton>
                      </SheetTrigger>
                      <SheetContent className='min-w-[70vw] max-h-[100vh] overflow-y-auto'>
                        <SheetHeader>
                          <SheetTitle className='text-left'>
                            <Badge
                              variant='outline'
                              className='ml-2 bg-blue-100'>
                              Return Sold Meters
                            </Badge>
                          </SheetTitle>
                        </SheetHeader>
                        {currentUserData && (
                          <ReturnSoldMeters currentUser={currentUserData} />
                        )}
                      </SheetContent>
                    </Sheet>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {isMobile && (
          <SidebarGroup>
            <SidebarGroupLabel className='text-lg font-bold'>
              Notifications
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <NotificationBell />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {isMobile && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={handleLogout}
                    className='w-full text-red-600 hover:text-red-700 hover:bg-red-50'>
                    <LogOut className='mr-2 h-4 w-4' />
                    <span>Logout</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <div
        className={`${geistMono.className} p-4 border-t border-gray-200 bg-background`}>
        <div className='flex items-center gap-2'>
          <span className='text-sm text-gray-600'>{userName}</span>
          <Badge
            variant='outline'
            className={`${isAdmin ? "bg-green-100" : "bg-yellow-100"}`}>
            {userRole || "User"}
          </Badge>
        </div>
        <p className='text-xs text-gray-500 mt-1'>{user?.email}</p>
      </div>
    </Sidebar>
  );
}
