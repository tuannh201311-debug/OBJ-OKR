import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api';

export type SubTask = { id: string; title: string; assignee: string; progress: number; weight: number; deadline: string; status: string; note?: string; big_task_id?: string; completed_at?: string; };
export type BigTask = { id: string; title: string; progress: number; weight: number; deadline: string; children: SubTask[]; okr_id?: string; completed_at?: string; };
export type OKR = { id: string; title: string; type: string; progress: number; deadline: string; children: BigTask[]; user_id?: string; completed_at?: string; };

interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | string;
}

export type SystemUser = {
  id: string;
  email: string;
  display_name: string;
  role: string;
};

interface AppContextType {
  user: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  okrs: OKR[];
  setOkrs: React.Dispatch<React.SetStateAction<OKR[]>>;
  addOkr: (title: string, deadline: string) => void;
  updateOkr: (okrId: string, title: string, deadline: string) => void;
  deleteOkr: (okrId: string) => void;
  addBigTask: (okrId: string, task: Omit<BigTask, 'id' | 'children' | 'progress'>) => void;
  updateBigTask: (okrId: string, btId: string, title: string, weight: number, deadline: string) => void;
  deleteBigTask: (okrId: string, btId: string) => void;
  addSubTask: (okrId: string, btId: string, task: Omit<SubTask, 'id'>) => void;
  updateSubTask: (okrId: string, btId: string, stId: string, progress: number, note: string, assignee: string, deadline: string, title: string, weight: number) => void;
  deleteSubTask: (okrId: string, btId: string, stId: string) => void;
  importOkrs: (newOkrs: OKR[]) => void;
  highlightTaskId: string | null;
  setHighlightTaskId: React.Dispatch<React.SetStateAction<string | null>>;
  systemUsers: SystemUser[];
  syncOkrsToDb: (okrs: OKR[]) => Promise<void>;
  loadOkrsFromDb: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  reorderOkrs: (newOkrs: OKR[]) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

const recalculateOkr = (okr: OKR): OKR => {
  const newChildren = okr.children.map(bt => {
    if (bt.children.length === 0) return bt;
    const totalWeight = bt.children.reduce((sum, st) => sum + st.weight, 0);
    let progress = 0;
    if (totalWeight > 0) {
      const weightedProgress = bt.children.reduce((sum, st) => sum + (st.progress * st.weight), 0);
      progress = Math.round(weightedProgress / totalWeight);
    } else {
      const sumProgress = bt.children.reduce((sum, st) => sum + st.progress, 0);
      progress = Math.round(sumProgress / bt.children.length);
    }
    let newBtCompletedAt = bt.completed_at;
    if (progress === 100) {
      const childDates = bt.children.map(st => st.completed_at).filter(Boolean) as string[];
      if (childDates.length > 0) {
        newBtCompletedAt = childDates.sort().reverse()[0];
      }
    } else {
      newBtCompletedAt = undefined;
    }
    return { ...bt, progress, completed_at: newBtCompletedAt };
  });

  const okrTotalWeight = newChildren.reduce((sum, bt) => sum + bt.weight, 0);
  let okrProgress = 0;
  if (okrTotalWeight > 0) {
    const okrWeightedProgress = newChildren.reduce((sum, bt) => sum + (bt.progress * bt.weight), 0);
    okrProgress = Math.round(okrWeightedProgress / okrTotalWeight);
  } else {
    const sumProgress = newChildren.reduce((sum, bt) => sum + bt.progress, 0);
    okrProgress = newChildren.length > 0 ? Math.round(sumProgress / newChildren.length) : 0;
  }

  let newOkrCompletedAt = okr.completed_at;
  if (okrProgress === 100) {
    const childDates = newChildren.map(bt => bt.completed_at).filter(Boolean) as string[];
    if (childDates.length > 0) {
      newOkrCompletedAt = childDates.sort().reverse()[0];
    }
  } else {
    newOkrCompletedAt = undefined;
  }

  return { ...okr, children: newChildren, progress: okrProgress, completed_at: newOkrCompletedAt };
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null);
  const [okrs, setOkrs] = useState<OKR[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);

  const refreshAuth = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetchWithAuth("/auth/me");
      if (res.ok) {
        const u = await res.json();
        setUser({
          uid: u.id,
          email: u.email,
          name: u.display_name || u.email,
          role: u.role === "admin" ? "admin" : "member"
        });
      } else {
        localStorage.removeItem("token");
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const loadOkrsFromDb = async () => {
    try {
      const okrRes = await fetchWithAuth("/okrs");
      const btRes = await fetchWithAuth("/big-tasks");
      const stRes = await fetchWithAuth("/sub-tasks");

      if (!okrRes.ok || !btRes.ok || !stRes.ok) {
        console.error("Failed to fetch OKR data", { okrs: okrRes.status, bt: btRes.status, st: stRes.status });
        return;
      }

      const okrRows = (await okrRes.json()).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
      const btRows = await btRes.json();
      const stRows = await stRes.json();

      const okrList: OKR[] = okrRows.map((okr: any) => ({
        id: okr.id,
        title: okr.title,
        type: okr.target || 'OKR',
        progress: okr.progress || 0,
        deadline: okr.deadline || '2026-12-31',
        completed_at: okr.completed_at,
        user_id: okr.user_id,
        children: (btRows || [])
          .filter((bt: any) => bt.okr_id === okr.id)
          .map((bt: any) => ({
            id: bt.id,
            title: bt.title,
            progress: bt.progress || 0,
            weight: bt.weight,
            deadline: bt.deadline,
            completed_at: bt.completed_at,
            children: (stRows || [])
              .filter((st: any) => st.big_task_id === bt.id)
              .map((st: any) => ({
                id: st.id,
                title: st.title,
                assignee: st.assignee,
                progress: st.progress || 0,
                weight: st.weight,
                deadline: st.deadline,
                completed_at: st.completed_at,
                status: st.status,
                note: st.note || undefined,
              })),
          })),
      }));

      console.log("Loaded OKRs from DB:", okrList.length);
      setOkrs(okrList.map(recalculateOkr));
    } catch(e) {
      console.error("Error loading OKRs:", e);
    }
  };

  const loadSystemUsers = async () => {
    try {
      console.log('Fetching system users...');
      const res = await fetchWithAuth('/users');
      console.log('Fetch users response ok?', res.ok);
      if (res.ok) {
        const users = await res.json();
        console.log('Loaded users:', users);
        setSystemUsers(users);
      } else {
        console.error('Failed to load users', res.status);
      }
    } catch (e) {
      console.error('Error fetching users:', e);
    }
  };

  const syncOkrsToDb = async (okrsToSync: OKR[]) => {
    for (const okr of okrsToSync) {
      const recalculated = recalculateOkr(okr);
      
      const payloadOKR = {
         id: recalculated.id, title: recalculated.title, target: recalculated.type,
         progress: recalculated.progress, objective: recalculated.title, deadline: recalculated.deadline,
         completed_at: recalculated.completed_at
      };
      // Upsert
      await fetchWithAuth(`/okrs/${recalculated.id}`, { method: 'PUT', body: JSON.stringify(payloadOKR) })
         .then(res => res.ok ? res : fetchWithAuth(`/okrs`, { method: 'POST', body: JSON.stringify(payloadOKR) }));

      for (const bt of recalculated.children) {
        const payloadBT = {
          id: bt.id, okr_id: recalculated.id, title: bt.title, 
          progress: bt.progress, weight: bt.weight, deadline: bt.deadline,
          completed_at: bt.completed_at
        };
        await fetchWithAuth(`/big-tasks/${bt.id}`, { method: 'PUT', body: JSON.stringify(payloadBT) })
           .then(res => res.ok ? res : fetchWithAuth(`/big-tasks`, { method: 'POST', body: JSON.stringify(payloadBT) }));

        for (const st of bt.children) {
          const payloadST = {
            id: st.id, big_task_id: bt.id, title: st.title, assignee: st.assignee,
            progress: st.progress, weight: st.weight, deadline: st.deadline,
            status: st.status, note: st.note || '', completed_at: st.completed_at
          };
          await fetchWithAuth(`/sub-tasks/${st.id}`, { method: 'PUT', body: JSON.stringify(payloadST) })
             .then(res => res.ok ? res : fetchWithAuth(`/sub-tasks`, { method: 'POST', body: JSON.stringify(payloadST) }));
        }
      }
    }
  };

  useEffect(() => {
    // Load OKRs for everyone (authorized or public)
    loadOkrsFromDb();
    loadSystemUsers();
  }, [user]);

  const logout = async () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const saveOkr = (okr: OKR) => {
    const recalculated = recalculateOkr(okr);
    setOkrs(prev => {
      const idx = prev.findIndex(o => o.id === recalculated.id);
      let next;
      if (idx >= 0) {
        next = [...prev];
        next[idx] = recalculated;
      } else {
        next = [...prev, recalculated];
      }
      syncOkrsToDb([recalculated]);
      return next;
    });
  };

  const addOkr = (title: string, deadline: string) => {
    saveOkr({ id: crypto.randomUUID(), title, type: 'OKR', progress: 0, deadline, children: [] });
  };
  const updateOkr = (okrId: string, title: string, deadline: string) => {
    const okr = okrs.find(o => o.id === okrId);
    if (okr) {
      saveOkr({ ...okr, title, deadline });
    }
  };
  const deleteOkr = async (okrId: string) => {
    await fetchWithAuth(`/okrs/${okrId}`, { method: 'DELETE' });
    setOkrs(prev => prev.filter(o => o.id !== okrId));
  };
  const addBigTask = (okrId: string, task: Omit<BigTask, 'id' | 'children' | 'progress'>) => {
    const okr = okrs.find(o => o.id === okrId);
    if (okr) saveOkr({ ...okr, children: [...okr.children, { ...task, id: crypto.randomUUID(), progress: 0, children: [] }] });
  };
  const updateBigTask = (okrId: string, btId: string, title: string, weight: number, deadline: string) => {
    const okr = okrs.find(o => o.id === okrId);
    if (okr) saveOkr({ ...okr, children: okr.children.map(bt => bt.id === btId ? { ...bt, title, weight, deadline } : bt) });
  };
  const deleteBigTask = async (okrId: string, btId: string) => {
    await fetchWithAuth(`/big-tasks/${btId}`, { method: 'DELETE' });
    const okr = okrs.find(o => o.id === okrId);
    if (okr) {
      const updated = { ...okr, children: okr.children.filter(bt => bt.id !== btId) };
      setOkrs(prev => prev.map(o => o.id === okrId ? recalculateOkr(updated) : o));
    }
  };
  const addSubTask = (okrId: string, btId: string, task: Omit<SubTask, 'id'>) => {
    const okr = okrs.find(o => o.id === okrId);
    if (okr) saveOkr({ ...okr, children: okr.children.map(bt => bt.id !== btId ? bt : { ...bt, children: [...bt.children, { ...task, id: crypto.randomUUID() }] }) });
  };
  const updateSubTask = (okrId: string, btId: string, stId: string, progress: number, note: string, assignee: string, deadline: string, title: string, weight: number) => {
    const okr = okrs.find(o => o.id === okrId);
    if (okr) saveOkr({ ...okr, children: okr.children.map(bt => bt.id !== btId ? bt : { ...bt, children: bt.children.map(st => {
      if (st.id === stId) {
        let newCompletedAt = st.completed_at;
        if (progress === 100 && st.progress < 100) {
          newCompletedAt = new Date().toISOString();
        } else if (progress < 100) {
          newCompletedAt = undefined;
        }
        return { ...st, progress, note, assignee, deadline, title, weight, completed_at: newCompletedAt };
      }
      return st;
    }) }) });
  };
  const deleteSubTask = async (okrId: string, btId: string, stId: string) => {
    await fetchWithAuth(`/sub-tasks/${stId}`, { method: 'DELETE' });
    const okr = okrs.find(o => o.id === okrId);
    if (okr) {
      const updated = { ...okr, children: okr.children.map(bt => bt.id !== btId ? bt : { ...bt, children: bt.children.filter(st => st.id !== stId) }) };
      setOkrs(prev => prev.map(o => o.id === okrId ? recalculateOkr(updated) : o));
    }
  };
  const importOkrs = async (newOkrs: OKR[]) => {
    const recalculated = newOkrs.map(recalculateOkr);
    await syncOkrsToDb(recalculated);
    setOkrs(prev => [...prev, ...recalculated]);
  };

  const reorderOkrs = async (newOkrs: OKR[]) => {
    setOkrs(newOkrs);
    const items = newOkrs.map((okr, index) => ({ id: okr.id, order: index }));
    await fetchWithAuth('/okrs/reorder', {
      method: 'POST',
      body: JSON.stringify(items)
    });
  };

  return (
    <AppContext.Provider value={{
      user, loading, logout, okrs, setOkrs,
      addOkr, updateOkr, deleteOkr,
      addBigTask, updateBigTask, deleteBigTask,
      addSubTask, updateSubTask, deleteSubTask,
      importOkrs, highlightTaskId, setHighlightTaskId,
      systemUsers, syncOkrsToDb, loadOkrsFromDb, refreshAuth, reorderOkrs
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};
