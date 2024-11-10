"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getCurrentUser, getUserProfile } from "@/lib/actions/supabaseActions";

// Define a more specific type for the user from Supabase
interface UserProfile {
  id: string;
  name?: string;
  role?: string;
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
    const initializeAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          const profile = await getUserProfile(currentUser.id);
          if (profile?.is_active) {
            // Create a properly typed user object
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
            // Handle deactivated user
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
        console.error("Auth initialization error:", error);
        setAuthState({
          user: null,
          userRole: "",
          isLoading: false,
          isAuthenticated: false,
        });
      }
    };

    initializeAuth();
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
