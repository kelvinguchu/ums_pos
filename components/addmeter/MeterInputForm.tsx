"use client";

import { memo, useRef, useEffect } from 'react';
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
import { getMeterBySerial } from "@/lib/actions/supabaseActions";

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
}: MeterInputFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !exists) {
      e.preventDefault();
      onAddMeter();
    }
  };

  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2'>
        <div className="flex-1">
          <Input
            type='text'
            placeholder='Scan Serial Number'
            value={serialNumber.toUpperCase()}
            onChange={(e) => onSerialNumberChange(e.target.value)}
            onKeyPress={handleKeyPress}
            required
            className={`${exists ? 'border-red-500 focus:ring-red-500' : ''}`}
            ref={inputRef}
            autoFocus
          />
        </div>
        <Select 
          value={selectedType}
          onChange={(e) => onTypeChange(e.target.value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Split">Split</SelectItem>
            <SelectItem value="Integrated">Integrated</SelectItem>
            <SelectItem value="Gas">Gas</SelectItem>
            <SelectItem value="Water">Water</SelectItem>
            <SelectItem value="3 Phase">3 Phase</SelectItem>
            <SelectItem value="Smart">Smart</SelectItem>
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
      <div className="h-6">
        {isChecking ? (
          <p className="text-sm text-gray-500">Checking serial number...</p>
        ) : errorMessage ? (
          <div className="text-sm text-red-500">
            {errorMessage}
          </div>
        ) : serialNumber.trim() && !exists && (
          <p className="text-sm text-green-500">Serial number is available</p>
        )}
      </div>
    </div>
  );
}); 