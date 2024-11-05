"use client";

import { useState, useEffect } from "react";
import {
  getUsersList,
  getUserProfile,
  getCurrentUser,
  updateUserProfile,
  deleteUserProfile,
} from "@/lib/actions/supabaseActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  Edit2,
  Shield,
  ShieldOff,
  UserMinus,
  UserPlus,
  MoreVertical,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import localFont from "next/font/local";
import { Search } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newName, setNewName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { toast } = useToast();
  const [showDeactivated, setShowDeactivated] = useState(false);

  // Fetch users and current user on component mount
  useEffect(() => {
    const fetchData = async () => {
      const usersList = await getUsersList();
      const current = await getCurrentUser();
      const currentUserProfile = current
        ? await getUserProfile(current.id)
        : null;

      setUsers(usersList);
      setCurrentUser(currentUserProfile);
    };

    fetchData();
  }, []);

  const handleUpdateName = async () => {
    if (!editingUser || !newName.trim()) {
      toast({
        title: "Error",
        description: "Invalid user or name",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateUserProfile(editingUser.id, { name: newName });
      setUsers(
        users.map((user) =>
          user.id === editingUser.id ? { ...user, name: newName } : user
        )
      );
      toast({
        title: "Success",
        description: "User name updated successfully",
        style: { backgroundColor: "#2ECC40", color: "white" },
      });
      setEditingUser(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user name",
        variant: "destructive",
      });
    }
  };

  const handleToggleRole = async (user: any) => {
    try {
      const newRole = user.role === "admin" ? "user" : "admin";
      await updateUserProfile(user.id, { role: newRole });
      setUsers(
        users.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
      toast({
        title: "Success",
        description: `User role updated to ${newRole}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = async (user: any) => {
    try {
      const newStatus = !user.isActive;
      await updateUserProfile(user.id, { is_active: newStatus });
      setUsers(
        users.map((u) => (u.id === user.id ? { ...u, isActive: newStatus } : u))
      );
      toast({
        title: "Success",
        description: `User ${
          newStatus ? "activated" : "deactivated"
        } successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const filteredAndPaginatedUsers = () => {
    let filtered = users;
    if (!showDeactivated) {
      filtered = users.filter(user => user.isActive);
    }

    filtered = filtered.filter(
      (user) =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return {
      paginatedUsers: filtered.slice(startIndex, endIndex),
      totalPages: Math.ceil(filtered.length / itemsPerPage),
      totalUsers: filtered.length,
    };
  };

  return (
    <div className={`${geistMono.className} container w-full md:w-[75vw]`}>
      <h1 className='text-3xl font-bold mb-6 text-center'>Users</h1>

      <div className='mb-6 mt-4 space-y-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-2'>
            <Switch
              id="show-deactivated"
              checked={showDeactivated}
              onCheckedChange={setShowDeactivated}
            />
            <Label htmlFor="show-deactivated">Show deactivated users</Label>
          </div>
          <div className='text-sm text-muted-foreground font-medium'>
            Total: {filteredAndPaginatedUsers().totalUsers} users
          </div>
        </div>

        <div className='relative w-full md:w-72'>
          <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search users...'
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className='pl-8'
          />
        </div>
      </div>

      <div className='overflow-auto'>
        <div className='min-w-[300px]'>
          {/* Desktop View */}
          <div className='hidden md:block'>
            <Table className='w-full'>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-1/3'>Name</TableHead>
                  <TableHead className='w-1/3'>Role</TableHead>
                  <TableHead className='w-1/3'>Status</TableHead>
                  {currentUser?.role === "admin" && (
                    <TableHead className='w-1/4'>Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndPaginatedUsers().paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className='font-medium'>{user.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className={`${
                          user.role === "admin"
                            ? "bg-green-100"
                            : "bg-yellow-100"
                        }`}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className={
                          user.isActive ? "bg-green-100" : "bg-red-100"
                        }>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    {currentUser?.role === "admin" && (
                      <TableCell>
                        {currentUser?.id !== user.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant='ghost' size='sm'>
                                <MoreVertical className='h-4 w-4' />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end'>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <DropdownMenuItem 
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setEditingUser(user);
                                      setNewName(user.name);
                                    }}>
                                    <Edit2 className='mr-2 h-4 w-4' />
                                    Edit Name
                                  </DropdownMenuItem>
                                </DialogTrigger>
                                <DialogContent className={geistMono.className}>
                                  <DialogHeader>
                                    <DialogTitle>Edit User Name</DialogTitle>
                                  </DialogHeader>
                                  <Input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder='Enter new name'
                                  />
                                  <DialogFooter>
                                    <DialogClose asChild>
                                      <Button 
                                        variant='outline'
                                        onClick={() => {
                                          setEditingUser(null);
                                          setNewName("");
                                        }}>
                                        Cancel
                                      </Button>
                                    </DialogClose>
                                    <Button 
                                      onClick={() => {
                                        handleUpdateName();
                                        setNewName("");
                                      }}>
                                      Save
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>

                              <DropdownMenuItem
                                onClick={() => handleToggleRole(user)}>
                                {user.role === "admin" ? (
                                  <>
                                    <ShieldOff className='mr-2 h-4 w-4' />
                                    Remove Admin
                                  </>
                                ) : (
                                  <>
                                    <Shield className='mr-2 h-4 w-4' />
                                    Make Admin
                                  </>
                                )}
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(user)}>
                                {user.isActive ? (
                                  <>
                                    <UserMinus className='mr-2 h-4 w-4' />
                                    Deactivate User
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className='mr-2 h-4 w-4' />
                                    Activate User
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile View */}
          <div className='block md:hidden'>
            <Table className='w-full'>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  {currentUser?.role === "admin" ? (
                    <>
                      <TableHead>Role</TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndPaginatedUsers().paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className='font-medium'>{user.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className={`${
                          user.role === "admin"
                            ? "bg-green-100"
                            : "bg-yellow-100"
                        }`}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    {currentUser?.role === "admin" ? (
                      <TableCell className='text-right'>
                        {currentUser?.id !== user.id && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant='ghost' size='sm'>
                                <MoreVertical className='h-4 w-4' />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end'>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <DropdownMenuItem 
                                    onSelect={(e) => {
                                      e.preventDefault();
                                      setEditingUser(user);
                                      setNewName(user.name);
                                    }}>
                                    <Edit2 className='mr-2 h-4 w-4' />
                                    Edit Name
                                  </DropdownMenuItem>
                                </DialogTrigger>
                                <DialogContent className={geistMono.className}>
                                  <DialogHeader>
                                    <DialogTitle>Edit User Name</DialogTitle>
                                  </DialogHeader>
                                  <Input
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder='Enter new name'
                                  />
                                  <DialogFooter>
                                    <DialogClose asChild>
                                      <Button 
                                        variant='outline'
                                        onClick={() => {
                                          setEditingUser(null);
                                          setNewName("");
                                        }}>
                                        Cancel
                                      </Button>
                                    </DialogClose>
                                    <Button 
                                      onClick={() => {
                                        handleUpdateName();
                                        setNewName("");
                                      }}>
                                      Save
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>

                              <DropdownMenuItem
                                onClick={() => handleToggleRole(user)}>
                                {user.role === "admin" ? (
                                  <>
                                    <ShieldOff className='mr-2 h-4 w-4' />
                                    Remove Admin
                                  </>
                                ) : (
                                  <>
                                    <Shield className='mr-2 h-4 w-4' />
                                    Make Admin
                                  </>
                                )}
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(user)}>
                                {user.isActive ? (
                                  <>
                                    <UserMinus className='mr-2 h-4 w-4' />
                                    Deactivate User
                                  </>
                                ) : (
                                  <>
                                    <UserPlus className='mr-2 h-4 w-4' />
                                    Activate User
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    ) : (
                      <TableCell>
                        <Badge
                          variant='outline'
                          className={
                            user.isActive ? "bg-green-100" : "bg-red-100"
                          }>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {filteredAndPaginatedUsers().totalPages > 1 && (
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
                length: filteredAndPaginatedUsers().totalPages,
              }).map((_, i) => {
                const page = i + 1;
                if (
                  page === 1 ||
                  page === filteredAndPaginatedUsers().totalPages ||
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
                      Math.min(prev + 1, filteredAndPaginatedUsers().totalPages)
                    )
                  }
                  className={cn(
                    currentPage === filteredAndPaginatedUsers().totalPages &&
                      "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
