import React, { useMemo, useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronRight } from 'lucide-react';

export function KanbanBoard() {
  const { okrs, updateSubTask, user } = useAppContext();
  const isAdmin = user?.role === 'admin';

  const [draggedSt, setDraggedSt] = useState<{okrId: string, btId: string, stId: string, progress: number} | null>(null);

  const columns = [
    { id: 'todo', title: 'Chờ thực hiện', color: 'border-slate-200 bg-slate-100', headerColor: 'bg-slate-200/50 text-slate-600' },
    { id: 'doing', title: 'Đang thực hiện', color: 'border-blue-200 bg-blue-50/50', headerColor: 'bg-blue-200/50 text-blue-700' },
    { id: 'done', title: 'Đã hoàn thành', color: 'border-emerald-200 bg-emerald-50/50', headerColor: 'bg-emerald-200/50 text-emerald-700' }
  ];

  const subtasks = useMemo(() => {
    const list: any[] = [];
    okrs.forEach(okr => {
      okr.children.forEach(bt => {
        bt.children.forEach(st => {
          list.push({ ...st, okrId: okr.id, btId: bt.id, okrTitle: okr.title, btTitle: bt.title });
        });
      });
    });
    return list;
  }, [okrs]);

  const handleDragStart = (e: React.DragEvent, st: any) => {
    if (!isAdmin) return;
    setDraggedSt({okrId: st.okrId, btId: st.btId, stId: st.id, progress: st.progress});
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (!isAdmin || !draggedSt) return;
    
    let newProgress = draggedSt.progress;
    if (colId === 'todo') newProgress = 0;
    if (colId === 'doing' && (draggedSt.progress === 0 || draggedSt.progress === 100)) newProgress = 50;
    if (colId === 'done') newProgress = 100;

    if (newProgress !== draggedSt.progress) {
       const st = subtasks.find(s => s.id === draggedSt.stId);
       if (st) {
          updateSubTask(draggedSt.okrId, draggedSt.btId, draggedSt.stId, newProgress, st.note || '', st.assignee, st.deadline, st.title, st.weight, st.attachments);
       }
    }
    setDraggedSt(null);
  };

  return (
    <div className="h-full flex flex-col gap-6 p-2">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-[#1e3a8a] tracking-tight">Kanban Board</h1>
        <p className="text-sm text-slate-500 font-medium">Kéo thả các thẻ công việc để cập nhật tiến độ tự động</p>
      </div>
      
      <div className="flex gap-6 h-full overflow-hidden">
         {columns.map(col => {
            const filteredSt = subtasks.filter(st => {
                if (col.id === 'todo') return st.progress === 0;
                if (col.id === 'done') return st.progress === 100;
                return st.progress > 0 && st.progress < 100;
            });
            return (
              <div key={col.id} 
                   className={`flex-1 flex flex-col rounded-3xl border-2 ${col.color} overflow-hidden shadow-sm`}
                   onDragOver={handleDragOver} 
                   onDrop={(e) => handleDrop(e, col.id)}>
                 <div className={`px-6 py-4 font-black uppercase tracking-widest text-[12px] flex items-center justify-between ${col.headerColor}`}>
                    {col.title} 
                    <span className="bg-white/50 px-2.5 py-1 rounded-full text-[10px] shadow-sm">{filteredSt.length}</span>
                 </div>
                 <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-slate-300">
                    {filteredSt.map(st => (
                       <Card key={st.id} 
                             draggable={isAdmin} 
                             onDragStart={(e) => handleDragStart(e, st)}
                             className={`p-5 border-none shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-0.5 transition-all bg-white rounded-2xl ${isAdmin ? '' : 'cursor-default'}`}>
                          <h3 className="font-bold text-[#1e3a8a] text-sm mb-3 leading-snug">{st.title}</h3>
                          
                          <div className="space-y-2 mb-4">
                            <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 truncate">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">OBJ</span>
                              {st.okrTitle}
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 truncate">
                              <span className="bg-blue-50 px-1.5 py-0.5 rounded text-blue-500">PLAN</span>
                              {st.btTitle}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                             <div className="flex items-center gap-1.5 text-[11px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-md">
                                <Calendar className="w-3 h-3"/> {st.deadline}
                             </div>
                             <Badge variant="outline" className="text-[10px] font-bold text-slate-600 bg-slate-50 border-slate-200">
                               {st.assignee}
                             </Badge>
                          </div>
                          
                          {col.id === 'doing' && (
                            <div className="mt-3 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-blue-500 h-full rounded-full" style={{width: `${st.progress}%`}} />
                            </div>
                          )}
                       </Card>
                    ))}
                 </div>
              </div>
            )
         })}
      </div>
    </div>
  )
}
