"use client";

import { useState } from "react";
import { createUser } from "@/lib/actions/supabaseActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
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

export default function CreateUser({
  onClose,
}: {
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [emailPrefix, setEmailPrefix] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [isVisible, setIsVisible] = useState(false);
  const { toast } = useToast();

  const toggleVisibility = () => setIsVisible((prevState) => !prevState);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = `${emailPrefix}@gmail.com`;
    try {
      await createUser(email, password, role, name);

      toast({
        title: "Success",
        description: "User created successfully!",
        style: { backgroundColor: '#2ECC40', color: 'white' },
        action: (
          <ToastAction altText="Close" onClick={onClose}>Close</ToastAction>
        ),
      });
      setName("");
      setEmailPrefix("");
      setPassword("");
      setRole("user");
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to create user: ${error.message}`,
        variant: "destructive",
        style: { backgroundColor: '#FF4136', color: 'white' },
      });
    }
  };

  return (
    <div className='space-y-6 p-4'>
      <DialogHeader>
        <DialogTitle className='text-xl font-bold text-gray-800'>Create User</DialogTitle>
        <DialogDescription className='text-sm text-gray-600'>
          Create a new user account.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleCreate} className='space-y-4'>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            placeholder="First Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="flex rounded-lg shadow-sm shadow-black/[.04]">
            <Input
              id="email"
              className="-me-px rounded-e-none shadow-none"
              placeholder="email"
              type="text"
              value={emailPrefix}
              onChange={(e) => setEmailPrefix(e.target.value)}
              required
            />
            <span className="-z-10 inline-flex items-center rounded-e-lg border border-input bg-background px-3 text-sm text-muted-foreground">
              @gmail.com
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              className="pe-9 w-full border border-gray-300 rounded-md p-2"
              placeholder="Password"
              type={isVisible ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              className="absolute inset-y-px end-px flex h-full w-9 items-center justify-center rounded-e-lg text-muted-foreground/80 ring-offset-background transition-shadow hover:text-foreground focus-visible:border focus-visible:border-ring focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              onClick={toggleVisibility}
              aria-label={isVisible ? "Hide password" : "Show password"}
              aria-pressed={isVisible}
              aria-controls="password"
            >
              {isVisible ? (
                <EyeOff size={16} strokeWidth={2} aria-hidden="true" />
              ) : (
                <Eye size={16} strokeWidth={2} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
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
          Create User
        </Button>
      </form>
    </div>
  );
}
