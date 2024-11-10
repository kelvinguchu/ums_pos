import { useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  getUsersList,
  getUserProfile,
  getCurrentUser,
  updateUserProfile,
  deleteUserProfile,
} from "@/lib/actions/supabaseActions";
import { supabase } from "@/lib/supabase";

interface User {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
  email: string;
}

// Query keys
const USERS_KEYS = {
  all: ['users'] as const,
  lists: () => [...USERS_KEYS.all, 'list'] as const,
  current: () => [...USERS_KEYS.all, 'current'] as const,
} as const;

export function useUsersData(showDeactivated: boolean = false) {
  const queryClient = useQueryClient();

  // Setup real-time subscription
  useEffect(() => {
    const usersChannel = supabase
      .channel('users_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          // Invalidate and refetch users data
          queryClient.invalidateQueries({ queryKey: USERS_KEYS.lists() });
        }
      )
      .subscribe();

    return () => {
      usersChannel.unsubscribe();
    };
  }, [queryClient]);

  // Current user query
  const currentUserQuery = useQuery({
    queryKey: USERS_KEYS.current(),
    queryFn: async () => {
      const user = await getCurrentUser();
      if (!user) throw new Error('No user found');
      const profile = await getUserProfile(user.id);
      return { ...user, ...profile };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Users list query
  const usersQuery = useQuery({
    queryKey: USERS_KEYS.lists(),
    queryFn: getUsersList,
    select: (data) => showDeactivated ? data : data.filter(user => user.isActive),
    staleTime: 1000 * 30, // 30 seconds
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, updates }: { userId: string, updates: Partial<User> }) => 
      updateUserProfile(userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEYS.lists() });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => deleteUserProfile(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USERS_KEYS.lists() });
    },
  });

  return {
    users: usersQuery.data || [],
    currentUser: currentUserQuery.data,
    isLoading: usersQuery.isPending || currentUserQuery.isPending,
    error: usersQuery.error || currentUserQuery.error,
    updateUser: updateUserMutation.mutate,
    deleteUser: deleteUserMutation.mutate,
    isPending: updateUserMutation.isPending,
    isDeleting: deleteUserMutation.isPending,
    refetch: () => {
      usersQuery.refetch();
      currentUserQuery.refetch();
    }
  };
} 