import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  LogOut,
  Search,
  Check,
  DollarSign,
  User,
  Loader2,
  X,
  Menu,
  Edit2,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  signOut,
  superSearchMeter,
  changePassword,
} from "@/lib/actions/supabaseActions";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import AgentInventory from "@/components/agents/AgentInventory";
import localFont from "next/font/local";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { StockAlert } from "@/components/stock/StockAlert";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const geistMono = localFont({
  src: "../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Add type for cached results
interface CachedResult {
  timestamp: number;
  data: any;
}

// Add cache outside component to persist between renders
const searchCache: { [key: string]: CachedResult } = {};
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes

const Navbar: React.FC = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const [isInventorySheetOpen, setIsInventorySheetOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [selectedAgentName, setSelectedAgentName] = useState<string>("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();
  const { userRole, updateAuthState, user } = useAuth();
  const isAdmin = userRole === "admin";
  const queryClient = useQueryClient();
  const [showChangePasswordDialog, setShowChangePasswordDialog] =
    useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const { toast } = useToast();

  // Add function to check and clean cache
  const cleanCache = useMemo(() => {
    return () => {
      const now = Date.now();
      Object.keys(searchCache).forEach((key) => {
        if (now - searchCache[key].timestamp > CACHE_DURATION) {
          delete searchCache[key];
        }
      });
    };
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoading(true);

      // Clear all caches and storage first
      queryClient.clear();
      localStorage.clear();
      sessionStorage.clear();
      Object.keys(searchCache).forEach((key) => delete searchCache[key]);

      // Update auth context to prevent any authenticated actions
      updateAuthState({
        user: null,
        userRole: "",
        isAuthenticated: false,
        isLoading: false,
      });

      // Sign out from supabase
      await signOut();

      // Force a hard redirect to signin page
      window.location.href = "/signin";
    } catch (error) {
      console.error("Logout error:", error);
      // Even if there's an error, force redirect
      window.location.href = "/signin";
    } finally {
      setIsLoading(false);
    }
  };

  // Update the search function to use cache
  useEffect(() => {
    const searchMeters = async () => {
      if (debouncedSearch.length < 0) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);
      try {
        // Clean old cache entries
        cleanCache();

        // Check cache first
        const cachedResult = searchCache[debouncedSearch];
        if (
          cachedResult &&
          Date.now() - cachedResult.timestamp < CACHE_DURATION
        ) {
          setSearchResults(cachedResult.data);
          setIsLoading(false);
          return;
        }

        // If not in cache, fetch from API
        const results = await superSearchMeter(debouncedSearch);

        // Cache the results if meter is sold or with agent
        const shouldCache = results.some(
          (result) => result.status === "sold" || result.status === "with_agent"
        );

        if (shouldCache) {
          searchCache[debouncedSearch] = {
            timestamp: Date.now(),
            data: results,
          };
        }

        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    searchMeters();
  }, [debouncedSearch, cleanCache]);

  // Add cache cleanup on component unmount
  useEffect(() => {
    return () => {
      // Clean cache when component unmounts
      cleanCache();
    };
  }, [cleanCache]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleVisibility = () => setIsVisible((prev) => !prev);

  const handleChangePassword = async () => {
    if (!newPassword.trim() || !user?.id) {
      toast({
        title: "Error",
        description: "Password cannot be empty",
        variant: "destructive",
      });
      return;
    }

    try {
      await changePassword(user.id, newPassword);
      toast({
        title: "Success",
        description: "Password changed successfully. Please sign in again.",
        variant: "default",
      });

      // Clear any cached data
      queryClient.clear();

      // Redirect to signin page after a short delay
      setTimeout(() => {
        window.location.href = "/signin";
      }, 1500);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setShowChangePasswordDialog(false);
      setNewPassword("");
    }
  };

  return (
    <nav className='bg-white shadow-md h-16 flex items-center px-4 fixed top-0 right-0 left-0 z-50'>
      <div className='flex justify-between items-center w-full gap-4'>
        <div className='flex-shrink-0'>
          <Link href='/' className='text-xl font-bold text-gray-800'>
            <Image
              src='/logo.png'
              alt='UMS POS'
              width={70}
              height={70}
              className='w-[70px] h-[50px] lg:w-[70px] lg:h-[40px]'
            />
          </Link>
        </div>

        <div
          className={`${geistMono.className} relative flex-1 max-w-[70%] lg:max-w-[40%]`}
          ref={searchRef}>
          <div className='relative w-full'>
            <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              type='text'
              placeholder='Search Serial Number...'
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value.toUpperCase());
                setIsSearchOpen(true);
              }}
              className='pl-8 pr-8 w-full bg-gray-50/50 border-gray-200 focus:bg-white transition-colors'
              onFocus={() => setIsSearchOpen(true)}
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSearchResults([]);
                }}
                className='absolute right-2 top-2.5 text-gray-400 hover:text-gray-600'>
                <X className='h-4 w-4' />
              </button>
            )}
            {isLoading && !searchTerm && (
              <div className='absolute right-2 top-2.5'>
                <Loader2 className='h-4 w-4 animate-spin' />
              </div>
            )}
          </div>

          {searchTerm.length > 0 && (
            <div className='absolute mt-1 w-full bg-white rounded-md border shadow-lg z-50'>
              <div className='max-h-[60vh] lg:max-h-[400px] overflow-y-auto p-2'>
                {isLoading ? (
                  <div className='flex items-center justify-center py-4'>
                    <Loader2 className='h-6 w-6 animate-spin text-[#000080]' />
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className='text-center py-4 text-gray-500'>
                    No meters found
                  </div>
                ) : (
                  <div className='space-y-2'>
                    {searchResults.map((result) => (
                      <div
                        key={result.serial_number}
                        className='flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 hover:bg-gray-50 rounded-md gap-2 border-b last:border-0'>
                        <div>
                          <div className='font-medium text-[#000080] flex items-center gap-2'>
                            {result.serial_number}
                            {result.status === "in_stock" && (
                              <Badge className='bg-green-500'>
                                <Check className='mr-1 h-3 w-3' />
                                In Stock
                              </Badge>
                            )}
                            {result.status === "sold" && (
                              <Badge className='bg-blue-500'>
                                <DollarSign className='mr-1 h-3 w-3' />
                                Sold
                              </Badge>
                            )}
                          </div>
                          {result.type && (
                            <div className='text-sm text-gray-500 mt-1'>
                              Type: {result.type}
                            </div>
                          )}
                          {result.status === "sold" && result.sale_details && (
                            <div className='text-sm text-gray-500 space-y-1 mt-2'>
                              <div className='flex items-center gap-2'>
                                <User className='h-3 w-3' />
                                {result.sale_details.seller_name
                                  ? `${result.sale_details.seller_name} (${result.sale_details.seller_role})`
                                  : result.sale_details.sold_by}
                              </div>
                              <div>
                                Sold on:{" "}
                                {new Date(
                                  result.sale_details.sold_at
                                ).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </div>
                              <div>
                                Price: KES{" "}
                                {result.sale_details?.unit_price?.toLocaleString()}
                              </div>
                              <div className='flex items-center gap-1'>
                                To: {result.sale_details.recipient}
                                <span className='text-gray-400'>•</span>
                                {result.sale_details.destination}
                              </div>
                            </div>
                          )}
                        </div>
                        {result.status === "with_agent" && (
                          <div className='flex flex-col gap-2 sm:items-end mt-2 sm:mt-0'>
                            <Badge className='bg-orange-500 whitespace-nowrap'>
                              <User className='mr-1 h-3 w-3' />
                              With {result.agent.name}
                            </Badge>
                            <Button
                              variant='outline'
                              size='sm'
                              className='h-7 text-[#000080] hover:text-white hover:bg-[#000080] w-full sm:w-auto'
                              onClick={() => {
                                setSelectedAgentId(result.agent.id);
                                setSelectedAgentName(result.agent.name);
                                setIsInventoryOpen(true);
                              }}>
                              View Inventory
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className='flex items-center gap-4'>
          {!isMobile && (
            <>
              {isAdmin && <StockAlert />}
              <NotificationBell />

              {/* User Profile Button */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant='ghost'
                    className='relative flex items-center gap-2 rounded-full px-3 py-2 bg-gradient-to-r from-[#000080]/10 to-blue-500/10 hover:from-[#000080]/20 hover:to-blue-500/20 transition-all duration-200'>
                    <User className='h-4 w-4 text-[#000080]' />
                    <span className='text-sm font-medium text-[#000080]'>
                      {user?.name?.split(" ")[0]}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-80' align='end'>
                  <div className='flex flex-col space-y-4 p-2'>
                    <div className='flex flex-col space-y-1'>
                      <p className='text-sm font-medium'>{user?.name}</p>
                      <p className='text-xs text-gray-500'>{user?.email}</p>
                      <Badge
                        variant='outline'
                        className={`${
                          userRole === "admin"
                            ? "bg-green-100"
                            : userRole === "accountant"
                            ? "bg-purple-100"
                            : "bg-yellow-100"
                        } w-fit`}>
                        {userRole}
                      </Badge>
                    </div>

                    <Dialog
                      open={showChangePasswordDialog}
                      onOpenChange={setShowChangePasswordDialog}>
                      <DialogTrigger asChild>
                        <Button
                          variant='outline'
                          className='w-full justify-start'
                          onClick={() => {
                            setNewPassword("");
                          }}>
                          <Edit2 className='mr-2 h-4 w-4' />
                          Change Password
                        </Button>
                      </DialogTrigger>
                      <DialogContent className={geistMono.className}>
                        <DialogHeader>
                          <DialogTitle>Change Password</DialogTitle>
                        </DialogHeader>
                        <div className='relative'>
                          <Input
                            id='new-password'
                            className='pe-9'
                            placeholder='Enter new password'
                            type={isVisible ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                          />
                          <button
                            className='absolute inset-y-px end-px flex h-full w-9 items-center justify-center rounded-e-lg text-muted-foreground/80'
                            type='button'
                            onClick={toggleVisibility}>
                            {isVisible ? (
                              <EyeOff size={16} strokeWidth={2} />
                            ) : (
                              <Eye size={16} strokeWidth={2} />
                            )}
                          </button>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant='outline'>Cancel</Button>
                          </DialogClose>
                          <Button onClick={handleChangePassword}>
                            Change Password
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant='outline'
                      className='w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50'
                      onClick={handleLogout}>
                      <LogOut className='mr-2 h-4 w-4' />
                      Logout
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </>
          )}
          {isMobile && <SidebarTrigger />}
        </div>

        <Sheet open={isInventoryOpen} onOpenChange={setIsInventoryOpen}>
          <SheetContent className={`${geistMono.className} min-w-[40vw]`}>
            <SheetHeader>
              <SheetTitle className='text-[#000080] text-center'>
                Agent Inventory - {selectedAgentName}
              </SheetTitle>
            </SheetHeader>
            {selectedAgentId && <AgentInventory agentId={selectedAgentId} />}
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

export default Navbar;
