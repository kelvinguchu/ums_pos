"use client";

import { useState, useEffect } from "react";
import {
  getUserProfile,
  getCurrentUser,
  getAgentsList,
  updateAgentStatus,
  deleteAgent,
  getAgentInventory,
} from "@/lib/actions/supabaseActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  MoreVertical,
  Edit2,
  UserMinus,
  UserPlus,
  PhoneCall,
  MapPin,
  ClipboardList,
  DollarSign,
  Trash2,
  PlusCircle,
  Phone,
  Info,
  Users2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import localFont from "next/font/local";
import AgentInventory from "./AgentInventory";
import RecordAgentSale from "./RecordAgentSale";
import EditAgentDialog from "./EditAgentDialog";
import AssignMetersToAgent from "./AssignMetersToAgent";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import AgentDeletionSheet from "@/components/agents/AgentDeletionSheet";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const EmptyState = () => (
  <div className='flex flex-col items-center justify-center p-8 text-gray-500'>
    <div className="relative">
      <Users2 className='w-12 h-12 mb-4 text-gray-400' />
      <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#000080] opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-[#000080]"></span>
      </span>
    </div>
    <p className='text-sm font-medium'>No agents registered yet</p>
    <p className='text-xs text-gray-400 mt-1'>Add agents to start managing your team</p>
  </div>
);

export default function Agents() {
  const [agents, setAgents] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedAgent, setSelectedAgent] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssigningMeters, setIsAssigningMeters] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletionSheetOpen, setIsDeletionSheetOpen] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<any>(null);
  const [agentInventory, setAgentInventory] = useState<any[]>([]);
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { state } = useSidebar();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const current = await getCurrentUser();
        if (!current) {
          throw new Error("User not found");
        }
        const currentUserProfile = await getUserProfile(current.id);
        setCurrentUser({ ...current, ...currentUserProfile });

        const agentsList = await getAgentsList();
        setAgents(agentsList || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive",
        });
      }
    };

    fetchData();
  }, []);

  const handleToggleStatus = async (agent: any) => {
    try {
      await updateAgentStatus(agent.id, !agent.is_active);

      setAgents(
        agents.map((a) =>
          a.id === agent.id ? { ...a, is_active: !a.is_active } : a
        )
      );

      toast({
        title: "Success",
        description: `Agent ${
          agent.is_active ? "deactivated" : "activated"
        } successfully`,
        style: { backgroundColor: "#2ECC40", color: "white" },
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update agent status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = async (agent: any) => {
    try {
      const inventory = await getAgentInventory(agent.id);
      setAgentInventory(inventory || []);
      setAgentToDelete(agent);
      setIsDeleteDialogOpen(true);
    } catch (error) {
      console.error("Error checking agent inventory:", error);
      toast({
        title: "Error",
        description: "Failed to check agent inventory",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAgent = async (
    scannedMeters: string[] = [],
    unscannedMeters: string[] = []
  ) => {
    try {
      await deleteAgent(
        agentToDelete.id,
        currentUser,
        scannedMeters,
        unscannedMeters
      );
      setAgents(agents.filter((a) => a.id !== agentToDelete.id));

      toast({
        title: "Success",
        description: "Agent deleted successfully",
        style: { backgroundColor: "#2ECC40", color: "white" },
      });

      setIsDeleteDialogOpen(false);
      setIsDeletionSheetOpen(false);
      setAgentToDelete(null);
      setAgentInventory([]);
    } catch (error) {
      console.error("Error deleting agent:", error);
      toast({
        title: "Error",
        description: "Failed to delete agent",
        variant: "destructive",
      });
    }
  };

  const filteredAndPaginatedAgents = () => {
    const filtered = agents.filter(
      (agent) =>
        agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.phone_number.includes(searchTerm) ||
        agent.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      paginatedAgents: filtered.slice(startIndex, endIndex),
      totalPages: Math.ceil(filtered.length / itemsPerPage),
      totalAgents: filtered.length,
    };
  };

  return (
    <div className={`${geistMono.className} container w-full md:w-[75vw] `}>
      <div className='rounded-md border'>
        <div className='mb-4 mt-2 mx-2 md:mx-5 md:mb-6 md:mt-4 flex items-center justify-between'>
          <div className='relative w-1/2 md:w-72'>
            <Search className='absolute left-2 top-2.5 h-4 w-4 text-[#000080]' />
            <Input
              placeholder='Search agents...'
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className='pl-8 border-[#000] focus:ring-[#000080]'
            />
          </div>
          <div className='text-sm text-[#000080] font-medium'>
            Total: {filteredAndPaginatedAgents().totalAgents} agents
          </div>
        </div>

        {/* Desktop View */}
        <div className='hidden md:block'>
          <Table>
            <TableHeader>
              <TableRow className='bg-gray-50'>
                <TableHead className='font-semibold'>Name</TableHead>
                <TableHead className='font-semibold'>Contact</TableHead>
                <TableHead className='font-semibold'>Location</TableHead>
                <TableHead className='font-semibold'>Status</TableHead>
                <TableHead className='font-semibold'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndPaginatedAgents().paginatedAgents.length > 0 ? (
                filteredAndPaginatedAgents().paginatedAgents.map((agent) => (
                  <TableRow key={agent.id} className='hover:bg-gray-50'>
                    <TableCell className='font-medium'>{agent.name}</TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <PhoneCall className='h-4 w-4 text-[#000080]' />
                        {agent.phone_number}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <MapPin className='h-4 w-4 text-[#E46020]' />
                        {agent.location}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className={
                          agent.is_active
                            ? "bg-[#2ECC40] text-white"
                            : "bg-gray-500 text-white"
                        }>
                        {agent.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' className='h-8 w-8 p-0'>
                            <MoreVertical className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          {/* View Inventory - Available to all users */}
                          <Sheet>
                            <SheetTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}>
                                <ClipboardList className='mr-2 h-4 w-4 text-[#000080]' />
                                View Inventory
                              </DropdownMenuItem>
                            </SheetTrigger>
                            <SheetContent
                              className={`${geistMono.className} min-w-[50vw]`}>
                              <SheetHeader>
                                <SheetTitle className='text-center'>
                                  Agent Inventory - {agent.name}
                                </SheetTitle>
                              </SheetHeader>
                              <AgentInventory agentId={agent.id} />
                            </SheetContent>
                          </Sheet>

                          {/* Admin-only actions */}
                          {currentUser?.role === "admin" && (
                            <>
                              <DropdownMenuSeparator />

                              {/* Edit Agent */}
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setSelectedAgent(agent);
                                  setIsEditDialogOpen(true);
                                }}>
                                <Edit2 className='mr-2 h-4 w-4 text-[#000080]' />
                                Edit Agent
                              </DropdownMenuItem>

                              {/* Record Sale */}
                              <Drawer>
                                <DrawerTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setSelectedAgent(agent);
                                    }}>
                                    <DollarSign className='mr-2 h-4 w-4 text-[#E46020]' />
                                    Record Sale
                                  </DropdownMenuItem>
                                </DrawerTrigger>
                                <DrawerContent
                                  className={`${geistMono.className}`}>
                                  <DrawerHeader>
                                    <DrawerTitle>
                                      Record Sale - {agent.name}
                                    </DrawerTitle>
                                  </DrawerHeader>
                                  <RecordAgentSale
                                    agent={agent}
                                    currentUser={currentUser}
                                    onClose={() => setSelectedAgent(null)}
                                  />
                                </DrawerContent>
                              </Drawer>

                              {/* Assign Meters */}
                              <Sheet>
                                <SheetTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setSelectedAgent(agent);
                                      setIsAssigningMeters(true);
                                    }}>
                                    <PlusCircle className='mr-2 h-4 w-4 text-[#000080]' />
                                    Assign Meters
                                  </DropdownMenuItem>
                                </SheetTrigger>
                                <SheetContent
                                  className={`${geistMono.className} min-w-[50vw]`}>
                                  <SheetHeader>
                                    <SheetTitle className='flex items-center justify-center gap-2'>
                                      <Badge
                                        variant='outline'
                                        className='bg-[#000080] text-white px-4 py-2 text-sm'>
                                        Assigning Meters to {agent.name}
                                      </Badge>
                                    </SheetTitle>
                                  </SheetHeader>
                                  <AssignMetersToAgent
                                    currentUser={currentUser}
                                    preSelectedAgent={agent}
                                  />
                                </SheetContent>
                              </Sheet>

                              {/* Toggle Status */}
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(agent)}>
                                {agent.is_active ? (
                                  <>
                                    <UserMinus className='mr-2 h-4 w-4 text-red-500' />
                                    Deactivate Agent
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className='mr-2 h-4 w-4 text-[#2ECC40]' />
                                    Activate Agent
                                  </>
                                )}
                              </DropdownMenuItem>

                              {/* Delete Agent */}
                              <AlertDialog
                                open={isDeleteDialogOpen}
                                onOpenChange={setIsDeleteDialogOpen}>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    className='text-red-600'
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      handleDeleteClick(agent);
                                    }}>
                                    <Trash2 className='mr-2 h-4 w-4' />
                                    Delete Agent
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent
                                  className={`${geistMono.className} min-w-[700px]`}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Agent: {agentToDelete?.name}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {agentInventory.length > 0 ? (
                                        <>
                                          <p>
                                            This agent has{" "}
                                            {agentInventory.length} meters in
                                            their inventory.
                                          </p>
                                          <p className='mt-2'>
                                            Choose how to proceed:
                                          </p>
                                        </>
                                      ) : (
                                        <p>
                                          Are you sure you want to delete this
                                          agent? This action cannot be undone.
                                        </p>
                                      )}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    {agentInventory.length > 0 ? (
                                      <>
                                        <Button
                                          variant='destructive'
                                          onClick={() => {
                                            setIsDeleteDialogOpen(false);
                                            handleDeleteAgent();
                                          }}>
                                          Continue Delete Without Scan
                                        </Button>
                                        <Button
                                          onClick={() => {
                                            setIsDeleteDialogOpen(false);
                                            setIsDeletionSheetOpen(true);
                                          }}
                                          className='bg-[#000080] hover:bg-[#000066]'>
                                          Scan To Delete
                                        </Button>
                                      </>
                                    ) : (
                                      <AlertDialogAction
                                        onClick={() => handleDeleteAgent()}
                                        className='bg-red-600 hover:bg-red-700'>
                                        Delete
                                      </AlertDialogAction>
                                    )}
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5}>
                    <EmptyState />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <div className='block md:hidden'>
          <Table>
            <TableHeader>
              <TableRow className='bg-gray-50'>
                <TableHead className='font-semibold'>Name</TableHead>
                <TableHead className='font-semibold text-center'>
                  Details
                </TableHead>
                <TableHead className='font-semibold text-right'>
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndPaginatedAgents().paginatedAgents.length > 0 ? (
                filteredAndPaginatedAgents().paginatedAgents.map((agent) => (
                  <TableRow key={agent.id} className='hover:bg-gray-50'>
                    <TableCell>
                      <div className='font-medium'>{agent.name}</div>
                      <a
                        href={`tel:${agent.phone_number}`}
                        className='flex items-center gap-1 text-sm text-[#000080] mt-1'>
                        <Phone className='h-3 w-3' />
                        {agent.phone_number}
                      </a>
                    </TableCell>
                    <TableCell className='text-center'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='sm'>
                            <Info className='h-4 w-4 text-[#000080]' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end' className='w-56'>
                          <div className='p-2'>
                            <div className='mb-2'>
                              <span className='text-sm font-medium'>
                                Location:
                              </span>
                              <div className='flex items-center gap-2 mt-1'>
                                <MapPin className='h-4 w-4 text-[#E46020]' />
                                {agent.location}
                              </div>
                            </div>
                            <div>
                              <span className='text-sm font-medium'>
                                Status:
                              </span>
                              <div className='mt-1'>
                                <Badge
                                  variant='outline'
                                  className={
                                    agent.is_active
                                      ? "bg-[#2ECC40] text-white"
                                      : "bg-gray-500 text-white"
                                  }>
                                  {agent.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className='text-right'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' className='h-8 w-8 p-0'>
                            <MoreVertical className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          {/* View Inventory - Available to all users */}
                          <Sheet>
                            <SheetTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}>
                                <ClipboardList className='mr-2 h-4 w-4 text-[#000080]' />
                                View Inventory
                              </DropdownMenuItem>
                            </SheetTrigger>
                            <SheetContent
                              className={`${geistMono.className} min-w-[50vw]`}>
                              <SheetHeader>
                                <SheetTitle className='text-center'>
                                  Agent Inventory - {agent.name}
                                </SheetTitle>
                              </SheetHeader>
                              <AgentInventory agentId={agent.id} />
                            </SheetContent>
                          </Sheet>

                          {/* Admin-only actions */}
                          {currentUser?.role === "admin" && (
                            <>
                              <DropdownMenuSeparator />

                              {/* Edit Agent */}
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault();
                                  setSelectedAgent(agent);
                                  setIsEditDialogOpen(true);
                                }}>
                                <Edit2 className='mr-2 h-4 w-4 text-[#000080]' />
                                Edit Agent
                              </DropdownMenuItem>

                              {/* Record Sale */}
                              <Drawer>
                                <DrawerTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setSelectedAgent(agent);
                                    }}>
                                    <DollarSign className='mr-2 h-4 w-4 text-[#E46020]' />
                                    Record Sale
                                  </DropdownMenuItem>
                                </DrawerTrigger>
                                <DrawerContent
                                  className={`${geistMono.className}`}>
                                  <DrawerHeader>
                                    <DrawerTitle>
                                      Record Sale - {agent.name}
                                    </DrawerTitle>
                                  </DrawerHeader>
                                  <RecordAgentSale
                                    agent={agent}
                                    currentUser={currentUser}
                                    onClose={() => setSelectedAgent(null)}
                                  />
                                </DrawerContent>
                              </Drawer>

                              {/* Assign Meters */}
                              <Sheet>
                                <SheetTrigger asChild>
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setSelectedAgent(agent);
                                      setIsAssigningMeters(true);
                                    }}>
                                    <PlusCircle className='mr-2 h-4 w-4 text-[#000080]' />
                                    Assign Meters
                                  </DropdownMenuItem>
                                </SheetTrigger>
                                <SheetContent
                                  className={`${geistMono.className} min-w-[50vw]`}>
                                  <SheetHeader>
                                    <SheetTitle className='flex items-center justify-center gap-2'>
                                      <Badge
                                        variant='outline'
                                        className='bg-[#000080] text-white px-4 py-2 text-sm'>
                                        Assigning Meters to {agent.name}
                                      </Badge>
                                    </SheetTitle>
                                  </SheetHeader>
                                  <AssignMetersToAgent
                                    currentUser={currentUser}
                                    preSelectedAgent={agent}
                                  />
                                </SheetContent>
                              </Sheet>

                              {/* Toggle Status */}
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(agent)}>
                                {agent.is_active ? (
                                  <>
                                    <UserMinus className='mr-2 h-4 w-4 text-red-500' />
                                    Deactivate Agent
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className='mr-2 h-4 w-4 text-[#2ECC40]' />
                                    Activate Agent
                                  </>
                                )}
                              </DropdownMenuItem>

                              {/* Delete Agent */}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    className='text-red-600'
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      handleDeleteClick(agent);
                                    }}>
                                    <Trash2 className='mr-2 h-4 w-4' />
                                    Delete Agent
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent
                                  className={`${geistMono.className} w-[95%] sm:w-full sm:max-w-lg`}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>
                                      Delete Agent: {agentToDelete?.name}
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {agentInventory.length > 0 ? (
                                        <>
                                          <p>
                                            This agent has{" "}
                                            {agentInventory.length} meters in
                                            their inventory.
                                          </p>
                                          <p className='mt-2'>
                                            Choose how to proceed:
                                          </p>
                                        </>
                                      ) : (
                                        <p>
                                          Are you sure you want to delete this
                                          agent? This action cannot be undone.
                                        </p>
                                      )}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className='flex flex-col sm:flex-row gap-2'>
                                    <AlertDialogCancel className='mt-0'>
                                      Cancel
                                    </AlertDialogCancel>
                                    {agentInventory.length > 0 ? (
                                      <>
                                        <Button
                                          variant='destructive'
                                          onClick={() => {
                                            setIsDeleteDialogOpen(false);
                                            handleDeleteAgent();
                                          }}
                                          className='flex-1 sm:flex-none'>
                                          Continue Delete Without Scan
                                        </Button>
                                        <Button
                                          onClick={() => {
                                            setIsDeleteDialogOpen(false);
                                            setIsDeletionSheetOpen(true);
                                          }}
                                          className='bg-[#000080] hover:bg-[#000066] flex-1 sm:flex-none'>
                                          Scan To Delete
                                        </Button>
                                      </>
                                    ) : (
                                      <AlertDialogAction
                                        onClick={() => handleDeleteAgent()}
                                        className='bg-red-600 hover:bg-red-700'>
                                        Delete
                                      </AlertDialogAction>
                                    )}
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3}>
                    <EmptyState />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Edit Agent Dialog */}
        {selectedAgent && (
          <EditAgentDialog
            isOpen={isEditDialogOpen}
            onClose={() => {
              setIsEditDialogOpen(false);
              setSelectedAgent(null);
            }}
            onAgentUpdated={() => {
              const fetchAgents = async () => {
                const agentsList = await getAgentsList();
                setAgents(agentsList || []);
              };
              fetchAgents();
            }}
            agent={selectedAgent}
          />
        )}

        {/* Add the deletion sheet */}
        <Sheet open={isDeletionSheetOpen} onOpenChange={setIsDeletionSheetOpen}>
          <SheetContent
            side='right'
            className={`${geistMono.className} w-[90%] sm:min-w-[50vw]`}>
            <SheetHeader>
              <SheetTitle>Delete Agent</SheetTitle>
            </SheetHeader>
            <AgentDeletionSheet
              agent={agentToDelete}
              inventory={agentInventory}
              currentUser={currentUser}
              onDelete={handleDeleteAgent}
              onClose={() => setIsDeletionSheetOpen(false)}
            />
          </SheetContent>
        </Sheet>

        <div className='mt-4 flex justify-center'>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  className={cn(
                    currentPage === 1 && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>

              {Array.from({
                length: filteredAndPaginatedAgents().totalPages,
              }).map((_, i) => {
                const page = i + 1;
                if (
                  page === 1 ||
                  page === filteredAndPaginatedAgents().totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={page === currentPage}>
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                }
                if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }
                return null;
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(
                        prev + 1,
                        filteredAndPaginatedAgents().totalPages
                      )
                    )
                  }
                  className={cn(
                    currentPage === filteredAndPaginatedAgents().totalPages &&
                      "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
}
