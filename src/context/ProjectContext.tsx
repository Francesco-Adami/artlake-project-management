import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { Project, ProjectMember } from '../types/models';

export interface ProjectContextType {
  currentProject: Project | null;
  userProjects: Project[];
  isLoadingProjects: boolean;
  members: ProjectMember[];
  isLoadingMembers: boolean;
  isAdmin: boolean;
  selectProject: (id: string) => void;
  createProject: (params: { name: string; description?: string }) => Promise<{ data: Project | null; error: Error | null }>;
  updateProject: (id: string, params: { name?: string; description?: string }) => Promise<{ data: Project | null; error: Error | null }>;
  deleteProject: (id: string) => Promise<{ error: Error | null }>;
  inviteMember: (projectId: string, userEmail: string) => Promise<{ data: ProjectMember | null; error: Error | null }>;
  removeMember: (memberId: string) => Promise<{ error: Error | null }>;
  refreshProjects: () => Promise<void>;
  refreshMembers: () => Promise<void>;
}

export const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};

const LOCAL_STORAGE_ACTIVE_PROJECT_KEY = 'artlake_active_project_id';

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, session } = useAuth();
  const isAdmin = user?.role === 'admin' || session?.user?.user_metadata?.role === 'admin';

  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState<boolean>(true);

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState<boolean>(false);

  const refreshProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching projects:', error);
        setUserProjects([]);
        setCurrentProject(null);
        return;
      }

      const projects: Project[] = (data || []).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description || '',
        createdBy: row.created_by,
        createdAt: row.created_at,
      }));

      setUserProjects(projects);

      // Restore or select active project
      const savedId =
        typeof window !== 'undefined'
          ? localStorage.getItem(LOCAL_STORAGE_ACTIVE_PROJECT_KEY)
          : null;
      const matched = projects.find((p) => p.id === savedId);
      const active = matched || projects[0] || null;

      setCurrentProject(active);
      if (active && typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_ACTIVE_PROJECT_KEY, active.id);
      }
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  const refreshMembers = useCallback(async () => {
    if (!currentProject) {
      setMembers([]);
      return;
    }

    setIsLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', currentProject.id)
        .order('invited_at', { ascending: true });

      if (error) {
        console.error('Error fetching project members:', error);
        setMembers([]);
        return;
      }

      const mappedMembers: ProjectMember[] = (data || []).map((row) => ({
        id: row.id,
        projectId: row.project_id,
        userEmail: row.user_email,
        userId: row.user_id,
        invitedAt: row.invited_at,
      }));

      setMembers(mappedMembers);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [currentProject]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    refreshMembers();
  }, [refreshMembers]);

  const selectProject = (id: string) => {
    const target = userProjects.find((p) => p.id === id);
    if (target) {
      setCurrentProject(target);
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCAL_STORAGE_ACTIVE_PROJECT_KEY, target.id);
      }
    }
  };

  const createProject = async (params: { name: string; description?: string }) => {
    if (!isAdmin) {
      return { data: null, error: new Error('Permission denied: only admins can create projects') };
    }
    if (!user && !session?.user) {
      return { data: null, error: new Error('Unauthenticated') };
    }

    const creatorId = user?.id || session.user.id;
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: params.name,
        description: params.description || '',
        created_by: creatorId,
      })
      .select();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const insertedRow = Array.isArray(data) ? data[0] : data;
    const newProject: Project = {
      id: insertedRow.id,
      name: insertedRow.name,
      description: insertedRow.description || '',
      createdBy: insertedRow.created_by,
      createdAt: insertedRow.created_at,
    };

    // Auto-add creator to project_members
    const creatorEmail = (user?.email || session.user.email || '').toLowerCase();
    if (creatorEmail) {
      await supabase.from('project_members').insert({
        project_id: newProject.id,
        user_email: creatorEmail,
        user_id: creatorId,
      });
    }

    await refreshProjects();
    selectProject(newProject.id);

    return { data: newProject, error: null };
  };

  const updateProject = async (id: string, params: { name?: string; description?: string }) => {
    if (!isAdmin) {
      return { data: null, error: new Error('Permission denied: only admins can update projects') };
    }

    const { data, error } = await supabase
      .from('projects')
      .update(params)
      .eq('id', id)
      .select();

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    const updatedRow = Array.isArray(data) ? data[0] : (data as any);
    const updated: Project = updatedRow
      ? {
          id: updatedRow.id,
          name: updatedRow.name,
          description: updatedRow.description || '',
          createdBy: updatedRow.created_by,
          createdAt: updatedRow.created_at,
        }
      : {
          id,
          name: params.name || '',
          description: params.description || '',
          createdBy: '',
          createdAt: new Date().toISOString(),
        };

    await refreshProjects();
    return { data: updated, error: null };
  };

  const deleteProject = async (id: string) => {
    if (!isAdmin) {
      return { error: new Error('Permission denied: only admins can delete projects') };
    }

    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      return { error: new Error(error.message) };
    }

    await refreshProjects();
    return { error: null };
  };

  const inviteMember = async (projectId: string, userEmail: string) => {
    if (!isAdmin) {
      return { data: null, error: new Error('Permission denied: only admins can invite members') };
    }

    const cleanEmail = userEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { data: null, error: new Error('Invalid email address') };
    }

    const { data, error } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_email: cleanEmail,
      })
      .select();

    if (error) {
      if ((error as any).code === '23505') {
        return { data: null, error: new Error('Questo utente è già membro di questo progetto') };
      }
      return { data: null, error: new Error(error.message || 'Invitation failed') };
    }

    const insertedMember = Array.isArray(data) && data.length > 0 ? data[0] : (data as any);
    const newMember: ProjectMember = insertedMember
      ? {
          id: insertedMember.id,
          projectId: insertedMember.project_id,
          userEmail: insertedMember.user_email,
          userId: insertedMember.user_id,
          invitedAt: insertedMember.invited_at,
        }
      : {
          id: `temp-${Date.now()}`,
          projectId,
          userEmail: cleanEmail,
          userId: null,
          invitedAt: new Date().toISOString(),
        };

    await refreshMembers();
    return { data: newMember, error: null };
  };

  const removeMember = async (memberId: string) => {
    if (!isAdmin) {
      return { error: new Error('Permission denied: only admins can remove members') };
    }

    const { error } = await supabase.from('project_members').delete().eq('id', memberId);
    if (error) {
      return { error: new Error(error.message) };
    }

    await refreshMembers();
    return { error: null };
  };

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        userProjects,
        isLoadingProjects,
        members,
        isLoadingMembers,
        isAdmin,
        selectProject,
        createProject,
        updateProject,
        deleteProject,
        inviteMember,
        removeMember,
        refreshProjects,
        refreshMembers,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
