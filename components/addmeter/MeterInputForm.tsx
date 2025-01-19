"use client";

import { memo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  getMeterBySerial,
  checkMeterExistsInSoldMeters,
  checkMeterExistsInAgentInventory,
} from "@/lib/actions/supabaseActions";

interface MeterInputFormProps {
  serialNumber: string;
  selectedType: string;
  onSerialNumberChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onAddMeter: () => void;
  isChecking: boolean;
  exists: boolean;
  isAutoMode: boolean;
  errorMessage: string | React.ReactNode;
  onExistsChange: (exists: boolean, message?: string) => void;
}

export const MeterInputForm = memo(function MeterInputForm({
  serialNumber,
  selectedType,
  onSerialNumberChange,
  onTypeChange,
  onAddMeter,
  isChecking,
  exists,
  isAutoMode,
  errorMessage,
  onExistsChange,
}: MeterInputFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    const checkMeterStatus = async () => {
      if (!serialNumber.trim()) return;

      try {
        // Check in sold_meters
        const existsInSoldMeters = await checkMeterExistsInSoldMeters(
          serialNumber
        );
        if (existsInSoldMeters) {
          onExistsChange(true, "Meter already exists in sold meters");
          return;
        }

        // Check in agent_inventory
        const existsInAgentInventory = await checkMeterExistsInAgentInventory(
          serialNumber
        );
        if (existsInAgentInventory) {
          onExistsChange(true, "Meter already exists in agent inventory");
          return;
        }

        // If not found in either table, reset exists state
        onExistsChange(false);
      } catch (error) {
        console.error("Error checking meter status:", error);
        toast({
          title: "Error",
          description: "Failed to check meter status",
          variant: "destructive",
        });
      }
    };

    const timeoutId = setTimeout(checkMeterStatus, 300);
    return () => clearTimeout(timeoutId);
  }, [serialNumber, onExistsChange, toast]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !exists) {
      e.preventDefault();
      onAddMeter();
    }
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2'>
        <div className='flex-1'>
          <Input
            type='text'
            placeholder='Scan Serial Number'
            value={serialNumber.toUpperCase()}
            onChange={(e) => onSerialNumberChange(e.target.value)}
            onKeyPress={handleKeyPress}
            required
            maxLength={12}
            className={`${exists ? "border-red-500 focus:ring-red-500" : ""}`}
            ref={inputRef}
            autoFocus
          />
        </div>
        <Select value={selectedType} onChange={(e) => onTypeChange(e.target.value)}>
          <SelectTrigger className='w-[180px]'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='Split'>Split</SelectItem>
            <SelectItem value='Integrated'>Integrated</SelectItem>
            <SelectItem value='Gas'>Gas</SelectItem>
            <SelectItem value='Water'>Water</SelectItem>
            <SelectItem value='3 Phase'>3 Phase</SelectItem>
            <SelectItem value='Smart'>Smart</SelectItem>
          </SelectContent>
        </Select>
        {!isAutoMode && (
          <Button
            onClick={onAddMeter}
            disabled={!serialNumber || isChecking || exists}>
            Add Meter
          </Button>
        )}
      </div>
      <div className='h-6'>
        {isChecking ? (
          <p className='text-sm text-gray-500'>Checking serial number...</p>
        ) : errorMessage ? (
          <div className='text-sm text-red-500'>{errorMessage}</div>
        ) : (
          serialNumber.trim() &&
          !exists && (
            <p className='text-sm text-green-500'>Serial number is available</p>
          )
        )}
      </div>
    </div>
  );
});
