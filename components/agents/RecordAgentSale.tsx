"use client";

import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, X } from "lucide-react";
import localFont from "next/font/local";
import {
  getAgentInventory,
  addSaleBatch,
  addSoldMeter,
  removeFromAgentInventory,
  getUserProfile,
} from "@/lib/actions/supabaseActions";
import {
  createSalesTransaction,
  linkBatchToTransaction,
} from "@/lib/actions/supabaseActions2";
import { pdf } from "@react-pdf/renderer";
import MeterSalesReceipt from "@/components/sharedcomponents/MeterSalesReceipt";
import { KenyaCounty, CustomerType } from "@/lib/constants/locationData";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ShadcnDatePicker } from "@/components/ui/shadcn-date-picker";

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

interface RecordAgentSaleProps {
  agent: {
    id: string;
    name: string;
    location: string;
    county: string;
    phone_number: string;
  };
  currentUser: {
    id: string;
    email: string;
    role?: string;
    name?: string;
  };
  onClose: () => void;
}

interface MeterInventory {
  id: string;
  serial_number: string;
  type: string;
  assigned_at: string;
}

// Add these styles to make tables responsive in the drawer
const tableStyles = {
  container: "overflow-auto max-h-[calc(80vh-8rem)]",
  table: "min-w-[300px] md:w-full", // Ensure minimum width on mobile
  headerCell: "px-2 md:px-4",
  cell: "px-2 md:px-4 py-2 md:py-4",
  checkbox: "scale-75 md:scale-100",
};

export default function RecordAgentSale({
  agent,
  currentUser,
  onClose,
}: RecordAgentSaleProps) {
  const [inventory, setInventory] = useState<MeterInventory[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMeters, setSelectedMeters] = useState<MeterInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unitPrices, setUnitPrices] = useState<{ [key: string]: string }>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();
  const [userName, setUserName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPage, setSelectedPage] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const data = await getAgentInventory(agent.id);
        setInventory(data || []);
      } catch (error) {
        console.error("Error fetching inventory:", error);
        toast({
          title: "Error",
          description: "Failed to load inventory",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventory();
  }, [agent.id]);

  useEffect(() => {
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

  const handleCheckMeter = (meter: MeterInventory) => {
    if (selectedMeters.find((m) => m.id === meter.id)) {
      setSelectedMeters(selectedMeters.filter((m) => m.id !== meter.id));
    } else {
      setSelectedMeters([...selectedMeters, meter]);
    }
  };

  const handleUnitPriceChange = (type: string, price: string) => {
    setUnitPrices({ ...unitPrices, [type]: price });
  };

  const handleSubmit = async () => {
    if (!currentUser?.id) {
      toast({
        title: "Error",
        description: "Please log in to continue",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get the sale date from selectedDate or default to current date
      const saleDate = selectedDate || new Date();

      // Group meters by type for batch processing
      const metersByType = selectedMeters.reduce(
        (acc: { [key: string]: typeof selectedMeters }, meter) => {
          if (!acc[meter.type]) acc[meter.type] = [];
          acc[meter.type].push(meter);
          return acc;
        },
        {}
      );

      // Calculate total amount for the entire transaction
      const totalAmount = Object.entries(metersByType).reduce(
        (total, [type, typeMeters]) => {
          const batchAmount = typeMeters.length;
          const typeUnitPrice = parseFloat(unitPrices[type]);
          return total + typeUnitPrice * batchAmount;
        },
        0
      );

      // Create a sales transaction first
      const transactionData = await createSalesTransaction({
        user_id: currentUser.id,
        user_name: userName,
        sale_date: saleDate.toISOString(),
        destination: agent.location,
        recipient: agent.name,
        customer_type: "agent",
        customer_county: agent.county,
        customer_contact: agent.phone_number,
        total_amount: totalAmount,
      });

      // Process each meter type as a separate batch
      for (const [type, typeMeters] of Object.entries(metersByType)) {
        const batchAmount = typeMeters.length;
        const typeUnitPrice = parseFloat(unitPrices[type]);
        const totalPrice = typeUnitPrice * batchAmount;

        // Create sale batch and get batch ID
        const batchData = await addSaleBatch({
          user_id: currentUser.id,
          user_name: userName,
          meter_type: type,
          batch_amount: batchAmount,
          unit_price: typeUnitPrice,
          total_price: totalPrice,
          destination: agent.location,
          recipient: agent.name,
          customer_type: "agent" as CustomerType,
          customer_county: agent.county as KenyaCounty,
          customer_contact: agent.phone_number,
          sale_date: saleDate.toISOString(), // Use the selected date
        });

        // Link this batch to the transaction
        await linkBatchToTransaction(batchData.id, transactionData.id);

        // Process individual meters in the batch
        for (const meter of typeMeters) {
          // Remove from agent inventory first
          await removeFromAgentInventory(meter.id);

          // Add to sold meters
          await addSoldMeter({
            meter_id: meter.id,
            sold_by: currentUser.id,
            sold_at: saleDate.toISOString(), // Use the selected date
            destination: agent.location,
            recipient: agent.name,
            serial_number: meter.serial_number,
            unit_price: typeUnitPrice,
            batch_id: batchData.id,
            customer_type: "agent" as CustomerType,
            customer_county: agent.county as KenyaCounty,
            customer_contact: agent.phone_number,
          });
        }

        // Update local inventory state
        setInventory((prevInventory) =>
          prevInventory.filter(
            (invMeter) =>
              !typeMeters.some((soldMeter) => soldMeter.id === invMeter.id)
          )
        );
      }

      // Store receipt data for download
      const receiptData = {
        meters: selectedMeters.map((meter) => ({
          serialNumber: meter.serial_number,
          type: meter.type,
        })),
        destination: agent.location,
        recipient: agent.name,
        unitPrices,
        userName: currentUser.name || currentUser.email,
        customerType: "agent" as const,
        customerCounty: agent.county,
        customerContact: agent.phone_number,
        saleDate: saleDate.toISOString(), // Include the sale date in receipt data
        referenceNumber: transactionData.reference_number, // Include reference number
      };

      localStorage.setItem(
        "lastSubmittedSaleMeters",
        JSON.stringify(receiptData)
      );

      setSelectedMeters([]);
      setIsSubmitted(true);

      toast({
        title: "Success",
        description:
          "Sale recorded successfully! You can now download the receipt.",
        style: { backgroundColor: "#2ECC40", color: "white" },
      });

      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to record sale",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadReceipt = async () => {
    try {
      const lastSubmittedData = JSON.parse(
        localStorage.getItem("lastSubmittedSaleMeters") || "{}"
      );

      const blob = await pdf(
        <MeterSalesReceipt
          meters={lastSubmittedData.meters}
          destination={lastSubmittedData.destination}
          recipient={lastSubmittedData.recipient}
          unitPrices={lastSubmittedData.unitPrices}
          userName={lastSubmittedData.userName}
          customerType={lastSubmittedData.customerType}
          customerCounty={lastSubmittedData.customerCounty}
          customerContact={lastSubmittedData.customerContact}
          saleDate={lastSubmittedData.saleDate}
          referenceNumber={lastSubmittedData.referenceNumber}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `meter-sales-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      localStorage.removeItem("lastSubmittedSaleMeters");
      setIsSubmitted(false);

      toast({
        title: "Success",
        description: "Receipt downloaded successfully!",
        style: { backgroundColor: "#2ECC40", color: "white" },
      });
    } catch (error) {
      console.error("Error downloading receipt:", error);
      toast({
        title: "Error",
        description: "Failed to download receipt",
        variant: "destructive",
      });
    }
  };

  const filteredInventory = inventory.filter((meter) =>
    meter.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination calculations for inventory table
  const totalPages = Math.ceil(filteredInventory.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = filteredInventory.slice(startIndex, endIndex);

  // Pagination calculations for selected meters table
  const totalSelectedPages = Math.ceil(selectedMeters.length / ITEMS_PER_PAGE);
  const selectedStartIndex = (selectedPage - 1) * ITEMS_PER_PAGE;
  const selectedEndIndex = selectedStartIndex + ITEMS_PER_PAGE;
  const currentSelectedItems = selectedMeters.slice(
    selectedStartIndex,
    selectedEndIndex
  );

  return (
    <div
      className={`${geistMono.className} p-2 md:p-4 flex flex-col md:flex-row h-[80vh]`}>
      {/* Left section - Inventory */}
      <div className='flex-1 md:pr-4 md:border-r mb-4 md:mb-0'>
        <div className='relative mb-4'>
          <Search className='absolute left-2 top-2.5 h-4 w-4 text-[#000080]' />
          <Input
            placeholder='Search by serial number...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='pl-8'
          />
        </div>

        <div className='flex flex-col h-[calc(100%-120px)]'>
          <div className={`${tableStyles.container} flex-1`}>
            <Table className={tableStyles.table}>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[40px] md:w-[50px]'></TableHead>
                  <TableHead className={tableStyles.headerCell}>
                    Serial Number
                  </TableHead>
                  <TableHead className={tableStyles.headerCell}>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className='text-center py-8'>
                      Loading inventory...
                    </TableCell>
                  </TableRow>
                ) : currentItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className='text-center py-8'>
                      {searchTerm
                        ? "No meters found matching search"
                        : "No meters available"}
                    </TableCell>
                  </TableRow>
                ) : (
                  currentItems.map((meter) => (
                    <TableRow key={meter.id}>
                      <TableCell className={tableStyles.cell}>
                        <Checkbox
                          checked={selectedMeters.some(
                            (m) => m.id === meter.id
                          )}
                          onCheckedChange={() => handleCheckMeter(meter)}
                          className={`border-[#000080] ${tableStyles.checkbox}`}
                        />
                      </TableCell>
                      <TableCell
                        className={`${tableStyles.cell} text-sm md:text-base`}>
                        {meter.serial_number}
                      </TableCell>
                      <TableCell
                        className={`${tableStyles.cell} text-sm md:text-base`}>
                        {meter.type}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <Pagination className='mt-4'>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={
                      currentPage === 1 ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>
                {Array.from({ length: totalPages }, (_, i) => (
                  <PaginationItem key={i + 1}>
                    <PaginationLink
                      onClick={() => setCurrentPage(i + 1)}
                      isActive={currentPage === i + 1}>
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>

      {/* Right section - Selected Meters */}
      <div className='flex-1 md:pl-4'>
        <div className='flex items-center mb-4 gap-4'>
          <h3 className='font-semibold text-sm md:text-base flex-shrink-0'>
            Selected Meters ({selectedMeters.length})
          </h3>

          <div className='flex-grow max-w-[220px]'>
            <ShadcnDatePicker
              date={selectedDate}
              setDate={setSelectedDate}
              placeholder='Select date'
            />
          </div>
        </div>

        {/* Unit Prices Section */}
        <div className='grid grid-cols-1 gap-3 mb-4'>
          {Array.from(new Set(selectedMeters.map((m) => m.type))).map(
            (type) => (
              <div key={type} className='mb-2'>
                <label className='text-xs md:text-sm font-medium'>
                  Unit Price for {type}
                </label>
                <Input
                  type='number'
                  placeholder={`Enter price for ${type}`}
                  value={unitPrices[type] || ""}
                  onChange={(e) => handleUnitPriceChange(type, e.target.value)}
                  className='mt-1'
                />
              </div>
            )
          )}
        </div>

        <div className='flex flex-col h-[calc(100%-280px)]'>
          <div className={`${tableStyles.container} flex-1`}>
            <Table className={tableStyles.table}>
              <TableHeader>
                <TableRow>
                  <TableHead className={tableStyles.headerCell}>
                    Serial Number
                  </TableHead>
                  <TableHead className={tableStyles.headerCell}>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentSelectedItems.map((meter) => (
                  <TableRow key={meter.id}>
                    <TableCell
                      className={`${tableStyles.cell} text-sm md:text-base`}>
                      {meter.serial_number}
                    </TableCell>
                    <TableCell
                      className={`${tableStyles.cell} text-sm md:text-base`}>
                      {meter.type}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalSelectedPages > 1 && (
            <Pagination className='mt-4'>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setSelectedPage((p) => Math.max(1, p - 1))}
                    className={
                      selectedPage === 1 ? "pointer-events-none opacity-50" : ""
                    }
                  />
                </PaginationItem>
                {Array.from({ length: totalSelectedPages }, (_, i) => (
                  <PaginationItem key={i + 1}>
                    <PaginationLink
                      onClick={() => setSelectedPage(i + 1)}
                      isActive={selectedPage === i + 1}>
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setSelectedPage((p) =>
                        Math.min(totalSelectedPages, p + 1)
                      )
                    }
                    className={
                      selectedPage === totalSelectedPages
                        ? "pointer-events-none opacity-50"
                        : ""
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>

        {/* Buttons */}
        <div className='mt-4 space-y-2'>
          <Button
            onClick={handleSubmit}
            className='w-full bg-[#000080] hover:bg-[#000066] text-sm md:text-base'
            disabled={isSubmitting || selectedMeters.length === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Recording Sale...
              </>
            ) : (
              `Record Sale (${selectedMeters.length} meters)`
            )}
          </Button>

          {isSubmitted && selectedMeters.length === 0 && (
            <div className='relative'>
              <Button
                onClick={handleDownloadReceipt}
                className='w-full bg-[#2ECC40] hover:bg-[#28a035] text-white mt-4 text-sm md:text-base'>
                Download Sales Receipt
              </Button>
              <Button
                onClick={() => setIsSubmitted(false)}
                variant='ghost'
                size='icon'
                className='absolute -right-2 -top-2 h-6 w-6 rounded-full bg-gray-200 hover:bg-gray-300'
                aria-label='Dismiss'>
                <X className='h-4 w-4' />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
