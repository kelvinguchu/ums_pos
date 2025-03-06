"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
import { ToastAction } from "@/components/ui/toast";
import {
  getMeterBySerial,
  removeMeter,
  assignMetersToAgent,
  getAgentsList,
} from "@/lib/actions/supabaseActions";
import { X, Check, ChevronsUpDown, Users, Loader2 } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import AgentAssignmentReceipt from "../agents/AgentAssignmentReceipt";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";

const geistMono = localFont({
  src: "../../public/fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

interface Agent {
  id: string;
  name: string;
  location: string;
}

interface AssignMetersToAgentProps {
  currentUser: any;
  preSelectedAgent?: {
    id: string;
    name: string;
    location: string;
  };
  isSheetOpen?: boolean;
}

export default function AssignMetersToAgent({
  currentUser,
  preSelectedAgent,
  isSheetOpen = false,
}: AssignMetersToAgentProps) {
  const [serialNumber, setSerialNumber] = useState("");
  const [meters, setMeters] = useState<
    Array<{ id: string; serialNumber: string; type: string }>
  >(() => {
    const cachedMeters = localStorage.getItem("cachedAssignMeters");
    return cachedMeters ? JSON.parse(cachedMeters) : [];
  });
  const [selectedAgent, setSelectedAgent] = useState<string>(
    preSelectedAgent?.id || ""
  );
  const [agents, setAgents] = useState<Agent[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | React.ReactNode>(
    "Select an agent and scan meters"
  );
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const serialInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isAssigning, setIsAssigning] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [agentSearchQuery, setAgentSearchQuery] = useState("");

  useEffect(() => {
    const loadAgents = async () => {
      if (preSelectedAgent) {
        setAgents([preSelectedAgent]);
      } else {
        const agentsList = await getAgentsList();
        setAgents(agentsList.filter((agent) => agent.is_active));
      }
    };
    loadAgents();
  }, [preSelectedAgent]);

  useEffect(() => {
    if (serialInputRef.current) {
      serialInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (serialInputRef.current && selectedAgent) {
      serialInputRef.current.focus();
    }
  }, [meters, selectedAgent]);

  useEffect(() => {
    if (!isAssigning && serialInputRef.current && selectedAgent) {
      serialInputRef.current.focus();
    }
  }, [isAssigning, selectedAgent]);

  useEffect(() => {
    const focusTimer = setTimeout(() => {
      if (serialInputRef.current && selectedAgent) {
        serialInputRef.current.focus();
      }
    }, 100);

    return () => clearTimeout(focusTimer);
  }, [selectedAgent, isSheetOpen]);

  const handleSerialNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSerialNumber(e.target.value);
  };

  useEffect(() => {
    const checkSerialNumber = async () => {
      if (!selectedAgent) {
        setErrorMessage("Please select an agent first");
        return;
      }

      if (!serialNumber.trim()) {
        setErrorMessage("Input Serial Number");
        return;
      }

      const existingIndex = meters.findIndex(
        (m) => m.serialNumber.toLowerCase() === serialNumber.toLowerCase()
      );

      if (existingIndex !== -1) {
        setErrorMessage("Serial Number Already in the Table");
        return;
      }

      setIsChecking(true);
      try {
        const meter = await getMeterBySerial(serialNumber);
        if (!meter) {
          setErrorMessage("Meter not found");
          return;
        }

        setMeters([
          {
            id: meter.id,
            serialNumber: meter.serial_number,
            type: meter.type,
          },
          ...meters,
        ]);
        setSerialNumber("");
        setErrorMessage("");

        toast({
          title: "Success",
          description: "Meter added to the list",
          style: { backgroundColor: "#2ECC40", color: "white" },
        });
      } catch (error) {
        console.error("Error retrieving meter:", error);
        setErrorMessage("Failed to retrieve meter. Please try again.");
      } finally {
        setIsChecking(false);
      }
    };

    const timeoutId = setTimeout(checkSerialNumber, 300);
    return () => clearTimeout(timeoutId);
  }, [serialNumber, meters, selectedAgent]);

  const handleRemoveMeter = (index: number) => {
    setMeters(meters.filter((_, i) => i !== index));
  };

  useEffect(() => {
    localStorage.setItem("cachedAssignMeters", JSON.stringify(meters));
  }, [meters]);

  const handleAssignMeters = async () => {
    if (!selectedAgent) {
      setErrorMessage("Please select an agent");
      return;
    }

    if (meters.length === 0) {
      setErrorMessage("No meters to assign");
      return;
    }

    setIsAssigning(true);
    try {
      const selectedAgentDetails = agents.find((a) => a.id === selectedAgent);
      if (!selectedAgentDetails) {
        throw new Error("Agent not found");
      }

      await assignMetersToAgent({
        agentId: selectedAgent,
        meters: meters.map((meter) => ({
          meter_id: meter.id,
          serial_number: meter.serialNumber,
          type: meter.type,
        })),
        assignedBy: currentUser.id,
      });

      // Store assignment details for receipt
      const receiptDetails = {
        meters,
        agentName: selectedAgentDetails.name,
        agentLocation: selectedAgentDetails.location,
        assignedBy: currentUser.name,
      };

      localStorage.setItem(
        "lastAssignmentDetails",
        JSON.stringify(receiptDetails)
      );

      // Clear the cached meters
      localStorage.removeItem("cachedAssignMeters");
      setMeters([]);
      setSelectedAgent("");
      setIsSubmitted(true);

      toast({
        title: "Success",
        description: "Meters assigned successfully!",
        style: { backgroundColor: "#0074D9", color: "white" },
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to assign meters",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDownloadReceipt = async () => {
    try {
      const assignmentDetails = JSON.parse(
        localStorage.getItem("lastAssignmentDetails") || "{}"
      );

      const blob = await pdf(
        <AgentAssignmentReceipt {...assignmentDetails} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `agent-assignment-${
        new Date().toISOString().split("T")[0]
      }.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      localStorage.removeItem("lastAssignmentDetails");
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
        description: "Failed to download receipt",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={`${geistMono.className} bg-white rounded-lg p-6`}>
      <div className='flex flex-col min-h-[600px]'>
        <div className='flex-1'>
          <div className='space-y-4 mb-6'>
            {!preSelectedAgent ? (
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant='outline'
                    role='combobox'
                    aria-expanded={openCombobox}
                    className='w-full justify-between'>
                    {selectedAgent
                      ? agents.find((a) => a.id === selectedAgent)?.name
                      : "Select Agent"}
                    <ChevronsUpDown className='ml-2 h-4 w-4 opacity-50' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-full p-0' align='start'>
                  <Command>
                    <CommandInput
                      placeholder='Search agent...'
                      className='h-9'
                      value={agentSearchQuery}
                      onValueChange={setAgentSearchQuery}
                    />
                    <CommandList>
                      <ScrollArea className='h-[200px]'>
                        <CommandEmpty>No agent found.</CommandEmpty>
                        <CommandGroup>
                          {agents
                            .filter(
                              (agent) =>
                                agent.name
                                  .toLowerCase()
                                  .includes(agentSearchQuery.toLowerCase()) ||
                                agent.location
                                  .toLowerCase()
                                  .includes(agentSearchQuery.toLowerCase())
                            )
                            .map((agent) => (
                              <CommandItem
                                key={agent.id}
                                value={agent.id}
                                onSelect={(value) => {
                                  setSelectedAgent(value);
                                  setOpenCombobox(false);
                                  if (serialInputRef.current) {
                                    serialInputRef.current.focus();
                                  }
                                }}>
                                <Users className='mr-2 h-4 w-4' />
                                <span>{agent.name}</span>
                                <span className='ml-2 text-xs text-muted-foreground'>
                                  {agent.location}
                                </span>
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    selectedAgent === agent.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </ScrollArea>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : null}

            <Input
              ref={serialInputRef}
              type='text'
              placeholder='Serial Number'
              value={serialNumber.toUpperCase()}
              onChange={handleSerialNumberChange}
              disabled={!selectedAgent}
              className='w-full'
            />
            {errorMessage && <p className='text-red-500'>{errorMessage}</p>}
          </div>

          {isSubmitted && meters.length === 0 && (
            <div className='mb-6 relative'>
              <Button
                onClick={handleDownloadReceipt}
                className='w-full bg-[#2ECC40] hover:bg-[#28a035] text-white'>
                Download Assignment Receipt
              </Button>
              <Button
                onClick={() => setIsSubmitted(false)}
                variant='ghost'
                size='icon'
                className='absolute -right-2 -top-2 h-6 w-6 rounded-full bg-gray-200 hover:bg-gray-300'
                aria-label='Dismiss'>
                <X className='h-4 w-4' />
              </Button>
            </div>
          )}

          {meters.length > 0 && (
            <>
              <Button
                onClick={handleAssignMeters}
                className='w-full bg-[#000080] hover:bg-[#000066] text-white mb-6'
                disabled={isAssigning}>
                {isAssigning ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Assigning Meters...
                  </>
                ) : (
                  `Assign ${meters.length} Meter${
                    meters.length > 1 ? "s" : ""
                  } to ${
                    agents.find((a) => a.id === selectedAgent)?.name || "Agent"
                  }`
                )}
              </Button>

              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Serial Number</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className='text-right'>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {meters.map((meter, index) => (
                      <TableRow key={meter.id}>
                        <TableCell className='font-medium'>
                          {meter.serialNumber}
                        </TableCell>
                        <TableCell>{meter.type}</TableCell>
                        <TableCell className='text-right'>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => handleRemoveMeter(index)}
                            className='h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100'>
                            <X className='h-4 w-4' />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
