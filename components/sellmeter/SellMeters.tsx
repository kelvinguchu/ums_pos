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
import { X, Edit2, Loader2 } from "lucide-react";
import { pdf, PDFDownloadLink } from "@react-pdf/renderer";
import MeterSalesReceipt from "../sharedcomponents/MeterSalesReceipt";
import { Badge } from "@/components/ui/badge";
import SaleDetailsDialog from "./SaleDetailsDialog";
import { KenyaCounty, CustomerType } from "@/lib/constants/locationData";

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Add this interface near the top
interface UnitPrices {
  [key: string]: string;
}

// Add these interfaces
interface SaleDetails {
  destination: string;
  recipient: string;
  unitPrices: UnitPrices;
  customerType: CustomerType;
  customerCounty: KenyaCounty;
  customerContact: string;
}

// Add this constant at the top
const MAX_SERIAL_LENGTH = 12;

export default function SellMeters({ currentUser }: { currentUser: any }) {
  const [serialNumber, setSerialNumber] = useState("");
  const [meters, setMeters] = useState<
    Array<{ id: string; serialNumber: string; type: string }>
  >(() => {
    const cachedMeters = localStorage.getItem("cachedSellMeters");
    return cachedMeters ? JSON.parse(cachedMeters) : [];
  });
  const [destination, setDestination] = useState(
    () => localStorage.getItem("cachedDestination") || ""
  );
  const [recipient, setRecipient] = useState(
    () => localStorage.getItem("cachedRecipient") || ""
  );
  const [unitPrices, setUnitPrices] = useState<UnitPrices>(() => {
    const cached = localStorage.getItem("cachedUnitPrices");
    return cached ? JSON.parse(cached) : {};
  });
  const [errorMessage, setErrorMessage] = useState<string | React.ReactNode>(
    "Input Serial Number"
  );
  const [userName, setUserName] = useState("");
  const { toast } = useToast();
  const serialInputRef = useRef<HTMLInputElement>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(() => {
    return localStorage.getItem("lastSubmittedSaleMeters") !== null;
  });
  const [saleDetails, setSaleDetails] = useState<SaleDetails | null>(() => {
    const cached = localStorage.getItem("cachedSaleDetails");
    return cached ? JSON.parse(cached) : null;
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSellingMeters, setIsSellingMeters] = useState(false);

  const findExistingMeter = (serialNum: string) => {
    return meters.findIndex(
      (m) => m.serialNumber.toLowerCase() === serialNum.toLowerCase()
    );
  };

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
    localStorage.setItem("cachedSellMeters", JSON.stringify(meters));
    localStorage.setItem("cachedDestination", destination);
    localStorage.setItem("cachedRecipient", recipient);
    localStorage.setItem("cachedUnitPrices", JSON.stringify(unitPrices));
    if (saleDetails) {
      localStorage.setItem("cachedSaleDetails", JSON.stringify(saleDetails));
    }
  }, [meters, destination, recipient, unitPrices, saleDetails]);

  useEffect(() => {
    const checkSerialNumber = async () => {
      if (!serialNumber.trim()) {
        setErrorMessage("Input Serial Number");
        return;
      }

      // Check for duplicate in table first
      const existingIndex = findExistingMeter(serialNumber);
      if (existingIndex !== -1) {
        setErrorMessage(
          <div className='flex items-center gap-2'>
            <span>Serial Number Already in the Table</span>
            <button
              className='text-blue-500 hover:underline'
              onClick={() => {
                const element = document.querySelector(
                  `[data-row-index="${existingIndex}"]`
                );
                element?.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
                element?.classList.add("bg-yellow-100");
                setTimeout(
                  () => element?.classList.remove("bg-yellow-100"),
                  2000
                );
              }}>
              View Entry
            </button>
          </div>
        );
        return;
      }

      setIsChecking(true);
      try {
        const meter = await getMeterBySerial(serialNumber);
        if (!meter) {
          setErrorMessage("Meter not found");
          return;
        }

        setMeters([
          {
            id: meter.id,
            serialNumber: meter.serial_number,
            type: meter.type,
          },
          ...meters,
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
      } finally {
        setIsChecking(false);
      }
    };

    const timeoutId = setTimeout(checkSerialNumber, 300);
    return () => clearTimeout(timeoutId);
  }, [serialNumber, meters]);

  const handleRemoveMeter = (index: number) => {
    setMeters(meters.filter((_, i) => i !== index));
  };

  const handleSellMeters = async () => {
    if (!saleDetails) {
      setErrorMessage("Please add sale details first");
      return;
    }

    const { destination, recipient, unitPrices } = saleDetails;

    if (!destination.trim() || !recipient.trim()) {
      setErrorMessage("Destination and recipient cannot be empty");
      return;
    }

    const uniqueTypes = getUniqueTypes();
    const missingPrices = uniqueTypes.filter((type) => !unitPrices[type]);

    if (missingPrices.length > 0) {
      setErrorMessage(
        `Please set unit prices for: ${missingPrices.join(", ")}`
      );
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

    setIsSellingMeters(true);

    try {
      // Group meters by type
      const metersByType = meters.reduce(
        (acc: { [key: string]: typeof meters }, meter) => {
          if (!acc[meter.type]) acc[meter.type] = [];
          acc[meter.type].push(meter);
          return acc;
        },
        {}
      );

      // Create a sale batch for each type
      for (const [type, typeMeters] of Object.entries(metersByType)) {
        const batchAmount = typeMeters.length;
        const typeUnitPrice = parseFloat(unitPrices[type]);
        const totalPrice = typeUnitPrice * batchAmount;

        // Add sale batch and get the batch id
        const batchData = await addSaleBatch({
          user_id: currentUser.id,
          user_name: userName,
          meter_type: type,
          batch_amount: batchAmount,
          unit_price: typeUnitPrice,
          total_price: totalPrice,
          destination: saleDetails.destination,
          recipient: saleDetails.recipient,
          customer_type: saleDetails.customerType,
          customer_county: saleDetails.customerCounty,
          customer_contact: saleDetails.customerContact,
        });

        // Remove meters and add to sold_meters with batch_id
        for (const meter of typeMeters) {
          await removeMeter(meter.id);
          await addSoldMeter({
            meter_id: meter.id,
            sold_by: currentUser.id,
            sold_at: new Date().toISOString(),
            destination: saleDetails.destination,
            recipient: saleDetails.recipient,
            serial_number: meter.serialNumber,
            unit_price: typeUnitPrice,
            batch_id: batchData.id,
            customer_type: saleDetails.customerType,
            customer_county: saleDetails.customerCounty,
            customer_contact: saleDetails.customerContact,
          });
        }
      }

      // Store the submitted meters for the receipt
      localStorage.setItem(
        "lastSubmittedSaleMeters",
        JSON.stringify({
          meters,
          destination: saleDetails.destination,
          recipient: saleDetails.recipient,
          unitPrices: saleDetails.unitPrices,
          userName,
          customerType: saleDetails.customerType,
          customerCounty: saleDetails.customerCounty,
          customerContact: saleDetails.customerContact,
        })
      );

      // Clear the form and sale details
      setMeters([]);
      setSaleDetails(null);
      setIsDialogOpen(false);
      localStorage.removeItem("cachedSaleDetails");

      // Set isSubmitted to true AFTER clearing the form
      setIsSubmitted(true);

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
    } finally {
      setIsSellingMeters(false);
    }
  };

  const handleClearForm = () => {
    setMeters([]);
    setSerialNumber("");
    setSaleDetails(null);
    setIsDialogOpen(false);
    localStorage.removeItem("cachedSellMeters");
    localStorage.removeItem("cachedSaleDetails"); // Add this line
  };

  const handleSerialNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length > MAX_SERIAL_LENGTH) {
      toast({
        title: "Error",
        description: "Serial number cannot be more than 12 digits",
        variant: "destructive",
      });
      return;
    }
    setSerialNumber(value);
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

      // Clear the submitted meters after download
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
        description: "Failed to download receipt. Please try again.",
        variant: "destructive",
        style: { backgroundColor: "#FF4136", color: "white" },
      });
    }
  };

  // Replace the getUniqueTypes function with this version
  const getUniqueTypes = () => {
    return Array.from(new Set(meters.map((meter) => meter.type)));
  };

  // Add this function near the other handlers
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && serialNumber.trim()) {
      e.preventDefault();
      // The serial number validation and addition is already handled in the useEffect
      // Just need to ensure the input is not empty
    }
  };

  return (
    <div
      className={`${geistMono.className} bg-white shadow-md rounded-lg p-6 max-w-2xl mx-auto`}>
      <div className='flex flex-col min-h-[600px]'>
        <div className='flex-1'>
          <div className='flex justify-between items-center mb-6'>
            <h2 className='text-2xl font-bold text-gray-800'>Sell Meters</h2>
            <Button onClick={handleClearForm} variant='outline'>
              Clear Form
            </Button>
          </div>

          <div className='space-y-4 mb-6'>
            <Input
              ref={serialInputRef}
              type='text'
              placeholder='Serial Number'
              value={serialNumber.toUpperCase()}
              onChange={handleSerialNumberChange}
              onKeyPress={handleKeyPress}
              required
              maxLength={12}
              className='w-full'
            />
            {errorMessage && <p className='text-red-500'>{errorMessage}</p>}
          </div>

          {/* Update the download receipt button section */}
          {isSubmitted && meters.length === 0 && (
            <div className='mb-6 relative'>
              <Button
                onClick={handleDownloadReceipt}
                className='w-full bg-[#2ECC40] hover:bg-[#28a035] text-white'>
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

          {meters.length > 0 && (
            <>
              {saleDetails ? (
                <>
                  <div className='flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg mb-4'>
                    <Badge
                      variant='secondary'
                      className='bg-gradient-to-r from-green-500/50 to-blue-500/50 text-black'>
                      Destination: {saleDetails.destination}
                    </Badge>
                    <Badge
                      variant='secondary'
                      className='bg-gradient-to-r from-orange-500/50 to-yellow-500/50 text-black'>
                      Recipient: {saleDetails.recipient}
                    </Badge>
                    <Badge
                      variant='secondary'
                      className='bg-gradient-to-r from-purple-500/50 to-pink-500/50 text-black'>
                      Contact: {saleDetails.customerContact}
                    </Badge>
                    <Badge
                      variant='secondary'
                      className='bg-gradient-to-r from-blue-500/50 to-indigo-500/50 text-black'>
                      Type: {saleDetails.customerType}
                    </Badge>
                    <Badge
                      variant='secondary'
                      className='bg-gradient-to-r from-red-500/50 to-orange-500/50 text-black'>
                      County: {saleDetails.customerCounty}
                    </Badge>
                    {Object.entries(saleDetails.unitPrices).map(
                      ([type, price]) => (
                        <Badge
                          key={type}
                          variant='secondary'
                          className='bg-gradient-to-r from-indigo-500/50 to-purple-500/50 text-black'>
                          {type}: {price}
                        </Badge>
                      )
                    )}
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => setIsDialogOpen(true)}
                      className='ml-2 bg-yellow-500/50 to-blue-500/50 text-black'>
                      <Edit2 className='h-4 w-4 mr-1' />
                      Edit Details
                    </Button>
                  </div>

                  <SaleDetailsDialog
                    isOpen={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    onSubmit={(data) => {
                      setSaleDetails(data);
                      setIsDialogOpen(false);
                    }}
                    initialData={saleDetails}
                    meterTypes={getUniqueTypes()}
                  />
                </>
              ) : (
                <SaleDetailsDialog
                  isOpen={isDialogOpen}
                  onOpenChange={setIsDialogOpen}
                  onSubmit={(data) => {
                    setSaleDetails(data);
                    setIsDialogOpen(false);
                  }}
                  initialData={null}
                  meterTypes={getUniqueTypes()}
                  trigger={
                    <Button className='w-full bg-[#000080] hover:bg-[#000066] mb-4'>
                      Add Sale Details
                    </Button>
                  }
                />
              )}

              {/* Group the action buttons together */}
              {meters.length > 0 ? (
                <div className='space-y-4 mb-6'>
                  {saleDetails && (
                    <Button
                      onClick={handleSellMeters}
                      disabled={isSellingMeters}
                      className='w-full bg-[#E46020] hover:bg-[#e46120] text-white'>
                      {isSellingMeters ? (
                        <>
                          <span className='mr-2'>Selling Meters...</span>
                          <div className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
                        </>
                      ) : (
                        `Confirm Sale of ${meters.length} Meter${
                          meters.length !== 1 ? "s" : ""
                        }`
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                // Show download button when meters are empty (after submission)
                isSubmitted && (
                  <div className='space-y-4 mb-6 relative'>
                    <Button
                      onClick={handleDownloadReceipt}
                      className='w-full bg-[#2ECC40] hover:bg-[#28a035] text-white'>
                      Download Receipt
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
                )
              )}

              <div className='mt-6'>
                <div className='flex justify-between items-center mb-2'>
                  <h3 className='text-lg font-semibold text-gray-700'>
                    Meters to Sell
                  </h3>
                  <span className='text-sm text-gray-500'>
                    Total: {meters.length} meter{meters.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className='max-h-[400px] overflow-y-auto border border-gray-200 rounded-md'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className='bg-gray-50'>
                          Serial Number
                        </TableHead>
                        <TableHead className='bg-gray-50'>Type</TableHead>
                        <TableHead className='bg-gray-50'>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {meters.map((meter, index) => (
                        <TableRow
                          key={index}
                          data-row-index={index}
                          className={
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }>
                          <TableCell>{meter.serialNumber}</TableCell>
                          <TableCell>{meter.type}</TableCell>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// "use client";

// import { useState, useRef, useEffect } from "react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { useToast } from "@/hooks/use-toast";
// import { ToastAction } from "@/components/ui/toast";
// import {
//   getMeterBySerial,
//   removeMeter,
//   addSoldMeter,
//   addSaleBatch,
//   getUserProfile,
// } from "@/lib/actions/supabaseActions";
// import localFont from "next/font/local";
// import { X, Edit2, Loader2, FileDown, Upload } from "lucide-react";
// import { pdf, PDFDownloadLink } from "@react-pdf/renderer";
// import MeterSalesReceipt from "../sharedcomponents/MeterSalesReceipt";
// import { Badge } from "@/components/ui/badge";
// import SaleDetailsDialog from "./SaleDetailsDialog";
// import { KenyaCounty, CustomerType } from "@/lib/constants/locationData";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import * as XLSX from "xlsx";

// const geistMono = localFont({
//   src: "../../public/fonts/GeistMonoVF.woff",
//   variable: "--font-geist-mono",
//   weight: "100 900",
// });

// // Add this interface near the top
// interface UnitPrices {
//   [key: string]: string;
// }

// // Add these interfaces
// interface SaleDetails {
//   destination: string;
//   recipient: string;
//   unitPrices: UnitPrices;
//   customerType: CustomerType;
//   customerCounty: KenyaCounty;
//   customerContact: string;
// }

// // Add this constant at the top
// const MAX_SERIAL_LENGTH = 12;

// interface FileUploadProps {
//   onMetersAdd: (
//     meters: Array<{ id: string; serialNumber: string; type: string }>
//   ) => void;
//   currentUser: any;
// }

// const FileUploadHandler = ({ onMetersAdd, currentUser }: FileUploadProps) => {
//   const { toast } = useToast();
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [progress, setProgress] = useState({ current: 0, total: 0 });

//   const processFile = async (file: File) => {
//     setIsProcessing(true);
//     try {
//       const reader = new FileReader();

//       reader.onload = async (e) => {
//         try {
//           let serialNumbers: string[] = [];

//           if (file.name.endsWith(".csv")) {
//             const text = e.target?.result as string;
//             // Split by both \n and \r\n to handle different line endings
//             serialNumbers = text
//               .split(/\r?\n/)
//               .map((line) => line.trim())
//               .filter(
//                 (line) =>
//                   line && line !== "Serial Number" && line !== "serial_number"
//               );
//           } else {
//             const data = e.target?.result;
//             const workbook = XLSX.read(data, { type: "binary" });
//             const sheetName = workbook.SheetNames[0];
//             const worksheet = workbook.Sheets[sheetName];
//             const jsonData = XLSX.utils.sheet_to_json(worksheet, {
//               header: 1,
//               blankrows: false,
//               defval: "",
//             });

//             serialNumbers = jsonData
//               .slice(1) // Skip header row
//               .map((row: any) => row[0]?.toString().trim())
//               .filter((serial: string) => serial && serial.length > 0);
//           }

//           // Log the actual count for debugging
//           console.log("Total serial numbers found:", serialNumbers.length);

//           if (serialNumbers.length === 0) {
//             toast({
//               title: "Error",
//               description: "No valid serial numbers found in file",
//               variant: "destructive",
//             });
//             return;
//           }

//           setProgress({ current: 0, total: serialNumbers.length });

//           // Process meters in batches of 50
//           const BATCH_SIZE = 50;
//           const errors: string[] = [];
//           const validMeters: Array<{
//             id: string;
//             serialNumber: string;
//             type: string;
//           }> = [];

//           for (let i = 0; i < serialNumbers.length; i += BATCH_SIZE) {
//             const batch = serialNumbers.slice(i, i + BATCH_SIZE);
//             const batchPromises = batch.map(getMeterBySerial);

//             try {
//               const batchResults = await Promise.all(batchPromises);

//               batchResults.forEach((meter, index) => {
//                 if (meter) {
//                   validMeters.push({
//                     id: meter.id,
//                     serialNumber: meter.serial_number,
//                     type: meter.type,
//                   });
//                 } else {
//                   errors.push(batch[index]);
//                 }
//               });

//               // Update progress after each batch
//               setProgress((prev) => ({
//                 ...prev,
//                 current: Math.min(i + BATCH_SIZE, serialNumbers.length),
//               }));

//               // Add valid meters from this batch to the table
//               if (validMeters.length > 0) {
//                 onMetersAdd(validMeters);
//               }
//             } catch (error) {
//               console.error(`Error processing batch:`, error);
//               batch.forEach((serial) => errors.push(serial));
//             }
//           }

//           // Log the final counts for debugging
//           console.log("Valid meters found:", validMeters.length);
//           console.log("Errors found:", errors.length);

//           toast({
//             title: "Processing Complete",
//             description: `Added ${validMeters.length.toLocaleString()} meters${
//               errors.length > 0
//                 ? `. ${errors.length.toLocaleString()} meters not found.`
//                 : ""
//             }`,
//             style: { backgroundColor: "#2ECC40", color: "white" },
//           });
//         } catch (error) {
//           console.error("Error processing file:", error);
//           toast({
//             title: "Error",
//             description: "Failed to process file",
//             variant: "destructive",
//           });
//         }
//       };

//       if (file.name.endsWith(".csv")) {
//         reader.readAsText(file);
//       } else {
//         reader.readAsBinaryString(file);
//       }
//     } catch (error) {
//       console.error("Error reading file:", error);
//       toast({
//         title: "Error",
//         description: "Failed to read file",
//         variant: "destructive",
//       });
//     } finally {
//       setIsProcessing(false);
//       setProgress({ current: 0, total: 0 });
//     }
//   };

//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     if (!file.name.endsWith(".csv") && !file.name.endsWith(".xlsx")) {
//       toast({
//         title: "Error",
//         description: "Please upload a CSV or Excel file",
//         variant: "destructive",
//       });
//       return;
//     }

//     processFile(file);
//     e.target.value = "";
//   };

//   return (
//     <div className='relative'>
//       <input
//         type='file'
//         accept='.csv,.xlsx'
//         onChange={handleFileChange}
//         className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
//         disabled={isProcessing}
//       />
//       <Badge
//         variant='outline'
//         className={`hover:bg-gray-100 flex items-center gap-1 cursor-pointer ${
//           isProcessing ? "w-[200px]" : "w-[100px]"
//         } justify-center`}>
//         {isProcessing ? (
//           <>
//             <Loader2 className='h-3 w-3 animate-spin' />
//             {progress.total > 0
//               ? `Processing ${progress.current}/${progress.total}`
//               : "Processing..."}
//           </>
//         ) : (
//           <>
//             <Upload className='h-3 w-3' />
//             Upload
//           </>
//         )}
//       </Badge>
//     </div>
//   );
// };

// export default function SellMeters({ currentUser }: { currentUser: any }) {
//   const [serialNumber, setSerialNumber] = useState("");
//   const [meters, setMeters] = useState<
//     Array<{ id: string; serialNumber: string; type: string }>
//   >(() => {
//     const cachedMeters = localStorage.getItem("cachedSellMeters");
//     return cachedMeters ? JSON.parse(cachedMeters) : [];
//   });
//   const [destination, setDestination] = useState(
//     () => localStorage.getItem("cachedDestination") || ""
//   );
//   const [recipient, setRecipient] = useState(
//     () => localStorage.getItem("cachedRecipient") || ""
//   );
//   const [unitPrices, setUnitPrices] = useState<UnitPrices>(() => {
//     const cached = localStorage.getItem("cachedUnitPrices");
//     return cached ? JSON.parse(cached) : {};
//   });
//   const [errorMessage, setErrorMessage] = useState<string | React.ReactNode>(
//     "Input Serial Number"
//   );
//   const [userName, setUserName] = useState("");
//   const { toast } = useToast();
//   const serialInputRef = useRef<HTMLInputElement>(null);
//   const [isChecking, setIsChecking] = useState(false);
//   const [isSubmitted, setIsSubmitted] = useState(() => {
//     return localStorage.getItem("lastSubmittedSaleMeters") !== null;
//   });
//   const [saleDetails, setSaleDetails] = useState<SaleDetails | null>(() => {
//     const cached = localStorage.getItem("cachedSaleDetails");
//     return cached ? JSON.parse(cached) : null;
//   });
//   const [isDialogOpen, setIsDialogOpen] = useState(false);
//   const [isSellingMeters, setIsSellingMeters] = useState(false);

//   const findExistingMeter = (serialNum: string) => {
//     return meters.findIndex(
//       (m) => m.serialNumber.toLowerCase() === serialNum.toLowerCase()
//     );
//   };

//   useEffect(() => {
//     if (serialInputRef.current) {
//       serialInputRef.current.focus();
//     }

//     const fetchUserProfile = async () => {
//       if (currentUser?.id) {
//         const profile = await getUserProfile(currentUser.id);
//         if (profile?.name) {
//           setUserName(profile.name);
//         }
//       }
//     };
//     fetchUserProfile();
//   }, [currentUser]);

//   useEffect(() => {
//     localStorage.setItem("cachedSellMeters", JSON.stringify(meters));
//     localStorage.setItem("cachedDestination", destination);
//     localStorage.setItem("cachedRecipient", recipient);
//     localStorage.setItem("cachedUnitPrices", JSON.stringify(unitPrices));
//     if (saleDetails) {
//       localStorage.setItem("cachedSaleDetails", JSON.stringify(saleDetails));
//     }
//   }, [meters, destination, recipient, unitPrices, saleDetails]);

//   useEffect(() => {
//     const checkSerialNumber = async () => {
//       if (!serialNumber.trim()) {
//         setErrorMessage("Input Serial Number");
//         return;
//       }

//       // Check for duplicate in table first
//       const existingIndex = findExistingMeter(serialNumber);
//       if (existingIndex !== -1) {
//         setErrorMessage(
//           <div className='flex items-center gap-2'>
//             <span>Serial Number Already in the Table</span>
//             <button
//               className='text-blue-500 hover:underline'
//               onClick={() => {
//                 const element = document.querySelector(
//                   `[data-row-index="${existingIndex}"]`
//                 );
//                 element?.scrollIntoView({
//                   behavior: "smooth",
//                   block: "center",
//                 });
//                 element?.classList.add("bg-yellow-100");
//                 setTimeout(
//                   () => element?.classList.remove("bg-yellow-100"),
//                   2000
//                 );
//               }}>
//               View Entry
//             </button>
//           </div>
//         );
//         return;
//       }

//       setIsChecking(true);
//       try {
//         const meter = await getMeterBySerial(serialNumber);
//         if (!meter) {
//           setErrorMessage("Meter not found");
//           return;
//         }

//         setMeters([
//           {
//             id: meter.id,
//             serialNumber: meter.serial_number,
//             type: meter.type,
//           },
//           ...meters,
//         ]);
//         setSerialNumber("");
//         setErrorMessage("");

//         toast({
//           title: "Success",
//           description: "Meter added to the list",
//           style: { backgroundColor: "#2ECC40", color: "white" },
//         });
//       } catch (error) {
//         console.error("Error retrieving meter:", error);
//         setErrorMessage("Failed to retrieve meter. Please try again.");
//       } finally {
//         setIsChecking(false);
//       }
//     };

//     const timeoutId = setTimeout(checkSerialNumber, 300);
//     return () => clearTimeout(timeoutId);
//   }, [serialNumber, meters]);

//   const handleRemoveMeter = (serialNumber: string) => {
//     setMeters((prevMeters) =>
//       prevMeters.filter((meter) => meter.serialNumber !== serialNumber)
//     );
//     // Update localStorage after removing meter
//     const updatedMeters = meters.filter(
//       (meter) => meter.serialNumber !== serialNumber
//     );
//     localStorage.setItem("cachedSellMeters", JSON.stringify(updatedMeters));
//   };

//   const handleSellMeters = async () => {
//     if (meters.length === 0) {
//       toast({
//         title: "Error",
//         description: "Please add meters to sell",
//         variant: "destructive",
//       });
//       return;
//     }

//     if (!saleDetails) {
//       setIsDialogOpen(true);
//       return;
//     }

//     try {
//       setIsSellingMeters(true);
//       setErrorMessage("");

//       // Group meters by type for batch processing
//       const metersByType = meters.reduce(
//         (acc: { [key: string]: typeof meters }, meter) => {
//           if (!acc[meter.type]) acc[meter.type] = [];
//           acc[meter.type].push(meter);
//           return acc;
//         },
//         {}
//       );

//       // Process each meter type as a separate batch
//       for (const [type, typeMeters] of Object.entries(metersByType)) {
//         const batchAmount = typeMeters.length;
//         const typeUnitPrice = parseFloat(saleDetails.unitPrices[type]);
//         const totalPrice = typeUnitPrice * batchAmount;

//         // Create sale batch and get batch ID
//         const batchData = await addSaleBatch({
//           user_id: currentUser.id,
//           user_name: userName,
//           meter_type: type,
//           batch_amount: batchAmount,
//           unit_price: typeUnitPrice,
//           total_price: totalPrice,
//           destination: saleDetails.destination,
//           recipient: saleDetails.recipient,
//           customer_type: saleDetails.customerType,
//           customer_county: saleDetails.customerCounty,
//           customer_contact: saleDetails.customerContact,
//         });

//         // Process meters in batches
//         const BATCH_SIZE = 50;
//         for (let i = 0; i < typeMeters.length; i += BATCH_SIZE) {
//           const batch = typeMeters.slice(i, i + BATCH_SIZE);
//           await Promise.all(
//             batch.map(async (meter) => {
//               // First remove the meter from the meters table
//               await removeMeter(meter.id);
//               // Then add it to sold_meters
//               await addSoldMeter({
//                 meter_id: meter.id,
//                 sold_by: currentUser.id,
//                 sold_at: new Date().toISOString(),
//                 destination: saleDetails.destination,
//                 recipient: saleDetails.recipient,
//                 serial_number: meter.serialNumber,
//                 unit_price: typeUnitPrice,
//                 batch_id: batchData.id,
//                 customer_type: saleDetails.customerType,
//                 customer_county: saleDetails.customerCounty,
//                 customer_contact: saleDetails.customerContact,
//               });
//             })
//           );
//         }
//       }

//       // Generate PDF in the background
//       const pdfData = {
//         meters,
//         destination: saleDetails.destination,
//         recipient: saleDetails.recipient,
//         unitPrices: saleDetails.unitPrices,
//         userName,
//         customerType: saleDetails.customerType,
//         customerCounty: saleDetails.customerCounty,
//         customerContact: saleDetails.customerContact,
//       };
//       localStorage.setItem("lastSubmittedSaleMeters", JSON.stringify(pdfData));

//       // Clear the form only after successful sale
//       setMeters([]);
//       setSaleDetails(null);
//       localStorage.removeItem("cachedSellMeters");
//       localStorage.removeItem("cachedSaleDetails");
//       setIsSubmitted(true);

//       toast({
//         title: "Success",
//         description: "Meters sold successfully",
//         style: { backgroundColor: "#2ECC40", color: "white" },
//       });
//     } catch (error) {
//       console.error("Error selling meters:", error);
//       toast({
//         title: "Error",
//         description: "Failed to sell meters. Please try again.",
//         variant: "destructive",
//       });
//     } finally {
//       setIsSellingMeters(false);
//     }
//   };

//   const handleClearForm = () => {
//     setMeters([]);
//     setSerialNumber("");
//     setSaleDetails(null);
//     setIsDialogOpen(false);
//     localStorage.removeItem("cachedSellMeters");
//     localStorage.removeItem("cachedSaleDetails"); // Add this line
//   };

//   const handleSerialNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value;
//     if (value.length > MAX_SERIAL_LENGTH) {
//       toast({
//         title: "Error",
//         description: "Serial number cannot be more than 12 digits",
//         variant: "destructive",
//       });
//       return;
//     }
//     setSerialNumber(value);
//   };

//   const handleDownloadReceipt = async () => {
//     try {
//       const lastSubmittedData = JSON.parse(
//         localStorage.getItem("lastSubmittedSaleMeters") || "{}"
//       );

//       const blob = await pdf(
//         <MeterSalesReceipt
//           meters={lastSubmittedData.meters}
//           destination={lastSubmittedData.destination}
//           recipient={lastSubmittedData.recipient}
//           unitPrices={lastSubmittedData.unitPrices}
//           userName={lastSubmittedData.userName}
//           customerType={lastSubmittedData.customerType}
//           customerCounty={lastSubmittedData.customerCounty}
//           customerContact={lastSubmittedData.customerContact}
//         />
//       ).toBlob();

//       const url = URL.createObjectURL(blob);
//       const link = document.createElement("a");
//       link.href = url;
//       link.download = `meter-sales-${
//         new Date().toISOString().split("T")[0]
//       }.pdf`;
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);
//       URL.revokeObjectURL(url);

//       // Clear the submitted meters after download
//       localStorage.removeItem("lastSubmittedSaleMeters");
//       setIsSubmitted(false);

//       toast({
//         title: "Success",
//         description: "Receipt downloaded successfully!",
//         style: { backgroundColor: "#2ECC40", color: "white" },
//       });
//     } catch (error) {
//       console.error("Error downloading receipt:", error);
//       toast({
//         title: "Error",
//         description: "Failed to download receipt. Please try again.",
//         variant: "destructive",
//         style: { backgroundColor: "#FF4136", color: "white" },
//       });
//     }
//   };

//   // Replace the getUniqueTypes function with this version
//   const getUniqueTypes = () => {
//     return Array.from(new Set(meters.map((meter) => meter.type)));
//   };

//   // Add this function near the other handlers
//   const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
//     if (e.key === "Enter" && serialNumber.trim()) {
//       e.preventDefault();
//       // The serial number validation and addition is already handled in the useEffect
//       // Just need to ensure the input is not empty
//     }
//   };

//   const handleAddMeters = (
//     newMeters: Array<{ id: string; serialNumber: string; type: string }>
//   ) => {
//     setMeters((prevMeters) => {
//       // Filter out any meters that are already in the list
//       const uniqueNewMeters = newMeters.filter(
//         (newMeter) =>
//           !prevMeters.some((m) => m.serialNumber === newMeter.serialNumber)
//       );

//       if (uniqueNewMeters.length > 0) {
//         const updatedMeters = [...prevMeters, ...uniqueNewMeters];
//         // Update localStorage
//         localStorage.setItem("cachedSellMeters", JSON.stringify(updatedMeters));
//         return updatedMeters;
//       }
//       return prevMeters;
//     });
//   };

//   return (
//     <div
//       className={`${geistMono.className} bg-white shadow-md rounded-lg p-6 max-w-2xl mx-auto`}>
//       <div className='flex flex-col min-h-[600px]'>
//         <div className='flex-1'>
//           <div className='flex justify-between items-center mb-6'>
//             <h2 className='text-2xl font-bold text-gray-800'>Sell Meters</h2>
//             <div className='flex items-center gap-2'>
//               <FileUploadHandler
//                 onMetersAdd={handleAddMeters}
//                 currentUser={currentUser}
//               />
//               <Button onClick={handleClearForm} variant='outline'>
//                 Clear Form
//               </Button>
//             </div>
//           </div>

//           <div className='space-y-4 mb-6'>
//             <Input
//               ref={serialInputRef}
//               type='text'
//               placeholder='Serial Number'
//               value={serialNumber.toUpperCase()}
//               onChange={handleSerialNumberChange}
//               onKeyPress={handleKeyPress}
//               required
//               maxLength={12}
//               className='w-full'
//             />
//             {errorMessage && <p className='text-red-500'>{errorMessage}</p>}
//           </div>

//           {/* Update the download receipt button section */}
//           {isSubmitted && meters.length === 0 && (
//             <div className='mb-6 relative'>
//               <Button
//                 onClick={handleDownloadReceipt}
//                 className='w-full bg-[#2ECC40] hover:bg-[#28a035] text-white'>
//                 Download Sales Receipt
//               </Button>
//               <Button
//                 onClick={() => setIsSubmitted(false)}
//                 variant='ghost'
//                 size='icon'
//                 className='absolute -right-2 -top-2 h-6 w-6 rounded-full bg-gray-200 hover:bg-gray-300'
//                 aria-label='Dismiss'>
//                 <X className='h-4 w-4' />
//               </Button>
//             </div>
//           )}

//           {meters.length > 0 && (
//             <>
//               {saleDetails ? (
//                 <>
//                   <div className='flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg mb-4'>
//                     <Badge
//                       variant='secondary'
//                       className='bg-gradient-to-r from-green-500/50 to-blue-500/50 text-black'>
//                       Destination: {saleDetails.destination}
//                     </Badge>
//                     <Badge
//                       variant='secondary'
//                       className='bg-gradient-to-r from-orange-500/50 to-yellow-500/50 text-black'>
//                       Recipient: {saleDetails.recipient}
//                     </Badge>
//                     <Badge
//                       variant='secondary'
//                       className='bg-gradient-to-r from-purple-500/50 to-pink-500/50 text-black'>
//                       Contact: {saleDetails.customerContact}
//                     </Badge>
//                     <Badge
//                       variant='secondary'
//                       className='bg-gradient-to-r from-blue-500/50 to-indigo-500/50 text-black'>
//                       Type: {saleDetails.customerType}
//                     </Badge>
//                     <Badge
//                       variant='secondary'
//                       className='bg-gradient-to-r from-red-500/50 to-orange-500/50 text-black'>
//                       County: {saleDetails.customerCounty}
//                     </Badge>
//                     {Object.entries(saleDetails.unitPrices).map(
//                       ([type, price]) => (
//                         <Badge
//                           key={type}
//                           variant='secondary'
//                           className='bg-gradient-to-r from-indigo-500/50 to-purple-500/50 text-black'>
//                           {type}: {price}
//                         </Badge>
//                       )
//                     )}
//                     <Button
//                       variant='ghost'
//                       size='sm'
//                       onClick={() => setIsDialogOpen(true)}
//                       className='ml-2 bg-yellow-500/50 to-blue-500/50 text-black'>
//                       <Edit2 className='h-4 w-4 mr-1' />
//                       Edit Details
//                     </Button>
//                   </div>

//                   <SaleDetailsDialog
//                     isOpen={isDialogOpen}
//                     onOpenChange={setIsDialogOpen}
//                     onSubmit={(data) => {
//                       setSaleDetails(data);
//                       setIsDialogOpen(false);
//                     }}
//                     initialData={saleDetails}
//                     meterTypes={getUniqueTypes()}
//                   />
//                 </>
//               ) : (
//                 <SaleDetailsDialog
//                   isOpen={isDialogOpen}
//                   onOpenChange={setIsDialogOpen}
//                   onSubmit={(data) => {
//                     setSaleDetails(data);
//                     setIsDialogOpen(false);
//                   }}
//                   initialData={null}
//                   meterTypes={getUniqueTypes()}
//                   trigger={
//                     <Button className='w-full bg-[#000080] hover:bg-[#000066] mb-4'>
//                       Add Sale Details
//                     </Button>
//                   }
//                 />
//               )}

//               {/* Group the action buttons together */}
//               {meters.length > 0 ? (
//                 <div className='space-y-4 mb-6'>
//                   {saleDetails && (
//                     <Button
//                       onClick={handleSellMeters}
//                       disabled={isSellingMeters}
//                       className='w-full bg-[#E46020] hover:bg-[#e46120] text-white'>
//                       {isSellingMeters ? (
//                         <>
//                           <span className='mr-2'>Selling Meters...</span>
//                           <div className='h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent' />
//                         </>
//                       ) : (
//                         `Confirm Sale of ${meters.length} Meter${
//                           meters.length !== 1 ? "s" : ""
//                         }`
//                       )}
//                     </Button>
//                   )}
//                 </div>
//               ) : (
//                 // Show download button when meters are empty (after submission)
//                 isSubmitted && (
//                   <div className='space-y-4 mb-6 relative'>
//                     <Button
//                       onClick={handleDownloadReceipt}
//                       className='w-full bg-[#2ECC40] hover:bg-[#28a035] text-white'>
//                       Download Receipt
//                     </Button>
//                     <Button
//                       onClick={() => setIsSubmitted(false)}
//                       variant='ghost'
//                       size='icon'
//                       className='absolute -right-2 -top-2 h-6 w-6 rounded-full bg-gray-200 hover:bg-gray-300'
//                       aria-label='Dismiss'>
//                       <X className='h-4 w-4' />
//                     </Button>
//                   </div>
//                 )
//               )}

//               <div className='mt-6'>
//                 <div className='flex justify-between items-center mb-2'>
//                   <h3 className='text-lg font-semibold text-gray-700'>
//                     Meters to Sell
//                   </h3>
//                   <span className='text-sm text-gray-500'>
//                     Total: {meters.length.toLocaleString()} meter
//                     {meters.length !== 1 ? "s" : ""}
//                   </span>
//                 </div>
//                 <div className='border rounded-lg max-h-[400px] overflow-y-auto'>
//                   <Table>
//                     <TableHeader>
//                       <TableRow>
//                         <TableHead>Serial Number</TableHead>
//                         <TableHead>Type</TableHead>
//                         <TableHead>Action</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {meters.map((meter) => (
//                         <TableRow key={meter.id}>
//                           <TableCell>{meter.serialNumber}</TableCell>
//                           <TableCell>{meter.type}</TableCell>
//                           <TableCell>
//                             <Button
//                               variant='ghost'
//                               size='icon'
//                               onClick={() =>
//                                 handleRemoveMeter(meter.serialNumber)
//                               }>
//                               <X className='h-4 w-4' />
//                             </Button>
//                           </TableCell>
//                         </TableRow>
//                       ))}
//                     </TableBody>
//                   </Table>
//                 </div>
//               </div>
//             </>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
