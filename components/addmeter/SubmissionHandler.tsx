"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import MeterAdditionReceipt from "@/components/addmeter/MeterAdditionReceipt";
import { useToast } from "@/hooks/use-toast";
import type { MeterCount } from "@/components/dailyreports/types";

interface Meter {
  serialNumber: string;
  type: string;
  addedBy: string;
  addedAt: string;
  adderName: string;
}

interface SubmissionHandlerProps {
  meters: Meter[];
  isSubmitting: boolean;
  isSubmitted: boolean;
  onSubmit: () => Promise<void>;
  userName: string;
  onDownloadReceipt?: () => Promise<void>;
  onDismissReceipt?: () => void;
  batchDetails: any | null;
}

interface LastSubmittedData {
  meters: Meter[];
  adderName: string;
  batchDetails: BatchDetails;
}

interface BatchDetails {
  purchaseDate: string;
  batchGroups: Array<{
    type: string;
    count: number;
    totalCost: string;
  }>;
}

export const SubmissionHandler = memo(function SubmissionHandler({
  meters,
  isSubmitting,
  isSubmitted,
  onSubmit,
  userName,
  onDownloadReceipt,
  onDismissReceipt,
  batchDetails,
}: SubmissionHandlerProps) {
  const { toast } = useToast();

  const handleDownloadReceipt = async () => {
    if (onDownloadReceipt) {
      await onDownloadReceipt();
      return;
    }

    try {
      const lastSubmittedData = JSON.parse(
        localStorage.getItem("lastSubmittedMeters") || "{}"
      ) as LastSubmittedData;

      // Ensure we have all required data
      if (!lastSubmittedData.meters || !lastSubmittedData.adderName || !lastSubmittedData.batchDetails) {
        throw new Error("Receipt data not found");
      }

      const meterCounts = lastSubmittedData.meters.reduce((acc: { type: string; count: number }[], meter) => {
        const existingType = acc.find(item => item.type === meter.type);
        if (existingType) {
          existingType.count += 1;
        } else {
          acc.push({ type: meter.type, count: 1 });
        }
        return acc;
      }, []);

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

      localStorage.removeItem("lastSubmittedMeters");

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

  if (meters.length === 0 && !isSubmitted) {
    return null;
  }

  if (isSubmitted) {
    return (
      <div className='mt-6 relative'>
        <Button
          onClick={handleDownloadReceipt}
          className='w-full bg-[#2ECC40] hover:bg-[#28a035] text-white'>
          Download Receipt
        </Button>
        <Button
          onClick={onDismissReceipt}
          variant='ghost'
          size='icon'
          className='absolute -right-2 -top-2 h-6 w-6 rounded-full bg-gray-200 hover:bg-gray-300'
          aria-label='Dismiss'>
          <X className='h-4 w-4' />
        </Button>
      </div>
    );
  }

  if (!batchDetails) {
    return null;
  }

  return (
    <div className='space-y-4 mb-6'>
      <Button
        onClick={onSubmit}
        className='w-full bg-[#E46020] hover:bg-[#e46120] text-white'
        disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            Adding Records To the Database...
          </>
        ) : (
          `Submit ${meters.length} Meter${meters.length !== 1 ? "s" : ""}`
        )}
      </Button>
    </div>
  );
});
