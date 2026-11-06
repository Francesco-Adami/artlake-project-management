export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          initials: string;
          avatar_url: string | null;
          role: 'admin' | 'user';
          department: string;
          active_task_id: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          initials: string;
          avatar_url?: string | null;
          role?: 'admin' | 'user';
          department?: string;
          active_task_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          initials?: string;
          avatar_url?: string | null;
          role?: 'admin' | 'user';
          department?: string;
          active_task_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fk_profile_active_task';
            columns: ['active_task_id'];
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          }
        ];
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_created_by_fkey';
            columns: ['created_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_email: string;
          user_id: string | null;
          invited_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_email: string;
          user_id?: string | null;
          invited_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_email?: string;
          user_id?: string | null;
          invited_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_members_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_members_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string;
          status: 'not_started' | 'in_progress' | 'blocked' | 'in_review' | 'completed';
          priority: 'low' | 'medium' | 'high';
          department_tag: string;
          assignee_id: string | null;
          queue_order: number;
          estimated_minutes: number;
          logged_minutes: number;
          due_date: string | null;
          start_date: string | null;
          blocker_reason: string | null;
          blocking_target: string | null;
          review_output_link: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description?: string;
          status?: 'not_started' | 'in_progress' | 'blocked' | 'in_review' | 'completed';
          priority?: 'low' | 'medium' | 'high';
          department_tag?: string;
          assignee_id?: string | null;
          queue_order?: number;
          estimated_minutes?: number;
          logged_minutes?: number;
          due_date?: string | null;
          start_date?: string | null;
          blocker_reason?: string | null;
          blocking_target?: string | null;
          review_output_link?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          description?: string;
          status?: 'not_started' | 'in_progress' | 'blocked' | 'in_review' | 'completed';
          priority?: 'low' | 'medium' | 'high';
          department_tag?: string;
          assignee_id?: string | null;
          queue_order?: number;
          estimated_minutes?: number;
          logged_minutes?: number;
          due_date?: string | null;
          start_date?: string | null;
          blocker_reason?: string | null;
          blocking_target?: string | null;
          review_output_link?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_assignee_id_fkey';
            columns: ['assignee_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      subtasks: {
        Row: {
          id: string;
          task_id: string;
          title: string;
          is_completed: boolean;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          title: string;
          is_completed?: boolean;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          title?: string;
          is_completed?: boolean;
          position?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subtasks_task_id_fkey';
            columns: ['task_id'];
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          }
        ];
      };
      time_logs: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          task_id: string;
          started_at: string;
          ended_at: string | null;
          duration_seconds: number;
          is_manual_edit: boolean;
          year_week: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          task_id: string;
          started_at?: string;
          ended_at?: string | null;
          duration_seconds?: number;
          is_manual_edit?: boolean;
          year_week: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          task_id?: string;
          started_at?: string;
          ended_at?: string | null;
          duration_seconds?: number;
          is_manual_edit?: boolean;
          year_week?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'time_logs_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'time_logs_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'time_logs_task_id_fkey';
            columns: ['task_id'];
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          }
        ];
      };
      task_comments: {
        Row: {
          id: string;
          task_id: string;
          author_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          author_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          author_id?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_comments_task_id_fkey';
            columns: ['task_id'];
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_comments_author_id_fkey';
            columns: ['author_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      task_attachments: {
        Row: {
          id: string;
          task_id: string;
          uploader_id: string;
          file_name: string;
          file_url: string;
          file_size: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          uploader_id: string;
          file_name: string;
          file_url: string;
          file_size?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          uploader_id?: string;
          file_name?: string;
          file_url?: string;
          file_size?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'task_attachments_task_id_fkey';
            columns: ['task_id'];
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_attachments_uploader_id_fkey';
            columns: ['uploader_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      weekly_checks: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          year_week: string;
          went_well: string;
          obstacles: string;
          workload_feeling: string;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          year_week: string;
          went_well: string;
          obstacles: string;
          workload_feeling: string;
          submitted_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          year_week?: string;
          went_well?: string;
          obstacles?: string;
          workload_feeling?: string;
          submitted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'weekly_checks_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'weekly_checks_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          project_id: string | null;
          type: 'assigned' | 'comment' | 'due_soon' | 'review_result' | 'unblocked';
          message: string;
          related_task_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          project_id?: string | null;
          type: 'assigned' | 'comment' | 'due_soon' | 'review_result' | 'unblocked';
          message: string;
          related_task_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          project_id?: string | null;
          type?: 'assigned' | 'comment' | 'due_soon' | 'review_result' | 'unblocked';
          message?: string;
          related_task_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_recipient_id_fkey';
            columns: ['recipient_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_related_task_id_fkey';
            columns: ['related_task_id'];
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_project_member: {
        Args: {
          p_project_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
