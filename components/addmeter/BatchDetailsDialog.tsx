import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import localFont from "next/font/local";

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

interface BatchGroup {
  type: string;
  count: number;
  unitPrice: string;
  totalCost: string;
}

interface BatchDetails {
  purchaseDate: string;
  batchGroups: BatchGroup[];
}

interface BatchDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: BatchDetails) => void;
  initialData?: BatchDetails | null;
  meterGroups: { type: string; count: number }[];
  trigger?: React.ReactNode;
}

export default function BatchDetailsDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  initialData,
  meterGroups,
  trigger,
}: BatchDetailsDialogProps) {
  const [formData, setFormData] = useState<BatchDetails>(() => ({
    purchaseDate: new Date().toISOString(),
    batchGroups: [],
  }));

  // Update formData when meterGroups changes or dialog opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData({
          purchaseDate: new Date().toISOString(),
          batchGroups: meterGroups.map((group) => ({
            type: group.type,
            count: group.count,
            unitPrice: "",
            totalCost: "0",
          })),
        });
      }
    }
  }, [isOpen, initialData, meterGroups]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form when closing
      setFormData({
        purchaseDate: new Date().toISOString(),
        batchGroups: [],
      });
    }
    onOpenChange(open);
  };

  const calculateTotalCost = (unitPrice: string, count: number): string => {
    const price = parseFloat(unitPrice) || 0;
    const total = price * count;
    return total.toFixed(2);
  };

  const handleUnitPriceChange = (index: number, unitPrice: string) => {
    const newGroups = [...formData.batchGroups];
    const total = calculateTotalCost(unitPrice, newGroups[index].count);

    newGroups[index] = {
      ...newGroups[index],
      unitPrice: unitPrice,
      totalCost: total,
    };

    setFormData((prev) => ({ ...prev, batchGroups: newGroups }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submissionData = {
      ...formData,
      batchGroups: formData.batchGroups.map((group) => ({
        type: group.type,
        count: group.count,
        unitPrice: group.unitPrice,
        totalCost: calculateTotalCost(group.unitPrice, group.count),
      })),
    };
    onSubmit(submissionData);
    handleOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className={`${geistMono.className} sm:max-w-[500px]`}>
        <DialogHeader>
          <DialogTitle className='text-xl font-bold text-center pb-4 border-b'>
            Purchase Batch Details
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-6 pt-4'>
          <div className='grid gap-4'>
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Purchase Date</label>
              <Input
                type='date'
                value={formData.purchaseDate.split("T")[0]}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    purchaseDate: new Date(e.target.value).toISOString(),
                  }))
                }
                className='w-full'
              />
            </div>

            <div className='space-y-4'>
              <label className='text-sm font-medium'>Batch Costs</label>
              {formData.batchGroups.map((group, index) => (
                <div
                  key={`${group.type}-${index}`}
                  className='space-y-2 p-4 border rounded-lg'>
                  <div className='flex justify-between items-center'>
                    <span className='text-sm font-medium'>{group.type}</span>
                    <span className='text-sm text-muted-foreground'>
                      Quantity: {group.count}
                    </span>
                  </div>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='text-xs text-gray-500'>
                        Unit Price (KES)
                      </label>
                      <Input
                        type='number'
                        placeholder='Unit price'
                        value={group.unitPrice}
                        onChange={(e) =>
                          handleUnitPriceChange(index, e.target.value)
                        }
                        required
                        min='0'
                        step='0.01'
                      />
                    </div>
                    <div>
                      <label className='text-xs text-gray-500'>
                        Total Cost (KES)
                      </label>
                      <Input
                        type='text'
                        value={group.totalCost}
                        readOnly
                        className='bg-gray-50'
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button
            type='submit'
            className='w-full bg-[#000080] hover:bg-[#000066] text-white'>
            Save Batch Details
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
