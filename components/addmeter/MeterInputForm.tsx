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
    <div className='space-y-4 mb-6'>
      <div className='flex flex-col sm:flex-row gap-2 sm:gap-4'>
        <div className="flex-1">
          <Input
            type='text'
            placeholder='Scan Serial Number'
            value={serialNumber.toUpperCase()}
            onChange={(e) => onSerialNumberChange(e.target.value)}
            onKeyPress={handleKeyPress}
            required
            className={`min-w-1/2 ${exists ? 'border-red-500 focus:ring-red-500' : ''}`}
            ref={inputRef}
            autoFocus
          />
          {serialNumber.trim() && (
            <div className="mt-1">
              {isChecking ? (
                <p className="text-sm text-gray-500">Checking serial number...</p>
              ) : exists ? (
                <p className="text-sm text-red-500 font-medium">
                  Serial Number Already Exists
                </p>
              ) : (
                <p className="text-sm text-green-500">Serial number is available</p>
              )}
            </div>
          )}
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
    </div>
  );
}); 