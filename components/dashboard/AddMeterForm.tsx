"use client";

import { useState, useEffect } from "react";
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
      setMeters([]);
      toast({
        title: "Success",
        description: "Meters added successfully!",
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

  return (
    <div
      className={`${geistMono.className} bg-white shadow-md rounded-lg p-6 space-y-6 max-w-2xl mx-auto`}>
      <div className='flex justify-between items-center'>
        <h2 className='text-2xl font-bold mb-4 text-gray-800'>Add Meters</h2>
        <Button onClick={handleClearForm} variant='outline'>
          Clear Form
        </Button>
      </div>
      <div className='space-y-4'>
        <div className='flex space-x-4'>
          <Input
            type='text'
            placeholder='Serial Number'
            value={serialNumber.toUpperCase()}
            onChange={(e) => setSerialNumber(e.target.value)}
            required
            className='min-w-1/2'
          />
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
        <Button
          onClick={handleAddMeter}
          className='w-1/2 mx-auto bg-[#000080] hover:bg-[#000066] text-white'>
          Add Meter
        </Button>
      </div>
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
          Submit New Meter Entries
        </Button>
      )}
    </div>
  );
}
