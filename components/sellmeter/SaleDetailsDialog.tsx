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

interface UnitPrices {
  [key: string]: string;
}

interface SaleDetails {
  destination: string;
  recipient: string;
  unitPrices: UnitPrices;
}

interface SaleDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SaleDetails) => void;
  initialData?: SaleDetails | null;
  meterTypes: string[];
  trigger?: React.ReactNode;
}

const SaleDetailsDialog = ({ 
  isOpen, 
  onOpenChange, 
  onSubmit, 
  initialData, 
  meterTypes,
  trigger 
}: SaleDetailsDialogProps) => {
  const [formData, setFormData] = useState<SaleDetails>(initialData || {
    destination: '',
    recipient: '',
    unitPrices: {}
  });

  // Add this useEffect to update form data when dialog opens for editing
  useEffect(() => {
    if (isOpen && initialData) {
      setFormData(initialData);
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={geistMono.className}>
        <DialogHeader>
          <DialogTitle>Sale Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Input
              type='text'
              placeholder='Destination'
              value={formData.destination}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  destination: e.target.value,
                }))
              }
              required
            />
            <Input
              type='text'
              placeholder='Recipient'
              value={formData.recipient}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  recipient: e.target.value,
                }))
              }
              required
            />
          </div>
          <div className='space-y-2'>
            <h4 className='text-sm font-semibold'>Unit Prices</h4>
            {meterTypes.map((type) => (
              <div key={type} className='flex items-center gap-2'>
                <label className='text-sm min-w-[80px]'>{type}:</label>
                <Input
                  type='number'
                  placeholder={`${type} Price`}
                  value={formData.unitPrices[type] || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      unitPrices: {
                        ...prev.unitPrices,
                        [type]: e.target.value,
                      },
                    }))
                  }
                  required
                />
              </div>
            ))}
          </div>
          <Button type='submit' className='w-full bg-[#E46020] hover:bg-[#e46120] text-white'>
            Save Details
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SaleDetailsDialog;
