import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/api';

export type SubTask = { id: string; title: string; assignee: string; progress: number; weight: number; deadline: string; status: string; note?: string; attachments?: string[]; big_task_id?: string; completed_at?: string; };
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
  updateSubTask: (okrId: string, btId: string, stId: string, progress: number, note: string, assignee: string, deadline: string, title: string, weight: number, attachments?: string[]) => void;
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

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for HTTP (non-secure) environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

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
                attachments: st.attachments || [],
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
         progress: Number(recalculated.progress) || 0, objective: recalculated.title, deadline: recalculated.deadline,
         completed_at: recalculated.completed_at
      };
      
      let res = await fetchWithAuth(`/okrs/${recalculated.id}`, { method: 'PUT', body: JSON.stringify(payloadOKR) });
      if (!res.ok) {
        res = await fetchWithAuth(`/okrs`, { method: 'POST', body: JSON.stringify(payloadOKR) });
      }
      if (!res.ok) {
        const errText = await res.text();
        console.error("OKR Sync Error:", errText);
        throw new Error(`Failed to sync OKR ${recalculated.id}: ${res.status} - ${errText}`);
      }

      for (const bt of recalculated.children) {
        const payloadBT = {
          id: bt.id, okr_id: recalculated.id, title: bt.title, 
          progress: Number(bt.progress) || 0, weight: Number(bt.weight) || 0, deadline: bt.deadline,
          completed_at: bt.completed_at
        };
        
        let resBt = await fetchWithAuth(`/big-tasks/${bt.id}`, { method: 'PUT', body: JSON.stringify(payloadBT) });
        if (!resBt.ok) {
          resBt = await fetchWithAuth(`/big-tasks`, { method: 'POST', body: JSON.stringify(payloadBT) });
        }
        if (!resBt.ok) {
          const errText = await resBt.text();
          console.error("BigTask Sync Error:", errText);
          throw new Error(`Failed to sync BigTask ${bt.id}: ${resBt.status} - ${errText}`);
        }

        for (const st of bt.children) {
          const payloadST = {
            id: st.id, big_task_id: bt.id, title: st.title, assignee: st.assignee,
            progress: Number(st.progress) || 0, weight: Number(st.weight) || 0, deadline: st.deadline,
            status: st.status, note: st.note || '', completed_at: st.completed_at, attachments: st.attachments || []
          };
          
          let resSt = await fetchWithAuth(`/sub-tasks/${st.id}`, { method: 'PUT', body: JSON.stringify(payloadST) });
          if (!resSt.ok) {
            resSt = await fetchWithAuth(`/sub-tasks`, { method: 'POST', body: JSON.stringify(payloadST) });
          }
          if (!resSt.ok) {
            const errText = await resSt.text();
            console.error("SubTask Sync Error:", errText);
            throw new Error(`Failed to sync SubTask ${st.id}: ${resSt.status} - ${errText}`);
          }
        }
      }
    }
  };

  useEffect(() => {
    // Load OKRs for everyone (authorized or public)
    loadOkrsFromDb();
    loadSystemUsers();
  }, [user]);

  // Tự động logout sau 10 phút không thao tác
  useEffect(() => {
    if (!user) return;

    let timeoutId: any;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.log("Không có thao tác trong 10 phút, tự động đăng xuất...");
        logout();
      }, 10 * 60 * 1000); // 10 phút
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user]);

  const logout = async () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const saveOkr = async (okr: OKR) => {
    const recalculated = recalculateOkr(okr);
    setOkrs(prev => {
      const idx = prev.findIndex(o => o.id === recalculated.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = recalculated;
        return next;
      } else {
        return [...prev, recalculated];
      }
    });
    await syncOkrsToDb([recalculated]);
  };

  const addOkr = async (title: string, deadline: string) => {
    await saveOkr({ id: generateId(), title, type: 'OKR', progress: 0, deadline, children: [] });
  };
  const updateOkr = async (okrId: string, title: string, deadline: string) => {
    const okr = okrs.find(o => o.id === okrId);
    if (okr) {
      await saveOkr({ ...okr, title, deadline });
    }
  };
  const deleteOkr = async (okrId: string) => {
    await fetchWithAuth(`/okrs/${okrId}`, { method: 'DELETE' });
    setOkrs(prev => prev.filter(o => o.id !== okrId));
  };
  const addBigTask = async (okrId: string, task: Omit<BigTask, 'id' | 'children' | 'progress'>) => {
    const okr = okrs.find(o => o.id === okrId);
    if (okr) await saveOkr({ ...okr, children: [...okr.children, { ...task, id: generateId(), progress: 0, children: [] }] });
  };
  const updateBigTask = async (okrId: string, btId: string, title: string, weight: number, deadline: string) => {
    const okr = okrs.find(o => o.id === okrId);
    if (okr) await saveOkr({ ...okr, children: okr.children.map(bt => bt.id === btId ? { ...bt, title, weight, deadline } : bt) });
  };
  const deleteBigTask = async (okrId: string, btId: string) => {
    await fetchWithAuth(`/big-tasks/${btId}`, { method: 'DELETE' });
    const okr = okrs.find(o => o.id === okrId);
    if (okr) {
      const updated = { ...okr, children: okr.children.filter(bt => bt.id !== btId) };
      setOkrs(prev => prev.map(o => o.id === okrId ? recalculateOkr(updated) : o));
    }
  };
  const addSubTask = async (okrId: string, btId: string, task: Omit<SubTask, 'id'>) => {
    const okr = okrs.find(o => o.id === okrId);
    if (okr) await saveOkr({ ...okr, children: okr.children.map(bt => bt.id !== btId ? bt : { ...bt, children: [...bt.children, { ...task, id: generateId() }] }) });
  };
  const updateSubTask = async (okrId: string, btId: string, stId: string, progress: number, note: string, assignee: string, deadline: string, title: string, weight: number, attachments?: string[]) => {
    const okr = okrs.find(o => o.id === okrId);
    if (okr) await saveOkr({ ...okr, children: okr.children.map(bt => bt.id !== btId ? bt : { ...bt, children: bt.children.map(st => {
      if (st.id === stId) {
        let newCompletedAt = st.completed_at;
        if (progress === 100 && st.progress < 100) {
          newCompletedAt = new Date().toISOString();
        } else if (progress < 100) {
          newCompletedAt = undefined;
        }
        return { ...st, progress, note, assignee, deadline, title, weight, completed_at: newCompletedAt, attachments: attachments !== undefined ? attachments : st.attachments };
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
