"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, getUserProfile } from "@/lib/actions/supabaseActions";
import { supabase } from "@/lib/supabase";
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import type { UserRole } from "@/lib/utils/rolePermissions";

// Define a more specific type for the user from Supabase
interface UserProfile {
  id: string;
  name?: string;
  role?: UserRole;
  is_active?: boolean;
  email: string;
}

interface AuthState {
  user: UserProfile | null;
  userRole: string;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  updateAuthState: (updates: Partial<AuthState>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    userRole: "",
    isLoading: true,
    isAuthenticated: false,
  });

  const updateAuthState = (updates: Partial<AuthState>) => {
    setAuthState(prev => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        
        if (!mounted) return;

        if (currentUser) {
          const profile = await getUserProfile(currentUser.id);
          
          if (!mounted) return;

          if (profile?.is_active) {
            const userProfile: UserProfile = {
              id: currentUser.id,
              email: currentUser.email || "",
              name: profile.name,
              role: profile.role,
              is_active: profile.is_active,
            };

            setAuthState({
              user: userProfile,
              userRole: profile?.role || "",
              isLoading: false,
              isAuthenticated: true,
            });
          } else {
            setAuthState({
              user: null,
              userRole: "",
              isLoading: false,
              isAuthenticated: false,
            });
          }
        } else {
          setAuthState({
            user: null,
            userRole: "",
            isLoading: false,
            isAuthenticated: false,
          });
        }
      } catch (error) {
        if (mounted) {
          setAuthState({
            user: null,
            userRole: "",
            isLoading: false,
            isAuthenticated: false,
          });
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <AuthContext.Provider value={{ ...authState, updateAuthState }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
