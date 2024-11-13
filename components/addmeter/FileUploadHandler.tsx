"use client";

import { memo } from "react";
import { Upload } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { checkMultipleSerialNumbers } from "@/lib/actions/supabaseActions";
import { processCSV, processExcel } from "@/lib/utils/fileProcessors";
import { Badge } from "@/components/ui/badge";
import localFont from "next/font/local";


const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

interface FileUploadHandlerProps {
  onMetersAdd: (meters: Array<{
    serialNumber: string;
    type: string;
    addedBy: string;
    addedAt: string;
    adderName: string;
  }>) => void;
  currentUser: {
    id: string;
    name: string;
  };
}

export const FileUploadHandler = memo(function FileUploadHandler({
  onMetersAdd,
  currentUser
}: FileUploadHandlerProps) {
  const { toast } = useToast();
  
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    try {
      let newMeters: Array<{serialNumber: string; type: string}>;

      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        newMeters = processCSV(text);
      } else if (file.name.endsWith('.xlsx')) {
        const buffer = await file.arrayBuffer();
        newMeters = processExcel(buffer);
      } else {
        throw new Error('Unsupported file type');
      }
      
      if (newMeters.length === 0) {
        toast({
          title: "Error",
          description: "No valid meters found in file. Please check the format.",
          variant: "destructive",
        });
        return;
      }

      // Check for duplicates
      const serialsToCheck = newMeters.map(meter => meter.serialNumber);
      const existingInDatabase = await checkMultipleSerialNumbers(serialsToCheck);

      if (existingInDatabase.length > 0) {
        toast({
          title: "Info",
          description: `${existingInDatabase.length} meters already exist and were skipped.`,
          variant: "default",
        });
      }

      // Filter out duplicates and add new meters
      const uniqueNewMeters = newMeters
        .filter(meter => !existingInDatabase.includes(meter.serialNumber))
        .map(meter => ({
          serialNumber: meter.serialNumber,
          type: meter.type,
          addedBy: currentUser.id,
          addedAt: new Date().toISOString(),
          adderName: currentUser.name
        }));

      if (uniqueNewMeters.length > 0) {
        onMetersAdd(uniqueNewMeters);
        toast({
          title: "Success",
          description: `Added ${uniqueNewMeters.length} new meters`,
          style: { backgroundColor: '#2ECC40', color: 'white' },
        });
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Error",
        description: "Failed to process file. Please check the format.",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (type: 'csv' | 'xlsx') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'csv' ? '.csv' : '.xlsx';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    };
    
    input.click();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className='cursor-pointer'>
          <Badge
            variant='outline'
            className='hover:bg-gray-100 flex items-center gap-1 cursor-pointer w-[100px] justify-center'>
            <Upload className='h-3 w-3' />
            Upload
          </Badge>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className={geistMono.className}>
        <DropdownMenuItem onClick={() => handleFileSelect('csv')}>
          CSV File
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleFileSelect('xlsx')}>
          Excel File
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
