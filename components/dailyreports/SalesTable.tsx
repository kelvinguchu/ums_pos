import { memo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// Define the SaleBatch interface within the component
interface SaleBatch {
  id: number;
  user_name: string;
  meter_type: string;
  batch_amount: number;
  sale_date: string;
  destination: string;
  recipient: string;
  total_price: number;
  unit_price: number;
  customer_type: string;
  customer_county: string;
  customer_contact: string;
}

interface SalesTableProps {
  sales: SaleBatch[];
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const SalesTable = memo(function SalesTable({
  sales,
  currentPage,
  itemsPerPage,
  totalPages,
  onPageChange,
}: SalesTableProps) {
  const NoDataMessage = () => (
    <div className='text-center py-8'>
      <p className='text-muted-foreground text-lg'>No sales recorded today</p>
      <p className='text-sm text-muted-foreground mt-2'>
        Sales made today will appear here
      </p>
    </div>
  );

  return (
    <>
      <div className='overflow-auto max-w-[100vw] sm:max-w-full'>
        <div className='min-w-[640px] sm:min-w-0'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Seller&apos;s Name</TableHead>
                <TableHead>Meter Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Total Price</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Customer Type</TableHead>
                <TableHead>County</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <NoDataMessage />
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{sale.user_name}</TableCell>
                    <TableCell>{sale.meter_type}</TableCell>
                    <TableCell>{sale.batch_amount}</TableCell>
                    <TableCell>
                      KES {sale.total_price.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {new Date(sale.sale_date).toLocaleTimeString()}
                    </TableCell>
                    <TableCell>{sale.recipient}</TableCell>
                    <TableCell>
                      <Badge variant='outline' className='bg-blue-100'>
                        {sale.customer_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant='outline' className='bg-green-100'>
                        {sale.customer_county}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {sales.length > itemsPerPage && (
        <div className='mt-4 flex justify-center'>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  className={
                    currentPage === 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {[...Array(totalPages)].map((_, index) => (
                <PaginationItem key={index + 1}>
                  <PaginationLink
                    onClick={() => onPageChange(index + 1)}
                    isActive={currentPage === index + 1}>
                    {index + 1}
                  </PaginationLink>
                </PaginationItem>
              ))}

              <PaginationItem>
                <PaginationNext
                  onClick={() =>
                    onPageChange(Math.min(totalPages, currentPage + 1))
                  }
                  className={
                    currentPage === totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  );
});
