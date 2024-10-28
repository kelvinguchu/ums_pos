import { useState, useEffect } from "react";
import {
  Home,
  ShoppingCart,
  BarChart2,
  Users,
  PlusCircle,
  DollarSign,
  Calendar,
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
import InviteUser from "@/components/auth/InviteUser";
import AddMeterForm from "@/components/dashboard/AddMeterForm";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getUserProfile } from "@/lib/actions/supabaseActions";
import SellMeters from "@/components/dashboard/SellMeters";
import CreateUser from "@/components/auth/CreateUser";
import localFont from "next/font/local";

const geistMono = localFont({
  src: "../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const items = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Sales", url: "/sales", icon: ShoppingCart },
  { title: "Reports", url: "/reports", icon: BarChart2 },
  { title: "Daily Reports", url: "/daily-reports", icon: Calendar, adminOnly: true },
  { title: "Users", url: "/users", icon: Users },
];

export function AppSidebar({ user }: { user: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [isAddMetersOpen, setIsAddMetersOpen] = useState(() => {
    return localStorage.getItem('addMetersSheetOpen') === 'true'
  });
  const [isSellMetersOpen, setIsSellMetersOpen] = useState(() => {
    return localStorage.getItem('sellMetersSheetOpen') === 'true'
  });

  // Save sheet states to localStorage
  useEffect(() => {
    localStorage.setItem('addMetersSheetOpen', isAddMetersOpen.toString());
  }, [isAddMetersOpen]);

  useEffect(() => {
    localStorage.setItem('sellMetersSheetOpen', isSellMetersOpen.toString());
  }, [isSellMetersOpen]);

  useEffect(() => {
    return () => {
      // Cleanup when component unmounts
      localStorage.removeItem('addMetersSheetOpen');
      localStorage.removeItem('sellMetersSheetOpen');
    };
  }, []);

  const isAdmin = userRole === "admin";

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.id) {
        const profile = await getUserProfile(user.id);
        if (profile) {
          setUserName(profile.name || "");
          setUserRole(profile.role || "");
        }
      }
    };
    fetchUserProfile();
  }, [user?.id]);

  return (
    <Sidebar className='mt-16 flex flex-col justify-between h-[calc(100vh-4rem)]'>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className='text-lg font-bold'>
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items
                .filter(item => !item.adminOnly || isAdmin)
                .map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
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
          <SidebarGroupLabel className='text-lg font-bold'>
            Actions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isAdmin && (
                <>
                  <SidebarMenuItem>
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                      <DialogTrigger asChild>
                        {/* <SidebarMenuButton>
                          <PlusCircle className='mr-2 h-4 w-4 text-indigo-600' />
                          <span>Invite User</span>
                        </SidebarMenuButton> */}
                      </DialogTrigger>
                      <DialogContent>
                        <InviteUser
                          currentUser={user}
                          onClose={() => setIsOpen(false)}
                        />
                      </DialogContent>
                    </Dialog>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <Dialog
                      open={isCreateUserOpen}
                      onOpenChange={setIsCreateUserOpen}>
                      <DialogTrigger asChild>
                        <SidebarMenuButton>
                          <Users className='mr-2 h-4 w-4 text-purple-600' />
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
                    <Sheet open={isAddMetersOpen} onOpenChange={setIsAddMetersOpen}>
                      <SheetTrigger asChild>
                        <SidebarMenuButton>
                          <PlusCircle className='mr-2 h-4 w-4 text-green-600' />
                          <span>Add Meters</span>
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
                        <AddMeterForm currentUser={user} />
                      </SheetContent>
                    </Sheet>
                  </SidebarMenuItem>
                </>
              )}
              <SidebarMenuItem>
                <Sheet open={isSellMetersOpen} onOpenChange={setIsSellMetersOpen}>
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className={`${geistMono.className} p-4 border-t border-gray-200`}>
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
