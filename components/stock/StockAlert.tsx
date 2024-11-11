import React from 'react';
import { AlertCircle, Settings2, Save } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStockSettings } from '@/lib/store/stockSettings';
import { useQuery } from '@tanstack/react-query';
import { getRemainingMetersByType } from '@/lib/actions/supabaseActions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import localFont from "next/font/local";

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const METER_TYPES = ['integrated', 'split', 'gas', 'water', 'smart', '3 phase'] as const;

export function StockAlert() {
  const { minimumLevels, setMinimumLevel } = useStockSettings();
  const [isOpen, setIsOpen] = React.useState(false);
  const { userRole } = useAuth();
  const { toast } = useToast();
  
  // Local state for form values
  const [formValues, setFormValues] = React.useState<{ [key: string]: string }>(
    METER_TYPES.reduce((acc, type) => ({
      ...acc,
      [type]: minimumLevels[type]?.toString() || '10'
    }), {})
  );

  // Reset form values when minimumLevels changes
  React.useEffect(() => {
    setFormValues(
      METER_TYPES.reduce((acc, type) => ({
        ...acc,
        [type]: minimumLevels[type]?.toString() || '10'
      }), {})
    );
  }, [minimumLevels]);

  // Return null if not admin
  if (userRole !== "admin") {
    return null;
  }

  const { data: stockLevels = [] } = useQuery({
    queryKey: ['remainingMetersByType'],
    queryFn: getRemainingMetersByType,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const validateAndSaveSettings = () => {
    let hasError = false;
    const newValues: { [key: string]: number } = {};

    // Validate all values
    for (const type of METER_TYPES) {
      const value = formValues[type];
      const numValue = parseInt(value);

      if (!value || value.trim() === '') {
        toast({
          title: "Validation Error",
          description: `${type} cannot be empty`,
          variant: "destructive",
        });
        hasError = true;
        continue;
      }

      if (isNaN(numValue)) {
        toast({
          title: "Validation Error",
          description: `${type} must be a valid number`,
          variant: "destructive",
        });
        hasError = true;
        continue;
      }

      if (numValue <= 0) {
        toast({
          title: "Validation Error",
          description: `${type} must be greater than 0`,
          variant: "destructive",
        });
        hasError = true;
        continue;
      }

      newValues[type] = numValue;
    }

    // If no errors, save all values
    if (!hasError) {
      Object.entries(newValues).forEach(([type, value]) => {
        setMinimumLevel(type, value);
      });
      toast({
        title: "Success",
        description: "Minimum levels updated successfully",
        style: { backgroundColor: "#2ECC40", color: "white" },
      });
    }
  };

  // Create a map of current stock levels
  const stockMap = stockLevels.reduce((acc, item) => {
    acc[item.type] = item.remaining_meters;
    return acc;
  }, {} as Record<string, number>);

  // Create alerts for all meter types
  const allStockItems = METER_TYPES.map(type => ({
    type,
    remaining_meters: stockMap[type] || 0
  }));

  const lowStockItems = allStockItems.filter(
    (item) => item.remaining_meters <= (minimumLevels[item.type] || 10)
  );

  const hasLowStock = lowStockItems.length > 0;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <AlertCircle className="h-5 w-5" />
          {hasLowStock && (
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className={`${geistMono.className} min-w-[90vw] lg:min-w-[35vw]`}>
        <SheetHeader>
          <SheetTitle>Stock Alerts</SheetTitle>
        </SheetHeader>
        
        <Tabs defaultValue="alerts" className="mt-6">
          <TabsList>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Minimum Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allStockItems.map((item) => (
                  <TableRow key={item.type}>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {item.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        item.remaining_meters === 0 ? "destructive" : 
                        item.remaining_meters <= (minimumLevels[item.type] || 10) ? "secondary" : 
                        "default"
                      }>
                        {item.remaining_meters}
                      </Badge>
                    </TableCell>
                    <TableCell>{minimumLevels[item.type] || 10}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="settings" className="mt-4">
            <div className="space-y-4">
              {METER_TYPES.map((type) => (
                <div key={type} className="flex items-center justify-between gap-4">
                  <Badge variant="outline" className="capitalize">
                    {type}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={formValues[type]}
                      onChange={(e) => setFormValues(prev => ({
                        ...prev,
                        [type]: e.target.value
                      }))}
                      className="w-24"
                      placeholder="Enter value"
                    />
                    <span className="text-sm text-muted-foreground">units</span>
                  </div>
                </div>
              ))}
              <Button 
                onClick={validateAndSaveSettings}
                className="w-full mt-4"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
} 