import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import { useProject } from '../hooks/useProject';
import { TaskStatus, WeeklyStats } from '../types/models';
import {
  formatSeconds,
  parseTimeString,
  getIsoYearWeek,
  formatHoursMinutes,
  formatAverageHours,
  calculateWeeklyTotal,
  calculateHistoricalAverage,
} from '../utils/timeCalculations';

export interface TimerContextType {
  // State
  activeTaskId: string | null;
  activeTaskTitle: string | null;
  activeTaskStatus: TaskStatus | null;
  isRunning: boolean;
  elapsedSeconds: number;
  seconds: number;
  formattedElapsed: string;
  weeklyStats: WeeklyStats;
  isManualModalOpen: boolean;
  toastMessage: string | null;

  // Actions
  startTimer: (taskId?: string, taskTitle?: string) => Promise<void>;
  stopTimer: () => Promise<void>;
  toggleTimer: () => Promise<void>;
  updateManualTime: (newTime: string | number) => Promise<{ success: boolean; error?: string }>;
  setActiveTask: (task: { id: string; title: string; status?: TaskStatus }) => Promise<void>;
  onTaskStatusChange: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  openManualModal: () => void;
  closeManualModal: () => void;
  refreshWeeklyStats: () => Promise<void>;
  clearToast: () => void;
}

export const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const useTimer = (): TimerContextType => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};

interface StoredTimerState {
  activeTaskId: string | null;
  activeTaskTitle: string | null;
  isRunning: boolean;
  startTime: number | null;
  accumulatedSeconds: number;
}

export const TimerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { currentProject } = useProject();

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [activeTaskTitle, setActiveTaskTitle] = useState<string | null>(null);
  const [activeTaskStatus, setActiveTaskStatus] = useState<TaskStatus | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    currentWeekSeconds: 0,
    historicalAvgSeconds: 0,
    currentWeekFormatted: '0h 0m',
    historicalAvgFormatted: '0h/sett',
  });

  const timerIntervalRef = useRef<any>(null);
  const toastTimeoutRef = useRef<any>(null);
  const sessionStartTimeRef = useRef<string | null>(null);
  const lastCommittedElapsedRef = useRef<number>(0);
  const isInitializedRef = useRef<boolean>(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  const clearToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  const storageKey = currentProject
    ? `artlake_timer_${currentProject.id}_${user?.id || 'guest'}`
    : null;

  // Refresh weekly hours and historical average from Supabase
  const refreshWeeklyStats = useCallback(async () => {
    if (!currentProject || !user) return;

    try {
      const { data, error } = await supabase
        .from('time_logs')
        .select('duration_seconds, year_week, started_at')
        .eq('project_id', currentProject.id)
        .eq('user_id', user.id);

      if (error || !data) return;

      const currentIsoWeek = getIsoYearWeek();
      const liveUncommittedSeconds = isRunning
        ? Math.max(0, elapsedSeconds - lastCommittedElapsedRef.current)
        : 0;
      const currentWeekSec = calculateWeeklyTotal(data, currentIsoWeek, liveUncommittedSeconds);
      const histAvgSec = calculateHistoricalAverage(data, currentIsoWeek);

      setWeeklyStats({
        currentWeekSeconds: currentWeekSec,
        historicalAvgSeconds: histAvgSec,
        currentWeekFormatted: formatHoursMinutes(currentWeekSec),
        historicalAvgFormatted: formatAverageHours(histAvgSec),
      });
    } catch (err) {
      console.error('Failed to calculate weekly stats:', err);
    }
  }, [currentProject, user, isRunning, elapsedSeconds]);

  // Load active task and saved timer on mount or project switch
  useEffect(() => {
    if (!currentProject || !user) return;

    isInitializedRef.current = false;
    let isMounted = true;

    const loadInitialState = async () => {
      // 1. Fetch user's active task
      if (user.activeTaskId) {
        const { data: taskData } = await supabase
          .from('tasks')
          .select('id, title, status')
          .eq('id', user.activeTaskId)
          .maybeSingle();

        if (isMounted && taskData) {
          setActiveTaskId(taskData.id);
          setActiveTaskTitle(taskData.title);
          setActiveTaskStatus(taskData.status as TaskStatus);
        }
      }

      // 2. Restore local timer if exists
      if (storageKey && typeof window !== 'undefined') {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          try {
            const saved: StoredTimerState = JSON.parse(raw);
            if (isMounted && saved.activeTaskId) {
              setActiveTaskId(saved.activeTaskId);
              setActiveTaskTitle(saved.activeTaskTitle);
              if (saved.isRunning && saved.startTime) {
                const diff = Math.floor((Date.now() - saved.startTime) / 1000);
                const restoredElapsed = Math.max(0, (saved.accumulatedSeconds || 0) + Math.max(0, diff));
                setElapsedSeconds(restoredElapsed);
                setIsRunning(true);
              } else {
                setElapsedSeconds(Math.max(0, saved.accumulatedSeconds || 0));
                setIsRunning(false);
              }
            }
          } catch (e) {
            localStorage.removeItem(storageKey);
          }
        }
      }

      if (isMounted) {
        isInitializedRef.current = true;
        await refreshWeeklyStats();
      }
    };

    loadInitialState();

    return () => {
      isMounted = false;
    };
  }, [currentProject?.id, user?.id, storageKey]);

  // Timer interval ticker
  useEffect(() => {
    if (isRunning) {
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRunning]);

  // Save state to localStorage whenever running/elapsed changes
  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (!storageKey || typeof window === 'undefined') return;

    if (activeTaskId) {
      const stateToStore: StoredTimerState = {
        activeTaskId,
        activeTaskTitle,
        isRunning,
        startTime: isRunning ? Date.now() : null,
        accumulatedSeconds: elapsedSeconds,
      };
      localStorage.setItem(storageKey, JSON.stringify(stateToStore));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey, activeTaskId, activeTaskTitle, isRunning, elapsedSeconds]);

  // ==========================================
  // BUSINESS AUTOMATIONS
  // ==========================================

  // Auto-Stop Timer and persist to time_logs
  const stopTimer = useCallback(async () => {
    if (!isRunning && elapsedSeconds === 0) return;

    setIsRunning(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    const uncommittedSeconds = Math.max(0, elapsedSeconds - lastCommittedElapsedRef.current);
    const currentTask = activeTaskId;

    if (uncommittedSeconds > 0 && currentTask && currentProject && user) {
      const startedAt = sessionStartTimeRef.current || new Date().toISOString();
      const endedAt = new Date().toISOString();
      const isoWeek = getIsoYearWeek();

      // Commit to time_logs
      await supabase.from('time_logs').insert({
        project_id: currentProject.id,
        user_id: user.id,
        task_id: currentTask,
        started_at: startedAt,
        ended_at: endedAt,
        duration_seconds: uncommittedSeconds,
        is_manual_edit: false,
        year_week: isoWeek,
      });

      // Increment logged_minutes on task
      const addedMinutes = Math.round(uncommittedSeconds / 60);
      if (addedMinutes > 0) {
        const { data: taskRow } = await supabase
          .from('tasks')
          .select('logged_minutes')
          .eq('id', currentTask)
          .maybeSingle();

        const currentLogged = taskRow?.logged_minutes || 0;
        await supabase
          .from('tasks')
          .update({
            logged_minutes: currentLogged + addedMinutes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentTask);
      }
    }

    setElapsedSeconds(0);
    lastCommittedElapsedRef.current = 0;
    sessionStartTimeRef.current = null;
    await refreshWeeklyStats();
  }, [isRunning, elapsedSeconds, activeTaskId, currentProject, user, refreshWeeklyStats]);

  // Auto-Start Timer
  const startTimer = useCallback(
    async (taskId?: string, taskTitle?: string) => {
      const targetId = taskId || activeTaskId;
      const targetTitle = taskTitle || activeTaskTitle;

      if (!targetId) {
        showToast('Nessuna task attiva selezionata');
        return;
      }

      // If switching to a different task, commit any accumulated time and reset elapsed for new task
      if (activeTaskId && targetId !== activeTaskId) {
        if (isRunning || elapsedSeconds > 0) {
          await stopTimer();
        }
        setElapsedSeconds(0);
        lastCommittedElapsedRef.current = 0;
      }

      // Check task status: Auto-start rule (not_started -> in_progress)
      let currentStatus = activeTaskStatus;
      if (targetId !== activeTaskId || !currentStatus) {
        const { data: t } = await supabase
          .from('tasks')
          .select('status, title')
          .eq('id', targetId)
          .maybeSingle();
        if (t) {
          currentStatus = t.status as TaskStatus;
          setActiveTaskTitle(t.title);
        }
      }

      if (currentStatus === 'not_started') {
        await supabase
          .from('tasks')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('id', targetId);
        setActiveTaskStatus('in_progress');
        showToast('Timer avviato · Task portata automaticamente "In corso"');
      } else {
        showToast('Timer avviato');
      }

      setActiveTaskId(targetId);
      if (targetTitle) setActiveTaskTitle(targetTitle);
      sessionStartTimeRef.current = new Date().toISOString();
      setIsRunning(true);
    },
    [activeTaskId, activeTaskTitle, activeTaskStatus, isRunning, elapsedSeconds, stopTimer, showToast]
  );

  const toggleTimer = useCallback(async () => {
    if (isRunning) {
      await stopTimer();
      showToast('Timer messo in pausa');
    } else {
      await startTimer();
    }
  }, [isRunning, stopTimer, startTimer, showToast]);

  // Task status change listener: Auto-stop on blocked/in_review/completed
  const onTaskStatusChange = useCallback(
    async (taskId: string, newStatus: TaskStatus) => {
      if (taskId === activeTaskId) {
        setActiveTaskStatus(newStatus);

        // Auto-stop condition
        if (['blocked', 'in_review', 'completed'].includes(newStatus)) {
          if (isRunning) {
            await stopTimer();
            if (newStatus === 'completed') {
              showToast('Task completata! Timer messo in pausa.');
            } else if (newStatus === 'blocked') {
              showToast('Task bloccata: Timer fermato');
            } else if (newStatus === 'in_review') {
              showToast('Task in revisione: Timer fermato');
            }
          }
        } else if (newStatus === 'in_progress' && !isRunning) {
          await startTimer(taskId);
        }
      }
    },
    [activeTaskId, isRunning, stopTimer, startTimer, showToast]
  );

  // Set active task (with switching automation)
  const setActiveTask = useCallback(
    async (task: { id: string; title: string; status?: TaskStatus }) => {
      if (task.id === activeTaskId) return;

      // Stop previous timer if running or has accumulated time
      if (isRunning || elapsedSeconds > 0) {
        await stopTimer();
      }

      setActiveTaskId(task.id);
      setActiveTaskTitle(task.title);
      setActiveTaskStatus(task.status || null);
      setElapsedSeconds(0);
      lastCommittedElapsedRef.current = 0;

      // Persist active_task_id to profile
      if (user) {
        await supabase
          .from('profiles')
          .update({ active_task_id: task.id })
          .eq('id', user.id);
      }
    },
    [activeTaskId, isRunning, elapsedSeconds, stopTimer, user]
  );

  // Manual Time Rectification (✎)
  const updateManualTime = useCallback(
    async (newTime: string | number): Promise<{ success: boolean; error?: string }> => {
      let parsed: number | null = null;
      if (typeof newTime === 'number') {
        parsed = Math.max(0, Math.floor(newTime));
      } else {
        parsed = parseTimeString(newTime);
      }

      if (parsed === null) {
        showToast('Usa il formato HH:MM:SS');
        return { success: false, error: 'Usa il formato HH:MM:SS' };
      }

      setElapsedSeconds(parsed);
      lastCommittedElapsedRef.current = parsed;

      // If active session exists, write rectification with is_manual_edit = true
      if (activeTaskId && currentProject && user && parsed > 0) {
        const isoWeek = getIsoYearWeek();
        await supabase.from('time_logs').insert({
          project_id: currentProject.id,
          user_id: user.id,
          task_id: activeTaskId,
          started_at: new Date().toISOString(),
          ended_at: new Date().toISOString(),
          duration_seconds: parsed,
          is_manual_edit: true,
          year_week: isoWeek,
        });
      }

      setIsManualModalOpen(false);
      showToast('Orario del timer rettificato');
      await refreshWeeklyStats();
      return { success: true };
    },
    [activeTaskId, currentProject, user, showToast, refreshWeeklyStats]
  );

  const openManualModal = useCallback(() => setIsManualModalOpen(true), []);
  const closeManualModal = useCallback(() => setIsManualModalOpen(false), []);

  return (
    <TimerContext.Provider
      value={{
        activeTaskId,
        activeTaskTitle,
        activeTaskStatus,
        isRunning,
        elapsedSeconds,
        seconds: elapsedSeconds,
        formattedElapsed: formatSeconds(elapsedSeconds),
        weeklyStats,
        isManualModalOpen,
        toastMessage,
        startTimer,
        stopTimer,
        toggleTimer,
        updateManualTime,
        setActiveTask,
        onTaskStatusChange,
        openManualModal,
        closeManualModal,
        refreshWeeklyStats,
        clearToast,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
};
