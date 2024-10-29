"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Search } from "lucide-react";
import localFont from "next/font/local";
import { getAgentInventory } from "@/lib/actions/supabaseActions";

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

interface AgentInventoryProps {
  agentId: string;
}

interface MeterInventory {
  id: string;
  serial_number: string;
  type: string;
  assigned_at: string;
}

export default function AgentInventory({ agentId }: AgentInventoryProps) {
  const [inventory, setInventory] = useState<MeterInventory[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const data = await getAgentInventory(agentId);
        setInventory(data || []);
      } catch (error) {
        console.error('Error fetching inventory:', error);
        toast({
          title: "Error",
          description: "Failed to load inventory",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventory();
  }, [agentId]);

  const filteredInventory = inventory.filter(meter =>
    meter.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`${geistMono.className} p-2 sm:p-4`}>
      <div className="relative mb-4">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-[#000080]" />
        <Input
          placeholder="Search by serial number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="rounded-md border">
        <div className="overflow-auto max-w-[100vw] sm:max-w-full">
          <div className="min-w-[300px] sm:min-w-0">
            {/* Desktop View */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[#000080]">Serial Number</TableHead>
                    <TableHead className="text-[#000080]">Type</TableHead>
                    <TableHead className="text-[#000080]">Assigned Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-[#000080]">
                        Loading inventory...
                      </TableCell>
                    </TableRow>
                  ) : filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-[#000080]">
                        {searchTerm ? "No meters found matching search" : "No meters assigned"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory.map((meter) => (
                      <TableRow key={meter.id}>
                        <TableCell className="font-medium">{meter.serial_number}</TableCell>
                        <TableCell>{meter.type}</TableCell>
                        <TableCell>
                          {new Date(meter.assigned_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile View */}
            <div className="block sm:hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[#000080]">Serial Number</TableHead>
                    <TableHead className="text-[#000080] text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-8 text-[#000080]">
                        Loading inventory...
                      </TableCell>
                    </TableRow>
                  ) : filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-8 text-[#000080]">
                        {searchTerm ? "No meters found matching search" : "No meters assigned"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory.map((meter) => (
                      <TableRow key={meter.id}>
                        <TableCell>
                          <div className="font-medium">{meter.serial_number}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Type: {meter.type}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {new Date(meter.assigned_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 