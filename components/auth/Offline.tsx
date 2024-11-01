import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WifiOff } from "lucide-react";
import localFont from "next/font/local";

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const Offline = () => {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className={`${geistMono.className} flex min-h-screen flex-col items-center justify-center bg-background p-4`}>
      <Image src='/logo.png' alt='logo' width={100} height={100} className='mb-6' />
      <Card className='w-[90%] max-w-[500px] shadow-lg'>
        <CardHeader>
          <CardTitle className='text-center text-2xl font-bold text-[#000080]'>
            You are offline
          </CardTitle>
        </CardHeader>
        <CardContent className='text-center space-y-4'>
          <div className='flex justify-center'>
            <WifiOff className='h-12 w-12 text-[#000080] opacity-75' />
          </div>
          <p className='text-lg text-gray-700'>
            Please check your internet connection
          </p>
          <p className='text-sm text-gray-500'>
            The app requires an internet connection to function properly
          </p>
          <Button 
            onClick={handleRetry}
            className='bg-[#000080] hover:bg-[#000061] mt-4'
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Offline;
