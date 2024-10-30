import React, { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { signOut, superSearchMeter } from "@/lib/actions/supabaseActions";
import { useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import AgentInventory from "@/components/dashboard/AgentInventory";
import localFont from "next/font/local";
import { useIsMobile } from "@/hooks/use-mobile";
import { SidebarTrigger } from "@/components/ui/sidebar";

const geistMono = localFont({
  src: "../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

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

  const handleLogout = async () => {
    await signOut();
    router.push("/signin");
  };

  useEffect(() => {
    const searchMeters = async () => {
      if (debouncedSearch.length < 0) {
        setSearchResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const results = await superSearchMeter(debouncedSearch);
        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    searchMeters();
  }, [debouncedSearch]);

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
          className={`${geistMono.className} flex-1 max-w-[70%] lg:max-w-[40%]`}
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
              className='pl-8 pr-8 w-full'
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
            <div className='absolute mt-1 w-[95%] lg:w-[45vw] mx-auto left-0 right-0 bg-white rounded-md border shadow-lg z-50'>
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
                        className='flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 hover:bg-gray-50 rounded-md gap-2'>
                        <div>
                          <div className='font-medium text-[#000080]'>
                            {result.serial_number}
                          </div>
                          {result.type && (
                            <div className='text-sm text-gray-500'>
                              Type: {result.type}
                            </div>
                          )}
                        </div>
                        <div className='flex flex-wrap items-center gap-2'>
                          {result.status === "with_agent" && (
                            <div className='flex flex-wrap items-center gap-2'>
                              <Badge className='bg-orange-500'>
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
                                View Agent Inventory
                              </Button>
                            </div>
                          )}
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
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isMobile && <SidebarTrigger />}
          {!isMobile && (
            <div className='flex-shrink-0'>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className='bg-gradient-to-r from-red-500/20 to-orange-500/20 text-black rounded-full'
                      variant='outline'
                      onClick={handleLogout}>
                      <LogOut className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Logout</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
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
