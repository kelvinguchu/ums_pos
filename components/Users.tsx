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

const geistMono = localFont({
  src: "../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newName, setNewName] = useState("");
  const { toast } = useToast();

  // Fetch users and current user on component mount
  useEffect(() => {
    const fetchData = async () => {
      const usersList = await getUsersList();
      const current = await getCurrentUser();
      const currentUserProfile = current ? await getUserProfile(current.id) : null;
      
      setUsers(usersList);
      setCurrentUser(currentUserProfile);
    };
    
    fetchData();
  }, []);

  const handleUpdateName = async () => {
    try {
      await updateUserProfile(editingUser.id, { name: newName });
      setUsers(users.map(user => 
        user.id === editingUser.id ? { ...user, name: newName } : user
      ));
      toast({
        title: "Success",
        description: "User name updated successfully",
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
      setUsers(users.map(u => 
        u.id === user.id ? { ...u, role: newRole } : u
      ));
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
      setUsers(users.map(u => 
        u.id === user.id ? { ...u, isActive: newStatus } : u
      ));
      toast({
        title: "Success",
        description: `User ${newStatus ? "activated" : "deactivated"} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUserProfile(userId);
      setUsers(users.filter(user => user.id !== userId));
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={`${geistMono.className} container w-[75vw]`}>
      <h1 className='text-3xl font-bold mb-6 text-center'>Users</h1>
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
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className='font-medium'>{user.name}</TableCell>
              <TableCell>
                <Badge
                  variant='outline'
                  className={`${
                    user.role === "admin" ? "bg-green-100" : "bg-yellow-100"
                  }`}>
                  {user.role}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant='outline'
                  className={user.isActive ? "bg-green-100" : "bg-red-100"}>
                  {user.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              {currentUser?.role === "admin" && (
                <TableCell>
                  {currentUser?.id !== user.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <Dialog>
                          <DialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Edit2 className="mr-2 h-4 w-4" />
                              Edit Name
                            </DropdownMenuItem>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit User Name</DialogTitle>
                            </DialogHeader>
                            <Input
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              placeholder="Enter new name"
                            />
                            <DialogFooter>
                              <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                              </DialogClose>
                              <Button onClick={handleUpdateName}>Save</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <DropdownMenuItem onClick={() => handleToggleRole(user)}>
                          {user.role === "admin" ? (
                            <>
                              <ShieldOff className="mr-2 h-4 w-4" />
                              Remove Admin
                            </>
                          ) : (
                            <>
                              <Shield className="mr-2 h-4 w-4" />
                              Make Admin
                            </>
                          )}
                        </DropdownMenuItem>

                        <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                          {user.isActive ? (
                            <>
                              <UserMinus className="mr-2 h-4 w-4" />
                              Deactivate User
                            </>
                          ) : (
                            <>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Activate User
                            </>
                          )}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              onSelect={(e) => e.preventDefault()}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the
                                user account and remove their data from our servers.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(user.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
  );
}
