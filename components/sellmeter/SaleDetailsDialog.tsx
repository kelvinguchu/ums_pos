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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import localFont from "next/font/local";
import { ShadcnDatePicker } from "@/components/ui/shadcn-date-picker";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import {
  KENYA_COUNTIES,
  CUSTOMER_TYPES,
  type KenyaCounty,
  type CustomerType,
} from "@/lib/constants/locationData";

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
  customerType: CustomerType;
  customerCounty: KenyaCounty;
  customerContact: string;
  saleDate: CalendarDate;
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
  trigger,
}: SaleDetailsDialogProps) => {
  // Convert CalendarDate to JavaScript Date for the date picker
  const getInitialJsDate = () => {
    if (!initialData?.saleDate) return new Date();

    return new Date(
      initialData.saleDate.year,
      initialData.saleDate.month - 1,
      initialData.saleDate.day
    );
  };

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    getInitialJsDate()
  );

  const [formData, setFormData] = useState<Omit<SaleDetails, "saleDate">>({
    destination: initialData?.destination || "",
    recipient: initialData?.recipient || "",
    unitPrices: initialData?.unitPrices || {},
    customerType: initialData?.customerType || "walk in",
    customerCounty: initialData?.customerCounty || "Nairobi",
    customerContact: initialData?.customerContact || "",
  });

  const [openCombobox, setOpenCombobox] = useState(false);

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        destination: initialData.destination,
        recipient: initialData.recipient,
        unitPrices: initialData.unitPrices,
        customerType: initialData.customerType,
        customerCounty: initialData.customerCounty,
        customerContact: initialData.customerContact,
      });
      setSelectedDate(getInitialJsDate());
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Convert JavaScript Date back to CalendarDate
    let calendarDate;
    if (selectedDate) {
      calendarDate = new CalendarDate(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + 1,
        selectedDate.getDate()
      );
    } else {
      // Default to today if no date selected
      calendarDate = today(getLocalTimeZone());
    }

    onSubmit({
      ...formData,
      saleDate: calendarDate,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className={`${geistMono.className} sm:max-w-[500px] h-[90vh] p-4 sm:p-6`}>
        <DialogHeader>
          <DialogTitle className='text-xl font-bold text-center pb-4 border-b'>
            Sale Details
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className='space-y-6 pt-4 overflow-y-auto max-h-[calc(90vh-150px)] px-1'>
          <div className='grid gap-4 w-full'>
            <div className='space-y-2 w-full'>
              <label className='text-sm font-medium'>Destination</label>
              <Input
                type='text'
                placeholder='Enter destination'
                value={formData.destination}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    destination: e.target.value,
                  }))
                }
                className='w-full'
                required
              />
            </div>

            <div className='space-y-2 w-full'>
              <label className='text-sm font-medium'>Recipient</label>
              <Input
                type='text'
                placeholder='Enter recipient name'
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

            <div className='space-y-2 w-full'>
              <label className='text-sm font-medium'>Contact</label>
              <Input
                type='tel'
                placeholder='Enter contact number'
                value={formData.customerContact}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    customerContact: e.target.value,
                  }))
                }
                className='w-full'
                required
              />
            </div>

            <div className='space-y-2 w-full'>
              <label className='text-sm font-medium'>Sale Date</label>
              <ShadcnDatePicker
                date={selectedDate}
                setDate={setSelectedDate}
                placeholder='Select sale date (default: today)'
              />
              <p className='text-xs text-muted-foreground mt-1'>
                Default is today. Select a past date to backdate the sale.
              </p>
            </div>

            <div className='space-y-2 w-full'>
              <label className='text-sm font-medium'>Customer Type</label>
              <select
                value={formData.customerType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    customerType: e.target.value as CustomerType,
                  }))
                }
                className='w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#000080] focus:border-transparent'>
                {CUSTOMER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className='space-y-2 w-full'>
              <label className='text-sm font-medium'>County</label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant='outline'
                    role='combobox'
                    aria-expanded={openCombobox}
                    className='w-full justify-between bg-white border-2 border-gray-200 hover:border-[#000080] transition-colors font-medium'>
                    {formData.customerCounty || "Select county..."}
                    <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className={`w-[calc(100%-2rem)] p-0 ${geistMono.className}`}
                  align='start'>
                  <Command className='w-full'>
                    <CommandInput
                      placeholder='Search county...'
                      className='h-9 border-none focus:ring-0'
                    />
                    <CommandList className='max-h-[300px] overflow-y-auto scroll-auto scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 scrollbar-track-transparent'>
                      <CommandEmpty>No county found.</CommandEmpty>
                      <CommandGroup>
                        {KENYA_COUNTIES.map((county) => (
                          <CommandItem
                            key={county}
                            value={county}
                            onSelect={(currentValue) => {
                              setFormData((prev) => ({
                                ...prev,
                                customerCounty: currentValue as KenyaCounty,
                              }));
                              setOpenCombobox(false);
                            }}
                            className='hover:bg-[#000080]/10 cursor-pointer font-medium'>
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.customerCounty === county
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {county}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className='space-y-4'>
            <h4 className='text-sm font-semibold border-b pb-2'>Unit Prices</h4>
            <div className='grid gap-3 w-full'>
              {meterTypes.map((type) => (
                <div
                  key={type}
                  className='grid grid-cols-[80px,1fr] items-center gap-1'>
                  <label className='text-sm font-medium'>{type}:</label>
                  <Input
                    type='number'
                    placeholder={`Enter ${type} price`}
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
                    className='w-full'
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          <Button
            type='submit'
            className='w-full bg-[#E46020] hover:bg-[#e46120] text-white'>
            Save Details
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SaleDetailsDialog;
