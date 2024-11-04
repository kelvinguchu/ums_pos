"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, X } from "lucide-react";
import localFont from "next/font/local";

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

interface AgentDeletionSheetProps {
  agent: any;
  inventory: any[];
  currentUser: any;
  onDelete: (
    scannedMeters: string[],
    unscannedMeters: string[]
  ) => Promise<void>;
  onClose: () => void;
}

export default function AgentDeletionSheet({
  agent,
  inventory,
  currentUser,
  onDelete,
  onClose,
}: AgentDeletionSheetProps) {
  const [serialNumber, setSerialNumber] = useState("");
  const [scannedMeters, setScannedMeters] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const serialInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (serialInputRef.current) {
      serialInputRef.current.focus();
    }
  }, []);

  const handleSerialNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSerialNumber(e.target.value.toUpperCase());
  };

  const handleScan = () => {
    const meter = inventory.find((m) => m.serial_number === serialNumber);
    if (!meter) {
      setErrorMessage("Serial number not found in agent's inventory");
      return;
    }

    if (scannedMeters.includes(serialNumber)) {
      setErrorMessage("Meter already scanned");
      return;
    }

    setScannedMeters([...scannedMeters, serialNumber]);
    setSerialNumber("");
    setErrorMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && serialNumber) {
      e.preventDefault();
      handleScan();
    }
  };

  const handleDelete = async (includeUnscanned: boolean) => {
    setIsDeleting(true);
    try {
      const unscannedMeters = includeUnscanned
        ? inventory
            .filter((m) => !scannedMeters.includes(m.serial_number))
            .map((m) => m.serial_number)
        : [];

      await onDelete(scannedMeters, unscannedMeters);
    } catch (error) {
      console.error("Error during deletion:", error);
      toast({
        title: "Error",
        description: "Failed to delete agent",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={`${geistMono.className} p-2 sm:p-4 flex flex-col h-full`}>
      <div className='mb-4 sm:mb-6'>
        <Badge
          variant='outline'
          className='w-full py-1 sm:py-2 flex justify-center text-sm sm:text-base bg-[#000080] text-white'>
          Scanning Meters for {agent.name}
        </Badge>
        <div className='mt-2 text-center text-xs sm:text-sm text-gray-500'>
          {scannedMeters.length} out of {inventory.length} meters scanned
        </div>
      </div>

      <div className='space-y-4'>
        <div className='relative'>
          <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            ref={serialInputRef}
            type='text'
            placeholder='Scan Serial Number'
            value={serialNumber}
            onChange={handleSerialNumberChange}
            onKeyPress={handleKeyPress}
            className='pl-8'
            autoFocus
          />
        </div>
        {errorMessage && (
          <p className='text-red-500 text-xs sm:text-sm'>{errorMessage}</p>
        )}
      </div>

      <div className='flex-1 overflow-auto mt-4 sm:mt-6'>
        <div className="overflow-auto max-w-[100vw] sm:max-w-full">
          <div className="min-w-[400px] sm:min-w-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((meter) => (
                  <TableRow key={meter.serial_number}>
                    <TableCell className='text-xs sm:text-sm'>
                      {meter.serial_number}
                    </TableCell>
                    <TableCell className='text-xs sm:text-sm'>
                      {meter.type}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className={
                          scannedMeters.includes(meter.serial_number)
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }>
                        {scannedMeters.includes(meter.serial_number)
                          ? "Scanned"
                          : "Pending"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <div className='mt-4 sm:mt-6 space-y-2'>
        {scannedMeters.length === inventory.length ? (
          <Button
            onClick={() => handleDelete(false)}
            className='w-full bg-red-600 hover:bg-red-700 text-sm sm:text-base py-2 sm:py-3'
            disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Deleting Agent...
              </>
            ) : (
              "Confirm Agent Deletion"
            )}
          </Button>
        ) : scannedMeters.length > 0 ? (
          <Button
            onClick={() => handleDelete(true)}
            className='w-full bg-yellow-600 hover:bg-yellow-700 text-sm sm:text-base py-2 sm:py-3'
            disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Deleting Agent...
              </>
            ) : (
              `Delete Agent Without ${
                inventory.length - scannedMeters.length
              } Meters`
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
