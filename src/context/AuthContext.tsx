import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import { Profile, UserRole } from '../types/models';

export interface AuthContextType {
  user: Profile | null;
  session: any | null;
  isLoading: boolean;
  isAuthorized: boolean;
  loginWithGoogle: (options?: { mockEmail?: string; mockName?: string; mockRole?: UserRole }) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);

  const evaluateAuthorization = useCallback(
    async (currentSession: any): Promise<{ profile: Profile | null; authorized: boolean }> => {
      if (!currentSession?.user) {
        return { profile: null, authorized: false };
      }

      const userId = currentSession.user.id;
      const userEmail = currentSession.user.email?.toLowerCase();

      // 1. Fetch user profile from database
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const profile: Profile = profileData
        ? {
            id: profileData.id,
            email: profileData.email,
            fullName: profileData.full_name,
            initials: profileData.initials,
            avatarUrl: profileData.avatar_url,
            role: profileData.role as UserRole,
            department: profileData.department,
            activeTaskId: profileData.active_task_id,
            createdAt: profileData.created_at,
          }
        : {
            id: currentSession.user.id,
            email: currentSession.user.email || '',
            fullName:
              currentSession.user.user_metadata?.full_name ||
              currentSession.user.email ||
              'Studio Member',
            initials: 'U',
            avatarUrl: currentSession.user.user_metadata?.avatar_url || null,
            role: (currentSession.user.user_metadata?.role as UserRole) || 'user',
            department: currentSession.user.user_metadata?.department || 'Core Dev',
            activeTaskId: null,
            createdAt: new Date().toISOString(),
          };

      // 2. Admin role is always authorized (studio administrator override)
      if (profile.role === 'admin' || currentSession.user.user_metadata?.role === 'admin') {
        return { profile, authorized: true };
      }

      // 3. User role: verify project membership
      let hasMembership = false;

      // Check project_members by email
      if (userEmail) {
        const { data: byEmail } = await supabase
          .from('project_members')
          .select('id')
          .eq('user_email', userEmail);
        if (byEmail && byEmail.length > 0) {
          hasMembership = true;
        }
      }

      // Check project_members by userId
      if (!hasMembership && userId) {
        const { data: byUid } = await supabase
          .from('project_members')
          .select('id')
          .eq('user_id', userId);
        if (byUid && byUid.length > 0) {
          hasMembership = true;
        }
      }

      // Also check accessible projects via RLS
      if (!hasMembership) {
        const { data: projects } = await supabase.from('projects').select('id');
        if (projects && projects.length > 0) {
          hasMembership = true;
        }
      }

      return { profile, authorized: hasMembership };
    },
    []
  );

  const refreshAuth = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const currentSession = data?.session ?? null;
      setSession(currentSession);

      if (currentSession) {
        const { profile, authorized } = await evaluateAuthorization(currentSession);
        setUser(profile);
        setIsAuthorized(authorized);
      } else {
        setUser(null);
        setIsAuthorized(false);
      }
    } catch (err) {
      console.error('Error refreshing auth:', err);
      setUser(null);
      setIsAuthorized(false);
    } finally {
      setIsLoading(false);
    }
  }, [evaluateAuthorization]);

  useEffect(() => {
    refreshAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        const { profile, authorized } = await evaluateAuthorization(newSession);
        setUser(profile);
        setIsAuthorized(authorized);
      } else {
        setUser(null);
        setIsAuthorized(false);
      }
      setIsLoading(false);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [refreshAuth, evaluateAuthorization]);

  const loginWithGoogle = async (options?: {
    mockEmail?: string;
    mockName?: string;
    mockRole?: UserRole;
  }) => {
    setIsLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: options
          ? {
              mock_email: options.mockEmail,
              mock_name: options.mockName,
              mock_role: options.mockRole,
            }
          : undefined,
      },
    });
  };

  const logout = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setIsAuthorized(false);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthorized,
        loginWithGoogle,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
