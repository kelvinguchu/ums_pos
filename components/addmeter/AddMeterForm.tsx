"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  addMeters,
  getUserProfile,
  checkMeterExists,
} from "@/lib/actions/supabaseActions";
import { useToast } from "@/hooks/use-toast";
import { FileUploadHandler } from "./FileUploadHandler";
import { MeterInputForm } from "./MeterInputForm";
import { MetersList } from "./MetersList";
import { SubmissionHandler } from "./SubmissionHandler";
import localFont from "next/font/local";
import { pdf } from "@react-pdf/renderer";
import MeterAdditionReceipt from "./MeterAdditionReceipt";

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

    setIsSubmitting(true);
    try {
      const metersToSubmit = meters.map((meter) => ({
        serial_number: meter.serialNumber,
        type: meter.type.toLowerCase(),
        added_by: meter.addedBy,
        added_at: meter.addedAt,
        adder_name: adderName,
      }));

      await addMeters(metersToSubmit);

      localStorage.setItem("lastSubmittedMeters", JSON.stringify(meters));
      setIsSubmitted(true);
      setMeters([]);
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
  }, [meters, adderName, toast]);

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
    localStorage.removeItem("cachedAddMeters");
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
              <Button
                onClick={() => setIsAutoMode(!isAutoMode)}
                variant={isAutoMode ? "default" : "outline"}
                className={`${
                  isAutoMode ? "bg-green-600 hover:bg-green-700" : ""
                } w-full sm:w-auto`}>
                {isAutoMode ? "Auto Mode Active" : "Activate Auto Mode"}
              </Button>

              <FileUploadHandler
                onMetersAdd={(newMeters) =>
                  setMeters((prev) => [...newMeters, ...prev])
                }
                currentUser={currentUser}
              />

              <Button
                onClick={handleClearForm}
                variant='outline'
                className='w-full sm:w-auto'>
                Clear Form
              </Button>
            </div>
          </div>

          <MeterInputForm
            serialNumber={serialNumber}
            selectedType={selectedType}
            isAutoMode={isAutoMode}
            onSerialNumberChange={setSerialNumber}
            onTypeChange={setSelectedType}
            onAddMeter={handleAddMeter}
            isChecking={isChecking}
            exists={exists}
          />

          <MetersList meters={meters} onRemoveMeter={handleRemoveMeter} />

          <SubmissionHandler
            meters={meters}
            isSubmitting={isSubmitting}
            isSubmitted={isSubmitted}
            onSubmit={handleSubmit}
            userName={currentUser.name}
            onDownloadReceipt={handleDownloadReceipt}
          />
        </div>
      </div>
    </div>
  );
}
