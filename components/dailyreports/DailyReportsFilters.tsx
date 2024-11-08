import { memo } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FiltersProps {
  searchUser: string;
  selectedType: string;
  onSearchChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export const DailyReportsFilters = memo(function DailyReportsFilters({
  searchUser,
  selectedType,
  onSearchChange,
  onTypeChange,
  onClearFilters,
  hasActiveFilters
}: FiltersProps) {
  return (
    <div className='flex flex-col sm:flex-row gap-4 mb-2 justify-between'>
      <div className='flex flex-col sm:flex-row gap-4'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            type='text'
            placeholder='Search by user...'
            value={searchUser}
            onChange={(e) => onSearchChange(e.target.value)}
            className='pl-9 max-w-xs'
          />
        </div>

        <Select 
          defaultValue={selectedType}
          onChange={(e) => onTypeChange(e.target.value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue>
              {selectedType || "All Types"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Types</SelectItem>
            <SelectItem value="split">Split</SelectItem>
            <SelectItem value="integrated">Integrated</SelectItem>
            <SelectItem value="gas">Gas</SelectItem>
            <SelectItem value="water">Water</SelectItem>
            <SelectItem value="3 Phase">3 Phase</SelectItem>
            <SelectItem value="Smart">Smart</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button
          variant='outline'
          size='sm'
          onClick={onClearFilters}
          className='text-muted-foreground hover:text-foreground'>
          Clear filters
          <X className='ml-2 h-4 w-4' />
        </Button>
      )}
    </div>
  );
}); 