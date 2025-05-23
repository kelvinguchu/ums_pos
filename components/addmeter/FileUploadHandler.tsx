"use client";

import { memo } from "react";
import { Upload, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  checkMultipleSerialNumbers,
  checkMeterExistsInSoldMeters,
  checkMeterExistsInAgentInventory,
} from "@/lib/actions/supabaseActions";
import { processCSV, processExcel } from "@/lib/utils/fileProcessors";
import { Badge } from "@/components/ui/badge";
import localFont from "next/font/local";
import { useState } from "react";

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

interface FileUploadHandlerProps {
  onMetersAdd: (
    meters: Array<{
      serialNumber: string;
      type: string;
      addedBy: string;
      addedAt: string;
      adderName: string;
    }>
  ) => void;
  currentUser: {
    id: string;
    name: string;
  };
  currentMeters: Array<{
    serialNumber: string;
    type: string;
    addedBy: string;
    addedAt: string;
    adderName: string;
  }>;
}

export const FileUploadHandler = memo(function FileUploadHandler({
  onMetersAdd,
  currentUser,
  currentMeters,
}: FileUploadHandlerProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setIsProcessing(true);
    try {
      let newMeters: Array<{ serialNumber: string; type: string }>;

      if (file.name.endsWith(".csv")) {
        const text = await file.text();
        newMeters = processCSV(text);
      } else if (file.name.endsWith(".xlsx")) {
        const buffer = await file.arrayBuffer();
        newMeters = processExcel(buffer);
      } else {
        throw new Error("Unsupported file type");
      }

      if (newMeters.length === 0) {
        toast({
          title: "Error",
          description:
            "No valid meters found in file. Please check the format.",
          variant: "destructive",
        });
        return;
      }

      // Check for duplicates within the file itself
      const duplicatesInFile = newMeters.filter(
        (meter, index) =>
          newMeters.findIndex(
            (m) =>
              m.serialNumber.replace(/^0+/, "").toUpperCase() ===
              meter.serialNumber.replace(/^0+/, "").toUpperCase()
          ) !== index
      );

      if (duplicatesInFile.length > 0) {
        toast({
          title: "Error",
          description: `Found ${duplicatesInFile.length} duplicate serial numbers in the file. Please remove duplicates and try again.`,
          variant: "destructive",
        });
        return;
      }

      // Check for duplicates against current table
      const duplicatesInTable = newMeters.filter((meter) =>
        currentMeters.some(
          (existingMeter) =>
            existingMeter.serialNumber.replace(/^0+/, "").toUpperCase() ===
            meter.serialNumber.replace(/^0+/, "").toUpperCase()
        )
      );

      if (duplicatesInTable.length > 0) {
        toast({
          title: "Error",
          description: `Found ${
            duplicatesInTable.length
          } meters that are already in the table:\n${duplicatesInTable
            .slice(0, 3)
            .map((m) => m.serialNumber)
            .join("\n")}${duplicatesInTable.length > 3 ? "\n..." : ""}`,
          variant: "destructive",
        });
        return;
      }

      setProgress({ current: 0, total: newMeters.length });

      const errors: Array<{ serial: string; reason: string }> = [];
      const validMeters: Array<{
        serialNumber: string;
        type: string;
        addedBy: string;
        addedAt: string;
        adderName: string;
      }> = [];

      // Process in batches of 50
      const BATCH_SIZE = 50;
      for (let i = 0; i < newMeters.length; i += BATCH_SIZE) {
        const batch = newMeters.slice(i, i + BATCH_SIZE);
        const serialNumbers = batch.map((m) =>
          m.serialNumber.replace(/^0+/, "").toUpperCase()
        );

        // Check all existence conditions in parallel for the batch
        const [existingInDB, existingInSold, existingInAgent] =
          await Promise.all([
            checkMultipleSerialNumbers(serialNumbers),
            Promise.all(
              serialNumbers.map((s) => checkMeterExistsInSoldMeters(s))
            ),
            Promise.all(
              serialNumbers.map((s) => checkMeterExistsInAgentInventory(s))
            ),
          ]);

        // Process results for this batch
        batch.forEach((meter, idx) => {
          const normalizedSerial = meter.serialNumber
            .replace(/^0+/, "")
            .toUpperCase();

          if (existingInDB.includes(normalizedSerial)) {
            errors.push({
              serial: meter.serialNumber,
              reason: "Already exists in database",
            });
          } else if (existingInSold[idx]) {
            errors.push({
              serial: meter.serialNumber,
              reason: "Already exists in sold meters",
            });
          } else if (existingInAgent[idx]) {
            errors.push({
              serial: meter.serialNumber,
              reason: "Already exists in agent inventory",
            });
          } else {
            validMeters.push({
              serialNumber: normalizedSerial,
              type: meter.type,
              addedBy: currentUser.id,
              addedAt: new Date().toISOString(),
              adderName: currentUser.name,
            });
          }
        });

        // Update progress
        setProgress((prev) => ({
          ...prev,
          current: Math.min(i + BATCH_SIZE, newMeters.length),
        }));
      }

      // Show results
      if (errors.length > 0) {
        toast({
          title: "Warning",
          description: `${validMeters.length} meters added. ${
            errors.length
          } meters skipped:\n${errors
            .slice(0, 3)
            .map((e) => `${e.serial}: ${e.reason}`)
            .join("\n")}${errors.length > 3 ? "\n..." : ""}`,
          variant: "destructive",
        });
      }

      if (validMeters.length > 0) {
        onMetersAdd(validMeters);
        toast({
          title: "Success",
          description: `Added ${validMeters.length} new meters`,
          style: { backgroundColor: "#2ECC40", color: "white" },
        });
      }
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "Error",
        description: "Failed to process file. Please check the format.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleFileSelect = (type: "csv" | "xlsx") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = type === "csv" ? ".csv" : ".xlsx";

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
            className={`hover:bg-gray-100 flex items-center gap-1 cursor-pointer ${
              isProcessing ? "w-[200px]" : "w-[100px]"
            } justify-center`}>
            {isProcessing ? (
              <>
                <Loader2 className='h-3 w-3 animate-spin' />
                {progress.total > 0
                  ? `Processing ${progress.current}/${progress.total}`
                  : "Processing..."}
              </>
            ) : (
              <>
                <Upload className='h-3 w-3' />
                Upload
              </>
            )}
          </Badge>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className={geistMono.className}>
        <DropdownMenuItem onClick={() => handleFileSelect("csv")}>
          CSV File
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleFileSelect("xlsx")}>
          Excel File
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
