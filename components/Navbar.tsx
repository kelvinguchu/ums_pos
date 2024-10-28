import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { LogOut } from 'lucide-react';
import { signOut } from '@/lib/actions/supabaseActions';
import { useRouter } from 'next/navigation';

const Navbar: React.FC = () => {
  const router = useRouter();

    const handleLogout = async () => {
      await signOut();
      router.push("/login");
    };
  
  return (
    <nav className='bg-white shadow-md h-16 flex items-center px-4 fixed top-0 right-0 left-0 z-50'>
      <div className='flex justify-between items-center w-full'>
        <div className='flex items-center'>
          <Link href='/' className='text-xl font-bold text-gray-800'>
            <Image src='/logo.png' alt='UMS POS' width={70} height={70} />
          </Link>
        </div>
        <div className='flex items-center space-x-4'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className='bg-gradient-to-r from-red-500/20 to-orange-500/20 text-black rounded-full'
                  variant='outline'
                  onClick={handleLogout}>
                  <LogOut className=' h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Logout</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

