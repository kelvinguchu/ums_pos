"use client";

import { useState, useEffect, useRef } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { addMeters, getUserProfile, checkMeterExists } from "@/lib/actions/supabaseActions";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import localFont from "next/font/local";
import { X } from "lucide-react";
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import MeterAdditionReceipt from './MeterAdditionReceipt';

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const meterTypes = ["Split", "Integrated", "Gas", "Water"];

export default function AddMeterForm({ currentUser }: { currentUser: any }) {
  const [meters, setMeters] = useState<Array<{serialNumber: string; type: string; addedBy: string; addedAt: string}>>(() => {
    const cachedMeters = localStorage.getItem('cachedAddMeters');
    return cachedMeters ? JSON.parse(cachedMeters) : [];
  });
  const [serialNumber, setSerialNumber] = useState("");
  const [type, setType] = useState(meterTypes[0]);
  const [adderName, setAdderName] = useState("");
  const { toast } = useToast();
  const serialNumberInputRef = useRef<HTMLInputElement>(null);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [autoMeterType, setAutoMeterType] = useState(meterTypes[0]);
  const [isSubmitted, setIsSubmitted] = useState(() => {
    return localStorage.getItem('lastSubmittedMeters') !== null;
  });
  const [isChecking, setIsChecking] = useState(false);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const profile = await getUserProfile(currentUser.id);
      setAdderName(profile?.name || "");
    };
    fetchUserProfile();
  }, [currentUser.id]);

  useEffect(() => {
    localStorage.setItem('cachedAddMeters', JSON.stringify(meters));
  }, [meters]);

  useEffect(() => {
    if (serialNumberInputRef.current) {
      serialNumberInputRef.current.focus();
    }
  }, []);

  // Add this new effect to handle automatic addition when in auto mode
  useEffect(() => {
    if (isAutoMode && serialNumber.trim()) {
      handleAutoAddMeter();
    }
  }, [serialNumber, isAutoMode]);

  // Add this effect to maintain focus when auto mode is active
  useEffect(() => {
    if (isAutoMode && serialNumberInputRef.current) {
      serialNumberInputRef.current.focus();
    }
  }, [isAutoMode, meters]); // Re-run when meters array changes or auto mode toggles

  // Add this new effect for real-time validation
  useEffect(() => {
    const checkSerialNumber = async () => {
      if (serialNumber.trim()) {
        setIsChecking(true);
        try {
          const exists = await checkMeterExists(serialNumber);
          setExists(exists);
        } catch (error) {
          console.error("Error checking serial number:", error);
        } finally {
          setIsChecking(false);
        }
      } else {
        setExists(false);
      }
    };

    // Add debounce to prevent too many API calls
    const timeoutId = setTimeout(checkSerialNumber, 300);
    return () => clearTimeout(timeoutId);
  }, [serialNumber]);

  const handleAddMeter = async () => {
    if (!serialNumber.trim()) {
      toast({
        title: "Error",
        description: "Serial number cannot be empty",
        variant: "destructive",
        style: { backgroundColor: '#FF4136', color: 'white' },
      });
      return;
    }

    try {
      const exists = await checkMeterExists(serialNumber);
      if (exists) {
        toast({
          title: "Error",
          description: "Seems like the serial number already exists",
          variant: "destructive",
          style: { backgroundColor: '#FF851B', color: 'white' },
        });
        return;
      }

      setMeters([{ 
        serialNumber, 
        type, 
        addedBy: currentUser.id, 
        addedAt: new Date().toISOString() 
      }, ...meters]);
      setSerialNumber("");
      setType(meterTypes[0]);

      toast({
        title: "Success",
        description: "Meter added to the list",
        style: { backgroundColor: '#2ECC40', color: 'white' },
      });

      if (serialNumberInputRef.current) {
        serialNumberInputRef.current.focus();
      }
    } catch (error) {
      console.error("Error checking meter existence:", error);
      toast({
        title: "Error",
        description: "Failed to add meter. Please try again.",
        variant: "destructive",
        style: { backgroundColor: '#FF4136', color: 'white' },
      });
    }
  };

  const handleRemoveMeter = (index: number) => {
    setMeters(meters.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    try {
      const metersToSubmit = meters.map(meter => ({
        serial_number: meter.serialNumber,
        type: meter.type.toLowerCase(),
        added_by: meter.addedBy,
        added_at: meter.addedAt,
        adder_name: adderName
      }));
      
      await addMeters(metersToSubmit);
      
      // Store the submitted meters for the receipt
      localStorage.setItem('lastSubmittedMeters', JSON.stringify(meters));
      setIsSubmitted(true);
      
      // Clear the current meters list
      setMeters([]);
      localStorage.removeItem('cachedAddMeters');
      
      toast({
        title: "Success",
        description: "Meters added successfully! You can now download the receipt.",
        style: { backgroundColor: '#0074D9', color: 'white' },
        action: (
          <ToastAction altText="Close">Close</ToastAction>
        ),
      });
    } catch (error) {
      console.error("Error adding meters:", error);
      toast({
        title: "Error",
        description: "Failed to add meters. Please try again.",
        variant: "destructive",
        style: { backgroundColor: '#FF4136', color: 'white' },
        action: (
          <ToastAction altText="Try again">Try again</ToastAction>
        ),
      });
    }
  };

  const handleClearForm = () => {
    setMeters([]);
    setSerialNumber("");
    setType(meterTypes[0]);
    localStorage.removeItem('cachedAddMeters');
  };

  const handleAutoAddMeter = async () => {
    try {
      const exists = await checkMeterExists(serialNumber);
      if (exists) {
        toast({
          title: "Error",
          description: "Serial number already exists",
          variant: "destructive",
          style: { backgroundColor: '#FF851B', color: 'white' },
        });
        setSerialNumber("");
        // Ensure focus after error
        serialNumberInputRef.current?.focus();
        return;
      }

      setMeters([{ 
        serialNumber, 
        type: autoMeterType, 
        addedBy: currentUser.id, 
        addedAt: new Date().toISOString() 
      }, ...meters]);
      setSerialNumber("");

      toast({
        title: "Success",
        description: "Meter added to the list",
        style: { backgroundColor: '#2ECC40', color: 'white' },
      });
      
      // Ensure focus after successful addition
      serialNumberInputRef.current?.focus();
    } catch (error) {
      console.error("Error checking meter existence:", error);
      toast({
        title: "Error",
        description: "Failed to add meter. Please try again.",
        variant: "destructive",
        style: { backgroundColor: '#FF4136', color: 'white' },
      });
      // Ensure focus after error
      serialNumberInputRef.current?.focus();
    }
  };

  const generateMeterCounts = () => {
    const counts: { [key: string]: number } = {};
    meters.forEach(meter => {
      counts[meter.type] = (counts[meter.type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({
      type,
      count
    }));
  };

  const handleDownloadReceipt = async () => {
    try {
      const lastSubmittedMeters = JSON.parse(localStorage.getItem('lastSubmittedMeters') || '[]');
      
      const blob = await pdf(
        <MeterAdditionReceipt
          meterCounts={generateMeterCountsFromMeters(lastSubmittedMeters)}
          adderName={adderName}
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `meter-addition-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Clear the submitted meters after download
      localStorage.removeItem('lastSubmittedMeters');
      setIsSubmitted(false);
      
      toast({
        title: "Success",
        description: "Receipt downloaded successfully!",
        style: { backgroundColor: '#2ECC40', color: 'white' },
      });
    } catch (error) {
      console.error("Error downloading receipt:", error);
      toast({
        title: "Error",
        description: "Failed to download receipt. Please try again.",
        variant: "destructive",
        style: { backgroundColor: '#FF4136', color: 'white' },
      });
    }
  };

  const generateMeterCountsFromMeters = (metersArray: any[]) => {
    const counts: { [key: string]: number } = {};
    metersArray.forEach((meter: any) => {
      counts[meter.type] = (counts[meter.type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({
      type,
      count
    }));
  };

  return (
    <div
      className={`${geistMono.className} bg-white shadow-md rounded-lg p-6 space-y-6 max-w-2xl mx-auto`}>
      <div className='flex justify-between items-center'>
        <h2 className='text-2xl font-bold mb-4 text-gray-800'>Add Meters</h2>
        <div className="space-x-2">
          <Button 
            onClick={() => setIsAutoMode(!isAutoMode)} 
            variant={isAutoMode ? 'default' : 'outline'}
            className={isAutoMode ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {isAutoMode ? 'Auto Mode Active' : 'Activate Auto Mode'}
          </Button>
          <Button onClick={handleClearForm} variant='outline'>
            Clear Form
          </Button>
        </div>
      </div>

      {isAutoMode ? (
        <div className='space-y-4'>
          <div className='flex flex-col space-y-2'>
            <div className='flex space-x-4'>
              <div className="flex-1">
                <Input
                  type='text'
                  placeholder='Scan Serial Number'
                  value={serialNumber.toUpperCase()}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  required
                  className={`min-w-1/2 ${exists ? 'border-red-500 focus:ring-red-500' : ''}`}
                  ref={serialNumberInputRef}
                  autoFocus
                />
                {serialNumber.trim() && (
                  <div className="mt-1">
                    {isChecking ? (
                      <p className="text-sm text-gray-500">Checking serial number...</p>
                    ) : exists ? (
                      <p className="text-sm text-red-500 font-medium">
                        Serial Number Already Exists In The Database
                      </p>
                    ) : (
                      <p className="text-sm text-green-500">Serial number is available</p>
                    )}
                  </div>
                )}
              </div>
              <Select value={autoMeterType} onChange={(e) => setAutoMeterType(e.target.value)}>
                <SelectTrigger className='min-w-1/2 shadow-md'>
                  <SelectValue>{autoMeterType}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {meterTypes.map((meterType) => (
                    <SelectItem key={meterType} value={meterType}>
                      {meterType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Auto mode: Meters will be automatically added with type "{autoMeterType}" when scanned
          </p>
        </div>
      ) : (
        // Existing manual input form
        <div className='space-y-4'>
          <div className='flex flex-col space-y-2'>
            <div className='flex space-x-4'>
              <div className="flex-1">
                <Input
                  type='text'
                  placeholder='Serial Number'
                  value={serialNumber.toUpperCase()}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  required
                  className={`min-w-1/2 ${exists ? 'border-red-500 focus:ring-red-500' : ''}`}
                  ref={serialNumberInputRef}
                />
                {serialNumber.trim() && (
                  <div className="mt-1">
                    {isChecking ? (
                      <p className="text-sm text-gray-500">Checking serial number...</p>
                    ) : exists ? (
                      <p className="text-sm text-red-500 font-medium">
                        Serial Number Already Exists In The Database
                      </p>
                    ) : (
                      <p className="text-sm text-green-500">Serial number is available</p>
                    )}
                  </div>
                )}
              </div>
              <Select value={type} onChange={(e) => setType(e.target.value)}>
                <SelectTrigger className='min-w-1/2 shadow-md'>
                  <SelectValue>{type}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {meterTypes.map((meterType) => (
                    <SelectItem key={meterType} value={meterType}>
                      {meterType.charAt(0).toUpperCase() + meterType.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleAddMeter}
            className='w-1/2 mx-auto bg-[#000080] hover:bg-[#000066] text-white'>
            Add Meter
          </Button>
        </div>
      )}

      {meters.length > 0 && (
        <div className='mt-6'>
          <h3 className='text-lg font-semibold mb-2 text-gray-700'>
            Added Meters
          </h3>
          <div className='max-h-60 overflow-y-auto border border-gray-200 rounded-md'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='bg-gray-50'>Serial Number</TableHead>
                  <TableHead className='bg-gray-50'>Type</TableHead>
                  <TableHead className='bg-gray-50'>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {meters.map((meter, index) => (
                  <TableRow
                    key={index}
                    className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <TableCell>{meter.serialNumber}</TableCell>
                    <TableCell>
                      {meter.type.charAt(0).toUpperCase() + meter.type.slice(1)}
                    </TableCell>
                    <TableCell>
                      <Button
                        onClick={() => handleRemoveMeter(index)}
                        variant='ghost'
                        size='sm'>
                        <X className='h-4 w-4' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      {meters.length > 0 && (
        <Button
          onClick={handleSubmit}
          className='w-1/2 mx-auto mt-4 bg-[#E46020] hover:bg-[#e46120] text-white'>
          Submit Meters
        </Button>
      )}
      {isSubmitted && (
        <Button
          onClick={handleDownloadReceipt}
          className='w-1/2 mx-auto mt-4 bg-[#2ECC40] hover:bg-[#28a035] text-white'>
          Download Receipt
        </Button>
      )}
    </div>
  );
}
