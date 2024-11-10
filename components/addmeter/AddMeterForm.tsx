"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  addMeters,
  getUserProfile,
  checkMeterExists,
  addMeterPurchaseBatch,
} from "@/lib/actions/supabaseActions";
import { useToast } from "@/hooks/use-toast";
import { FileUploadHandler } from "./FileUploadHandler";
import { MeterInputForm } from "./MeterInputForm";
import { MetersList } from "./MetersList";
import { SubmissionHandler } from "./SubmissionHandler";
import localFont from "next/font/local";
import { pdf } from "@react-pdf/renderer";
import MeterAdditionReceipt from "./MeterAdditionReceipt";
import { Badge } from "@/components/ui/badge";
import { Edit2, Loader2 } from "lucide-react";
import BatchDetailsDialog from "./BatchDetailsDialog";

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
    totalCost: string;
  }>;
}

export default function AddMeterForm({ currentUser }: AddMeterFormProps) {
  const [meters, setMeters] = useState<Meter[]>(() => {
    const cached = localStorage.getItem("cachedAddMeters");
    return cached ? JSON.parse(cached) : [];
  });
  const [serialNumber, setSerialNumber] = useState("");
  const [selectedType, setSelectedType] = useState("Split");
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [exists, setExists] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(() => {
    return localStorage.getItem("lastSubmittedMeters") !== null;
  });
  const [adderName, setAdderName] = useState("");
  const [isBatchDetailsOpen, setIsBatchDetailsOpen] = useState(false);
  const [batchDetails, setBatchDetails] = useState<BatchDetails | null>(null);

  const { toast } = useToast();

  // Cache meters whenever they change
  useEffect(() => {
    localStorage.setItem("cachedAddMeters", JSON.stringify(meters));
  }, [meters]);

  // Add real-time validation effect
  useEffect(() => {
    const checkSerialNumber = async () => {
      if (serialNumber.trim()) {
        setIsChecking(true);
        try {
          // First check if it exists in the table
          const existingIndex = meters.findIndex(
            (m) => m.serialNumber.toLowerCase() === serialNumber.toLowerCase()
          );
          if (existingIndex !== -1) {
            setExists(true);
            return;
          }
          // Then check if it exists in the database
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

    const timeoutId = setTimeout(checkSerialNumber, 300);
    return () => clearTimeout(timeoutId);
  }, [serialNumber, meters]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      const profile = await getUserProfile(currentUser.id);
      setAdderName(profile?.name || currentUser.name || "");
    };
    fetchUserProfile();
  }, [currentUser.id, currentUser.name]);

  const handleAddMeter = useCallback(() => {
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

    const newMeter = {
      serialNumber: serialNumber.toUpperCase(),
      type: selectedType,
      addedBy: currentUser.id,
      addedAt: new Date().toISOString(),
      adderName: adderName,
    };

    setMeters((prev) => [newMeter, ...prev]);
    setSerialNumber("");

    toast({
      title: "Success",
      description: "Meter added to the list",
      style: { backgroundColor: "#2ECC40", color: "white" },
    });
  }, [serialNumber, selectedType, currentUser.id, adderName, toast]);

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

    // Group meters by type
    const meterGroups = meters.reduce<{ [key: string]: number }>(
      (acc, meter) => {
        const type = meter.type.toLowerCase();
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {}
    );

    // Convert to array format for BatchDetailsDialog
    const groupsArray = Object.entries(meterGroups).map(([type, count]) => ({
      type,
      count,
    }));

    // Show batch details dialog
    setIsBatchDetailsOpen(true);
  }, [meters, adderName, toast]);

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
      const lastSubmittedMeters = JSON.parse(
        localStorage.getItem("lastSubmittedMeters") || "[]"
      );

      const blob = await pdf(
        <MeterAdditionReceipt
          meterCounts={generateMeterCountsFromMeters(lastSubmittedMeters)}
          adderName={adderName}
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
  }, [adderName]);

  const handleClearForm = useCallback(() => {
    setMeters([]);
    setSerialNumber("");
    setSelectedType("Split");
    setBatchDetails(null);
    localStorage.removeItem("cachedAddMeters");
    localStorage.removeItem("cachedBatchDetails");
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

  // Add useEffect for caching batch details
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

  return (
    <div className={`${geistMono.className} bg-white shadow-md rounded-lg p-2 sm:p-6 max-w-[100%] mx-auto`}>
      <div className='flex flex-col max-h-[100vh]'>
        <div className='flex-1'>
          <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2 sm:gap-0'>
            <h2 className='text-xl sm:text-2xl font-bold text-gray-800'>
              Add Meters
            </h2>
            <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
              <FileUploadHandler
                onMetersAdd={(newMeters) => setMeters((prev) => [...newMeters, ...prev])}
                currentUser={currentUser}
              />
              <Button onClick={handleClearForm} variant='outline' className='w-full sm:w-auto'>
                Clear Form
              </Button>
            </div>
          </div>

          <MeterInputForm
            serialNumber={serialNumber}
            selectedType={selectedType}
            onSerialNumberChange={setSerialNumber}
            onTypeChange={setSelectedType}
            onAddMeter={handleAddMeter}
            isChecking={isChecking}
            exists={exists}
          />

          {meters.length > 0 && (
            <>
              {batchDetails ? (
                <div className='space-y-4 mb-6'>
                  <div className='flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg'>
                    <Badge variant='secondary' className='bg-gradient-to-r from-blue-500/50 to-indigo-500/50 text-black'>
                      Purchase Date: {new Date(batchDetails.purchaseDate).toLocaleDateString()}
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
                    onClick={() => handleBatchDetailsSubmit(batchDetails)}
                    className='w-full bg-[#E46020] hover:bg-[#e46120] text-white'
                    disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Adding Records To the Database...
                      </>
                    ) : (
                      `Add ${meters.length} Meter${meters.length !== 1 ? "s" : ""} to Inventory`
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
            <div className='mb-6'>
              <Button
                onClick={handleDownloadReceipt}
                className='w-full bg-[#2ECC40] hover:bg-[#28a035] text-white'>
                Download Receipt
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
