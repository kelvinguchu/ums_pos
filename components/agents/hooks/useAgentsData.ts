import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  getAgentsList, 
  getUserProfile, 
  getCurrentUser 
} from "@/lib/actions/supabaseActions";
import { supabase } from "@/lib/supabase";
import { KenyaCounty } from "@/lib/constants/locationData";

// Define interfaces
interface Agent {
  id: string;
  name: string;
  phone_number: string;
  location: string;
  county: KenyaCounty;
  is_active: boolean;
  total_meters: number;
}

interface User {
  id: string;
  role: string;
  email: string;
  name?: string;
  [key: string]: any;
}

interface AgentsData {
  agents: Agent[];
  currentUser: User | null;
}

const CACHE_TIME = 1000 * 60 * 5; // 5 minutes
const STALE_TIME = 1000 * 30; // 30 seconds

export function useAgentsData() {
  const queryClient = useQueryClient();

  // Setup Supabase real-time subscription
  useEffect(() => {
    const agentsSubscription = supabase
      .channel('agents_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agents'
        },
        () => {
          // Invalidate and refetch queries when data changes
          queryClient.invalidateQueries({ queryKey: ['agents'] });
        }
      )
      .subscribe();

    return () => {
      agentsSubscription.unsubscribe();
    };
  }, [queryClient]);

  // Fetch current user with caching
  const userQuery = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const current = await getCurrentUser();
      if (!current) {
        throw new Error("User not found");
      }
      const profile = await getUserProfile(current.id);
      return { ...current, ...profile };
    },
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });

  // Fetch agents list with caching
  const agentsQuery = useQuery({
    queryKey: ['agents'],
    queryFn: getAgentsList,
    gcTime: CACHE_TIME,
    staleTime: STALE_TIME,
  });

  // Combine the data
  const agentsData: AgentsData = {
    agents: agentsQuery.data || [],
    currentUser: userQuery.data || null,
  };

  return {
    agentsData,
    isLoading: agentsQuery.isLoading || userQuery.isLoading,
    isError: agentsQuery.isError || userQuery.isError,
    error: agentsQuery.error || userQuery.error,
    refetch: () => {
      agentsQuery.refetch();
      userQuery.refetch();
    }
  };
} 