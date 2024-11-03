"use client";

import { memo } from 'react';
import { Button } from "@/components/ui/button";
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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
    
    event.target.value = '';
  };

  return (
    <div className="relative">
      <input
        type="file"
        accept=".csv,.xlsx"
        onChange={handleFileUpload}
        className="hidden"
        id="fileUpload"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full sm:w-auto">
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => {
            const input = document.getElementById('fileUpload') as HTMLInputElement;
            if (input) {
              input.accept = ".csv";
              input.click();
            }
          }}>
            CSV File
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {
            const input = document.getElementById('fileUpload') as HTMLInputElement;
            if (input) {
              input.accept = ".xlsx";
              input.click();
            }
          }}>
            Excel File
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}); 