"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
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
}

export const SubmissionHandler = memo(function SubmissionHandler({
  meters,
  isSubmitting,
  isSubmitted,
  onSubmit,
  userName,
  onDownloadReceipt,
}: SubmissionHandlerProps) {
  const { toast } = useToast();

  const handleDownloadReceipt = async () => {
    if (onDownloadReceipt) {
      await onDownloadReceipt();
      return;
    }

    try {
      const lastSubmittedMeters = JSON.parse(
        localStorage.getItem("lastSubmittedMeters") || "[]"
      ) as Meter[];

      const meterCounts = lastSubmittedMeters.reduce<Record<string, number>>(
        (acc, meter) => {
          const type = meter.type.toLowerCase();
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        },
        {}
      );

      const formattedCounts: MeterCount[] = Object.entries(meterCounts).map(
        ([type, count]) => ({
          type,
          count: Number(count),
        })
      );

      const blob = await pdf(
        <MeterAdditionReceipt
          meterCounts={formattedCounts}
          adderName={userName}
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
      <div className='mt-6'>
        <Button
          onClick={handleDownloadReceipt}
          className='w-full bg-[#2ECC40] hover:bg-[#28a035] text-white'>
          Download Receipt
        </Button>
      </div>
    );
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
