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
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  getMeterBySerial,
  removeMeter,
  addSoldMeter,
  addSaleBatch,
  getUserProfile,
} from "@/lib/actions/supabaseActions";
import localFont from "next/font/local";
import { X } from "lucide-react";

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export default function SellMeters({ currentUser }: { currentUser: any }) {
  const [serialNumber, setSerialNumber] = useState("");
  const [meters, setMeters] = useState<
    Array<{ id: string; serialNumber: string; type: string }>
  >(() => {
    const cachedMeters = localStorage.getItem('cachedSellMeters');
    return cachedMeters ? JSON.parse(cachedMeters) : [];
  });
  const [destination, setDestination] = useState(() => localStorage.getItem('cachedDestination') || "");
  const [recipient, setRecipient] = useState(() => localStorage.getItem('cachedRecipient') || "");
  const [unitPrice, setUnitPrice] = useState(() => localStorage.getItem('cachedUnitPrice') || "");
  const [errorMessage, setErrorMessage] = useState("Input Serial Number");
  const [userName, setUserName] = useState("");
  const { toast } = useToast();
  const serialInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (serialInputRef.current) {
      serialInputRef.current.focus();
    }
    
    const fetchUserProfile = async () => {
      if (currentUser?.id) {
        const profile = await getUserProfile(currentUser.id);
        if (profile?.name) {
          setUserName(profile.name);
        }
      }
    };
    fetchUserProfile();
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('cachedSellMeters', JSON.stringify(meters));
    localStorage.setItem('cachedDestination', destination);
    localStorage.setItem('cachedRecipient', recipient);
    localStorage.setItem('cachedUnitPrice', unitPrice);
  }, [meters, destination, recipient, unitPrice]);

  const handleSerialNumberChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setSerialNumber(value);

    if (!value.trim()) {
      setErrorMessage("Input Serial Number");
      return;
    }

    try {
      const meter = await getMeterBySerial(value);
      if (!meter) {
        setErrorMessage("Meter not found");
        return;
      }

      if (meters.length > 0 && meter.type !== meters[0].type) {
        toast({
          title: "Error",
          description: "All meters must be of the same type.",
          variant: "destructive",
          style: { backgroundColor: "#FF4136", color: "white" },
        });
        return;
      }

      setMeters([
        {
          id: meter.id,
          serialNumber: meter.serial_number,
          type: meter.type,
        },
        ...meters
      ]);
      setSerialNumber("");
      setErrorMessage("");

      toast({
        title: "Success",
        description: "Meter added to the list",
        style: { backgroundColor: "#2ECC40", color: "white" },
      });
    } catch (error) {
      console.error("Error retrieving meter:", error);
      setErrorMessage("Failed to retrieve meter. Please try again.");
    }
  };

  const handleRemoveMeter = (index: number) => {
    setMeters(meters.filter((_, i) => i !== index));
  };

  const handleSellMeters = async () => {
    if (!destination.trim() || !recipient.trim() || !unitPrice.trim()) {
      setErrorMessage("Destination, recipient, and unit price cannot be empty");
      return;
    }

    if (meters.length === 0) {
      setErrorMessage("No meters to sell");
      return;
    }

    if (!userName) {
      setErrorMessage("User name not available");
      return;
    }

    try {
      const meterType = meters[0].type;
      const batchAmount = meters.length;
      const totalPrice = parseFloat(unitPrice) * batchAmount;

      // Add sale batch
      await addSaleBatch({
        user_id: currentUser.id,
        user_name: userName,
        meter_type: meterType,
        batch_amount: batchAmount,
        unit_price: parseFloat(unitPrice),
        total_price: totalPrice,
        destination,
        recipient,
      });

      // Remove meters and add to sold_meters
      for (const meter of meters) {
        await removeMeter(meter.id);
        await addSoldMeter({
          meter_id: meter.id,
          sold_by: currentUser.id,
          sold_at: new Date().toISOString(),
          destination,
          recipient,
          serial_number: meter.serialNumber,
          unit_price: parseFloat(unitPrice),
        });
      }

      setMeters([]);
      setDestination("");
      setRecipient("");
      setUnitPrice("");
      toast({
        title: "Success",
        description: "Meters sold successfully!",
        style: { backgroundColor: "#0074D9", color: "white" },
        action: <ToastAction altText='Close'>Close</ToastAction>,
      });
    } catch (error) {
      console.error("Error selling meters:", error);
      toast({
        title: "Error",
        description: "Failed to sell meters. Please try again.",
        variant: "destructive",
        style: { backgroundColor: "#FF4136", color: "white" },
        action: <ToastAction altText='Try again'>Try again</ToastAction>,
      });
    }
  };

  const handleClearForm = () => {
    setMeters([]);
    setDestination("");
    setRecipient("");
    setUnitPrice("");
    setSerialNumber("");
    localStorage.removeItem('cachedSellMeters');
    localStorage.removeItem('cachedDestination');
    localStorage.removeItem('cachedRecipient');
    localStorage.removeItem('cachedUnitPrice');
  };

  return (
    <div
      className={`${geistMono.className} bg-white shadow-md rounded-lg p-6 space-y-6 max-w-2xl mx-auto`}>
      <div className="flex justify-between items-center">
        <h2 className='text-2xl font-bold mb-4 text-gray-800'>Sell Meters</h2>
        <Button onClick={handleClearForm} variant="outline">Clear Form</Button>
      </div>
      <div className='space-y-4'>
        <Input
          ref={serialInputRef}
          type='text'
          placeholder='Serial Number'
          value={serialNumber.toUpperCase()}
          onChange={handleSerialNumberChange}
          required
          className='w-full'
        />
        {errorMessage && <p className='text-red-500'>{errorMessage}</p>}
      </div>
      {meters.length > 0 && (
        <>
          <div className='space-x-4 mt-4 flex justify-center'>
            <Input
              type='text'
              placeholder='Destination'
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              required
              className='w-1/3'
            />
            <Input
              type='text'
              placeholder='Recipient'
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
              className='w-1/3'
            />
            <Input
              type='number'
              placeholder='Unit Price'
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              required
              className='w-1/3'
            />
          </div>
          <div className='mt-6'>
            <h3 className='text-lg font-semibold mb-2 text-gray-700'>
              Meters to Sell
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
                      <TableCell>{meter.type}</TableCell>
                      <TableCell>
                        <Button
                          onClick={() => handleRemoveMeter(index)}
                          variant="ghost"
                          size="sm"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <Button
            onClick={handleSellMeters}
            className='w-full mt-4 bg-[#E46020] hover:bg-[#e46120] text-white'>
            Sell Meters
          </Button>
        </>
      )}
    </div>
  );
}
