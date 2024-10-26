import {
  getUsersList,
  getUserProfile,
  getCurrentUser,
} from "@/lib/actions/supabaseActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import localFont from "next/font/local";

const geistMono = localFont({
  src: "../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export default async function UsersPage() {
  const users = await getUsersList();
  const currentUser = await getCurrentUser();
  const currentUserProfile = currentUser
    ? await getUserProfile(currentUser.id)
    : null;


  return (
    <div className={`${geistMono.className} container w-[75vw]`}>
      <h1 className='text-3xl font-bold mb-6 text-center'>Users</h1>
      <Table className='w-full'>
        <TableHeader>
          <TableRow>
            <TableHead className='w-1/4'>Name</TableHead>
            <TableHead className='w-1/4'>Role</TableHead>
            <TableHead className='w-1/4'>Status</TableHead>
            <TableHead className='w-1/4'>Actions</TableHead>
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
              <TableCell>
                {currentUserProfile?.role === "admin" ? (
                  <Button
                    variant='ghost'
                    size='sm'
                    className='text-red-500 hover:text-red-700'
                    onClick={() => {
                      /* Add delete functionality here */
                    }}>
                    <Trash2 className='h-4 w-4' />
                  </Button>
                ) : (
                  "N/A"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
