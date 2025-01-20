"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  addMeters,
  getUserProfile,
  checkMeterExists,
  addMeterPurchaseBatch,
  getAllMeters,
  clearMetersCache,
  checkMeterExistsInSoldMeters,
  checkMeterExistsInAgentInventory,
} from "@/lib/actions/supabaseActions";
import { useToast } from "@/hooks/use-toast";
import { FileUploadHandler } from "./FileUploadHandler";
import { MeterInputForm } from "./MeterInputForm";
import { MetersList } from "./MetersList";
// import { SubmissionHandler } from "./SubmissionHandler";
import localFont from "next/font/local";
import { pdf } from "@react-pdf/renderer";
import MeterAdditionReceipt from "./MeterAdditionReceipt";
import { Badge } from "@/components/ui/badge";
import { Edit2, Loader2, X, FileDown } from "lucide-react";
import BatchDetailsDialog from "./BatchDetailsDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

interface AddMeterFormProps {
  currentUser: {
    id: string;
    name: string;
  };
}

interface Meter {
  serialNumber: string;
  type: string;
  addedBy: string;
  addedAt: string;
  adderName: string;
}

interface BatchDetails {
  purchaseDate: string;
  batchGroups: Array<{
    type: string;
    count: number;
    unitPrice: string;
    totalCost: string;
  }>;
}

const normalizeSerialNumber = (serial: string) => {
  // Remove leading zeros and convert to uppercase
  return serial.replace(/^0+/, "").toUpperCase();
};

const findExistingMeter = (serialNumber: string, meters: Meter[]) => {
  return meters.findIndex(
    (m) =>
      normalizeSerialNumber(m.serialNumber) ===
      normalizeSerialNumber(serialNumber)
  );
};

const MAX_SERIAL_LENGTH = 12;

export default function AddMeterForm({ currentUser }: AddMeterFormProps) {
  const [meters, setMeters] = useState<Meter[]>(() => {
    const cached = localStorage.getItem("cachedAddMeters");
    return cached ? JSON.parse(cached) : [];
  });
  const [serialNumber, setSerialNumber] = useState("");
  const [selectedType, setSelectedType] = useState("Split");
  const [isChecking, setIsChecking] = useState(false);
  const [exists, setExists] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(() => {
    return localStorage.getItem("lastSubmittedMeters") !== null;
  });
  const [adderName, setAdderName] = useState("");
  const [isBatchDetailsOpen, setIsBatchDetailsOpen] = useState(false);
  const [batchDetails, setBatchDetails] = useState<BatchDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | React.ReactNode>(
    ""
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const { toast } = useToast();

  // Cache meters whenever they change
  useEffect(() => {
    localStorage.setItem("cachedAddMeters", JSON.stringify(meters));
  }, [meters]);

  // Add real-time validation effect
  useEffect(() => {
    let isSubscribed = true;

    const checkSerialNumber = async () => {
      if (!serialNumber.trim()) {
        setExists(false);
        setIsChecking(false);
        setErrorMessage("Input Serial Number");
        return;
      }

      setIsChecking(true);
      try {
        const normalizedSerial = normalizeSerialNumber(serialNumber);

        // First check if it exists in current batch
        const existingIndex = findExistingMeter(normalizedSerial, meters);
        if (existingIndex !== -1) {
          setExists(true);
          setIsChecking(false);
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

        // Then check database
        const exists = await checkMeterExists(normalizedSerial);

        if (isSubscribed) {
          setExists(exists);
          if (exists) {
            setErrorMessage("Serial Number Already Exists in Database");
            toast({
              title: "Error",
              description: "Serial Number Already Exists in Database",
              variant: "destructive",
            });
          } else {
            setErrorMessage("");
          }
        }
      } catch (error) {
        if (isSubscribed) {
          setErrorMessage("Failed to check serial number");
          toast({
            title: "Error",
            description: "Failed to check serial number",
            variant: "destructive",
          });
        }
      } finally {
        if (isSubscribed) {
          setIsChecking(false);
        }
      }
    };

    const timeoutId = setTimeout(checkSerialNumber, 500);

    return () => {
      isSubscribed = false;
      clearTimeout(timeoutId);
    };
  }, [serialNumber, meters, toast]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const profile = await getUserProfile(currentUser.id);
        // Set adderName from profile, fallback to currentUser.name, or use empty string as last resort
        setAdderName(profile?.name || currentUser.name || "");
      } catch (error) {
        console.error("Error fetching user profile:", error);
        // Fallback to currentUser.name if profile fetch fails
        setAdderName(currentUser.name || "");
      }
    };

    // Set initial adderName from currentUser prop
    setAdderName(currentUser.name || "");
    // Then try to fetch the profile
    fetchUserProfile();
  }, [currentUser.id, currentUser.name]);

  const handleAddMeter = useCallback(async () => {
    // If already processing a meter, ignore new requests
    if (isProcessing || isChecking) {
      return;
    }

    if (!serialNumber.trim()) {
      toast({
        title: "Error",
        description: "Serial number cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (!adderName) {
      toast({
        title: "Error",
        description: "User name is required",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setIsChecking(true);
    try {
      const normalizedSerial = normalizeSerialNumber(serialNumber);

      // First check if it exists in current batch
      const existingIndex = findExistingMeter(normalizedSerial, meters);
      if (existingIndex !== -1) {
        setExists(true);
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

      // Check all existence conditions in parallel
      const [existsInDB, existsInSold, existsInAgent] = await Promise.all([
        checkMeterExists(normalizedSerial),
        checkMeterExistsInSoldMeters(normalizedSerial),
        checkMeterExistsInAgentInventory(normalizedSerial),
      ]);

      if (existsInDB) {
        setExists(true);
        setErrorMessage("Serial Number Already Exists in Database");
        toast({
          title: "Error",
          description: "Serial Number Already Exists in Database",
          variant: "destructive",
        });
        return;
      }

      if (existsInSold) {
        setExists(true);
        setErrorMessage("Meter already exists in sold meters");
        toast({
          title: "Error",
          description: "Meter already exists in sold meters",
          variant: "destructive",
        });
        return;
      }

      if (existsInAgent) {
        setExists(true);
        setErrorMessage("Meter already exists in agent inventory");
        toast({
          title: "Error",
          description: "Meter already exists in agent inventory",
          variant: "destructive",
        });
        return;
      }

      // If we get here, the meter doesn't exist anywhere
      const newMeter = {
        serialNumber: normalizedSerial,
        type: selectedType,
        addedBy: currentUser.id,
        addedAt: new Date().toISOString(),
        adderName: adderName,
      };

      setMeters((prev) => [newMeter, ...prev]);
      setSerialNumber("");
      setErrorMessage("");
      setExists(false);

      toast({
        title: "Success",
        description: "Meter added to the list",
        style: { backgroundColor: "#2ECC40", color: "white" },
      });
    } catch (error) {
      console.error("Error adding meter:", error);
      toast({
        title: "Error",
        description: "Failed to add meter",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
      setIsProcessing(false);
    }
  }, [
    serialNumber,
    selectedType,
    currentUser.id,
    adderName,
    meters,
    toast,
    isProcessing,
    isChecking,
  ]);

  const handleRemoveMeter = useCallback((index: number) => {
    setMeters((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!adderName) {
      toast({
        title: "Error",
        description: "User name is required",
        variant: "destructive",
      });
      return;
    }

    if (!batchDetails) {
      toast({
        title: "Error",
        description: "Please add purchase details first",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create batch record first
      const batchData = await addMeterPurchaseBatch({
        purchaseDate: new Date(batchDetails.purchaseDate),
        addedBy: currentUser.id,
        batchGroups: batchDetails.batchGroups.map((group) => ({
          type: group.type,
          count: group.count,
          unitPrice: group.unitPrice,
          totalCost: group.totalCost,
        })),
      });

      // Then add meters with batch reference
      const metersToSubmit = meters.map((meter) => ({
        serial_number: meter.serialNumber,
        type: meter.type.toLowerCase(),
        added_by: meter.addedBy,
        added_at: meter.addedAt,
        adder_name: adderName,
        batch_id: batchData.id,
      }));

      await addMeters(metersToSubmit);

      // Store submission details for receipt
      localStorage.setItem(
        "lastSubmittedMeters",
        JSON.stringify({
          meters,
          adderName,
          batchDetails: batchDetails,
        })
      );

      // Clear all cached data
      setMeters([]);
      setBatchDetails(null);
      setIsSubmitted(true);
      localStorage.removeItem("cachedAddMeters");
      localStorage.removeItem("cachedBatchDetails");
      localStorage.removeItem("cachedMetersTable");

      toast({
        title: "Success",
        description:
          "Meters added successfully! You can now download the receipt.",
        style: { backgroundColor: "#0074D9", color: "white" },
      });
    } catch (error: any) {
      console.error("Error adding meters:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add meters. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsBatchDetailsOpen(false);
    }
  }, [adderName, batchDetails, currentUser.id, meters, toast]);

  const handleBatchDetailsSubmit = async (details: BatchDetails) => {
    setIsSubmitting(true);
    try {
      // Create batch record first
      const batchData = await addMeterPurchaseBatch({
        purchaseDate: new Date(details.purchaseDate),
        addedBy: currentUser.id,
        batchGroups: details.batchGroups.map((group) => ({
          type: group.type,
          count: group.count,
          unitPrice: group.unitPrice,
          totalCost: group.totalCost,
        })),
      });

      // Then add meters with batch reference
      const metersToSubmit = meters.map((meter) => ({
        serial_number: meter.serialNumber,
        type: meter.type.toLowerCase(),
        added_by: meter.addedBy,
        added_at: meter.addedAt,
        adder_name: adderName,
        batch_id: batchData.id,
      }));

      await addMeters(metersToSubmit);

      // Store submission details for receipt
      localStorage.setItem(
        "lastSubmittedMeters",
        JSON.stringify({
          meters,
          adderName,
          batchDetails: details,
        })
      );

      setMeters([]);
      setBatchDetails(null);
      setIsSubmitted(true);
      localStorage.removeItem("cachedAddMeters");

      toast({
        title: "Success",
        description:
          "Meters added successfully! You can now download the receipt.",
        style: { backgroundColor: "#0074D9", color: "white" },
      });
    } catch (error: any) {
      console.error("Error adding meters:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add meters. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadReceipt = useCallback(async () => {
    try {
      const lastSubmittedData = JSON.parse(
        localStorage.getItem("lastSubmittedMeters") || "{}"
      );

      // Ensure we have the required data
      if (!lastSubmittedData.meters || !lastSubmittedData.adderName) {
        throw new Error("Receipt data not found");
      }

      // Generate meter counts from the stored data
      const meterCounts = lastSubmittedData.meters.reduce(
        (acc: any[], meter: Meter) => {
          const existingType = acc.find((item) => item.type === meter.type);
          if (existingType) {
            existingType.count += 1;
          } else {
            acc.push({ type: meter.type, count: 1 });
          }
          return acc;
        },
        []
      );

      const blob = await pdf(
        <MeterAdditionReceipt
          meterCounts={meterCounts}
          adderName={lastSubmittedData.adderName}
          batchDetails={lastSubmittedData.batchDetails}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `meter-addition-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Clear the submitted meters after download
      localStorage.removeItem("lastSubmittedMeters");
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
  }, [toast]);

  const handleClearForm = useCallback(() => {
    setMeters([]);
    setSerialNumber("");
    setSelectedType("Split");
    setBatchDetails(null);
    setErrorMessage("Input Serial Number");
    // Clear all caches
    localStorage.removeItem("cachedAddMeters");
    localStorage.removeItem("cachedBatchDetails");
    localStorage.removeItem("cachedMetersTable");
    localStorage.removeItem("cachedAddMetersBackup");
    localStorage.removeItem("cachedBatchDetailsBackup");
    // Clear the meters existence cache
    clearMetersCache();
  }, []);

  const generateMeterCountsFromMeters = (metersArray: any[]) => {
    const counts: { [key: string]: number } = {};
    metersArray.forEach((meter: any) => {
      counts[meter.type] = (counts[meter.type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({
      type,
      count,
    }));
  };

  // useEffect for caching batch details
  useEffect(() => {
    // Load cached batch details on mount
    const cachedDetails = localStorage.getItem("cachedBatchDetails");
    if (cachedDetails) {
      setBatchDetails(JSON.parse(cachedDetails));
    }
  }, []);

  // Update whenever batch details change
  useEffect(() => {
    if (batchDetails) {
      localStorage.setItem("cachedBatchDetails", JSON.stringify(batchDetails));
    }
  }, [batchDetails]);

  // Add this effect to handle sheet state
  useEffect(() => {
    // Load cached data when component mounts
    const cachedMeters = localStorage.getItem("cachedMetersTable");
    const cachedDetails = localStorage.getItem("cachedBatchDetails");

    if (cachedMeters) {
      try {
        const parsedMeters = JSON.parse(cachedMeters);
        setMeters(parsedMeters);
      } catch (error) {
        console.error("Error parsing cached meters:", error);
      }
    }

    if (cachedDetails) {
      try {
        const parsedDetails = JSON.parse(cachedDetails);
        setBatchDetails(parsedDetails);
      } catch (error) {
        console.error("Error parsing cached details:", error);
      }
    }
  }, []);

  const handleTemplateDownload = (type: "csv" | "xlsx") => {
    const filename = type === "csv" ? "ctemplate.csv" : "xtemplate.xlsx";
    const link = document.createElement("a");
    link.href = `/exceltemplates/${filename}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Add this effect to cache the table data
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (meters.length > 0) {
        localStorage.setItem("cachedMetersTable", JSON.stringify(meters));
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Load cached data on mount
    const cachedData = localStorage.getItem("cachedMetersTable");
    if (cachedData) {
      try {
        const parsedData = JSON.parse(cachedData);
        setMeters(parsedData);
      } catch (error) {
        console.error("Error parsing cached data:", error);
      }
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const handleExistsChange = (exists: boolean, message?: string) => {
    setExists(exists);
    if (message) {
      setErrorMessage(message);
    }
  };

  return (
    <div
      className={`${geistMono.className} bg-white shadow-md rounded-lg p-2 sm:p-6 max-w-[100%] mx-auto`}>
      <div className='flex flex-col max-h-[100vh]'>
        <div className='flex-1'>
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2 sm:gap-0'>
            <h2 className='text-xl sm:text-2xl font-bold text-gray-800'>
              Add Meters
            </h2>
            <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
              <div className='flex items-center gap-2'>
                <FileUploadHandler
                  onMetersAdd={(newMeters) =>
                    setMeters((prev) => [...newMeters, ...prev])
                  }
                  currentUser={currentUser}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <div className='cursor-pointer'>
                      <Badge
                        variant='outline'
                        className='hover:bg-gray-100 flex items-center gap-1 cursor-pointer w-[100px] justify-center'>
                        <FileDown className='h-3 w-3' />
                        Templates
                      </Badge>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end' className='w-56'>
                    <DropdownMenuItem
                      onClick={() => handleTemplateDownload("csv")}
                      className='cursor-pointer'>
                      Download CSV Template
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleTemplateDownload("xlsx")}
                      className='cursor-pointer'>
                      Download Excel Template
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Badge
                  onClick={handleClearForm}
                  variant='outline'
                  className='hover:bg-gray-100 flex items-center gap-1 cursor-pointer w-[100px] justify-center whitespace-nowrap'>
                  <X className='h-3 w-3' />
                  Clear
                </Badge>
              </div>
            </div>
          </div>

          <MeterInputForm
            serialNumber={serialNumber}
            selectedType={selectedType}
            onSerialNumberChange={(value) => {
              if (value.length > MAX_SERIAL_LENGTH) {
                toast({
                  title: "Error",
                  description: "Serial number cannot be more than 12 digits",
                  variant: "destructive",
                });
                return;
              }
              setSerialNumber(value);
              setExists(false);
              setIsChecking(false);
              setErrorMessage("");
            }}
            onTypeChange={setSelectedType}
            onAddMeter={handleAddMeter}
            isChecking={isChecking}
            exists={exists}
            errorMessage={errorMessage}
            onExistsChange={handleExistsChange}
          />

          {meters.length > 0 && (
            <>
              {batchDetails ? (
                <div className='space-y-4 mb-6'>
                  <div className='flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg'>
                    <Badge
                      variant='secondary'
                      className='bg-gradient-to-r from-blue-500/50 to-indigo-500/50 text-black'>
                      Purchase Date:{" "}
                      {new Date(batchDetails.purchaseDate).toLocaleDateString()}
                    </Badge>
                    {batchDetails.batchGroups.map((group) => (
                      <Badge
                        key={group.type}
                        variant='secondary'
                        className='bg-gradient-to-r from-indigo-500/50 to-purple-500/50 text-black'>
                        {group.type}: KES {group.totalCost}
                      </Badge>
                    ))}
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => setIsBatchDetailsOpen(true)}
                      className='ml-2 bg-yellow-500/50 to-blue-500/50 text-black'>
                      <Edit2 className='h-4 w-4 mr-1' />
                      Edit Details
                    </Button>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    className='w-full bg-[#E46020] hover:bg-[#e46120] text-white'
                    disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Adding Records To the Database...
                      </>
                    ) : (
                      `Submit ${meters.length} Meter${
                        meters.length !== 1 ? "s" : ""
                      }`
                    )}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setIsBatchDetailsOpen(true)}
                  className='w-full bg-[#000080] hover:bg-[#000066] mb-4'>
                  Add Purchase Details
                </Button>
              )}

              <BatchDetailsDialog
                isOpen={isBatchDetailsOpen}
                onOpenChange={setIsBatchDetailsOpen}
                onSubmit={(data) => {
                  setBatchDetails(data);
                  setIsBatchDetailsOpen(false);
                }}
                initialData={batchDetails}
                meterGroups={Object.entries(
                  meters.reduce<{ [key: string]: number }>((acc, meter) => {
                    const type = meter.type.toLowerCase();
                    acc[type] = (acc[type] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([type, count]) => ({ type, count }))}
              />
            </>
          )}

          <MetersList meters={meters} onRemoveMeter={handleRemoveMeter} />

          {isSubmitted && meters.length === 0 && (
            <div className='mt-6 relative'>
              <Button
                onClick={handleDownloadReceipt}
                className='w-full bg-[#2ECC40] hover:bg-[#28a035] text-white'>
                Download Receipt
              </Button>
              <Button
                onClick={() => {
                  setIsSubmitted(false);
                  localStorage.removeItem("lastSubmittedMeters");
                }}
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
