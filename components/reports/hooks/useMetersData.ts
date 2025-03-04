import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAllMetersWithStatus,
  MeterWithStatus,
} from "@/lib/actions/supabaseActions";

// Define query keys
const QUERY_KEYS = {
  allMeters: "allMeters",
} as const;

export type MeterStatusFilter =
  | "all"
  | "in_stock"
  | "with_agent"
  | "sold"
  | "replaced"
  | "faulty";
export type MeterTypeFilter = string | null;

export function useMetersData(initialPageSize: number = 20) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [statusFilter, setStatusFilter] =
    useState<MeterStatusFilter>("in_stock");
  const [typeFilter, setTypeFilter] = useState<MeterTypeFilter>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Create a query key that includes all filters
  const queryKey = [
    QUERY_KEYS.allMeters,
    page,
    pageSize,
    statusFilter,
    typeFilter,
    searchTerm,
  ];


  // The main query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const filterStatus = statusFilter === "all" ? undefined : statusFilter;

      try {
        const result = await getAllMetersWithStatus(
          page,
          pageSize,
          filterStatus,
          typeFilter || undefined,
          searchTerm || undefined
        );


        return result;
      } catch (error) {
        console.error("Error in useMetersData query:", error);
        throw error;
      }
    },
    staleTime: 1000 * 60, // 1 minute
  });

  // Prefetch next page
  const prefetchNextPage = useCallback(() => {
    if (page < Math.ceil((data?.totalCount || 0) / pageSize)) {
      const nextPage = page + 1;

      const nextPageQueryKey = [
        QUERY_KEYS.allMeters,
        nextPage,
        pageSize,
        statusFilter,
        typeFilter,
        searchTerm,
      ];

      queryClient.prefetchQuery({
        queryKey: nextPageQueryKey,
        queryFn: async () => {
          const filterStatus =
            statusFilter === "all" ? undefined : statusFilter;
          return getAllMetersWithStatus(
            nextPage,
            pageSize,
            filterStatus,
            typeFilter || undefined,
            searchTerm || undefined
          );
        },
        staleTime: 1000 * 60, // 1 minute
      });
    }
  }, [
    page,
    pageSize,
    statusFilter,
    typeFilter,
    searchTerm,
    data?.totalCount,
    queryClient,
  ]);

  // Prefetch next page when current page data is loaded
  useEffect(() => {
    if (!isLoading && data) {
      prefetchNextPage();
    }
  }, [isLoading, data, prefetchNextPage]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when changing page size
  };

  const handleStatusFilterChange = (newStatus: MeterStatusFilter) => {
    setStatusFilter(newStatus);
    setPage(1); // Reset to first page when changing filter
  };

  const handleTypeFilterChange = (newType: MeterTypeFilter) => {
    setTypeFilter(newType);
    setPage(1); // Reset to first page when changing filter
  };

  const handleSearchChange = (newSearchTerm: string) => {
    setSearchTerm(newSearchTerm);
    setPage(1); // Reset to first page when searching
  };

  return {
    meters: data?.meters || [],
    totalCount: data?.totalCount || 0,
    isLoading,
    error,
    refetch,
    pagination: {
      page,
      pageSize,
      totalPages: Math.ceil((data?.totalCount || 0) / pageSize),
      handlePageChange,
      handlePageSizeChange,
    },
    filters: {
      statusFilter,
      typeFilter,
      searchTerm,
      handleStatusFilterChange,
      handleTypeFilterChange,
      handleSearchChange,
    },
  };
}
