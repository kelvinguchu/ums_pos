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
import { Textarea } from "@/components/ui/textarea";
import localFont from "next/font/local";

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

interface BatchGroup {
  type: string;
  count: number;
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
  const [formData, setFormData] = useState<BatchDetails>(
    initialData || {
      purchaseDate: new Date().toISOString(),
      batchGroups: meterGroups.map(group => ({
        type: group.type,
        count: group.count,
        totalCost: ""
      }))
    }
  );

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(initialData);
      } else {
        setFormData({
          purchaseDate: new Date().toISOString(),
          batchGroups: meterGroups.map(group => ({
            type: group.type,
            count: group.count,
            totalCost: ""
          }))
        });
      }
    }
  }, [isOpen, initialData, meterGroups]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={`${geistMono.className} sm:max-w-[500px]`}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center pb-4 border-b">
            Purchase Batch Details
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Purchase Date</label>
              <Input
                type="date"
                value={formData.purchaseDate.split('T')[0]}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  purchaseDate: new Date(e.target.value).toISOString()
                }))}
                className="w-full"
              />
            </div>

            <div className="space-y-4">
              <label className="text-sm font-medium">Batch Costs</label>
              {formData.batchGroups.map((group, index) => (
                <div key={group.type} className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center">
                  <span className="text-sm font-medium">{group.type}</span>
                  <span className="text-sm text-muted-foreground">×{group.count}</span>
                  <Input
                    type="number"
                    placeholder="Total cost"
                    value={group.totalCost}
                    onChange={(e) => {
                      const newGroups = [...formData.batchGroups];
                      newGroups[index].totalCost = e.target.value;
                      setFormData(prev => ({ ...prev, batchGroups: newGroups }));
                    }}
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full bg-[#000080] hover:bg-[#000066] text-white">
            Save Batch Details
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
} 