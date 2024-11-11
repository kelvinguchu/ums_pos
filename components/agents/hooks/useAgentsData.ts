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
  is_active?: boolean;
  app_metadata: any;
  user_metadata: any;
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
      
      // Ensure we have all required fields and handle potential undefined values
      const userData: User = {
        id: current.id,
        email: current.email || '', // Provide default empty string if undefined
        role: profile?.role || 'user', // Provide default role if undefined
        name: profile?.name,
        is_active: profile?.is_active,
        app_metadata: current.app_metadata,
        user_metadata: current.user_metadata
      };
      
      return userData;
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