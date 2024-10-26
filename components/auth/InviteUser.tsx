"use client";

import { useState } from "react";
import { inviteUser } from "@/lib/actions/supabaseActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

export default function InviteUser({
  currentUser,
  onClose,
}: {
  currentUser: any;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const { toast } = useToast();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await inviteUser(email, role, currentUser.id);
      toast({
        title: "Success",
        description: "Invitation sent successfully!",
        style: { backgroundColor: '#2ECC40', color: 'white' },
        action: (
          <ToastAction altText="Close" onClick={onClose}>Close</ToastAction>
        ),
      });
      setEmail("");
      setRole("user");
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to send invitation: ${error.message}`,
        variant: "destructive",
        style: { backgroundColor: '#FF4136', color: 'white' },
      });
    }
  };

  return (
    <div className='space-y-6 p-4'>
      <DialogHeader>
        <DialogTitle className='text-xl font-bold text-gray-800'>Invite User</DialogTitle>
        <DialogDescription className='text-sm text-gray-600'>
          Send an invitation to a new user.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleInvite} className='space-y-4'>
        <Input
          type='email'
          placeholder='Email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className='w-full border border-gray-300 rounded-md p-2'
        />
        <Select value={role} onChange={(e) => setRole(e.target.value)}>
          <SelectTrigger className='w-full border border-gray-300 rounded-md p-2'>
            <SelectValue>{role === "user" ? "User" : "Admin"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='user'>User</SelectItem>
            <SelectItem value='admin'>Admin</SelectItem>
          </SelectContent>
        </Select>
        <Button type='submit' className='w-full bg-[#000080] hover:bg-[#000061] text-white'>
          Send Invitation
        </Button>
      </form>
    </div>
  );
}
