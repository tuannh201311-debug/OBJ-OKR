import { useState, useEffect, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Plus, AlertCircle, Search, FileUp, Layers, ChevronRight, Users, Filter, Trash2, Settings2, Activity, Check } from 'lucide-react';
import { useAppContext, OKR, BigTask, SubTask } from '@/context/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const getProgressColor = (progress: number) => {
  if (progress >= 80) return 'bg-[#10b981]';
  if (progress >= 50) return 'bg-[#f59e0b]';
  return 'bg-[#ef4444]';
};

const getDeadlineStatus = (deadline: string, progress: number, completedAt?: string) => {
  if (progress >= 100) {
    if (completedAt && deadline) {
      const compDate = new Date(completedAt);
      const dlDate = new Date(deadline);
      compDate.setHours(0, 0, 0, 0);
      dlDate.setHours(0, 0, 0, 0);
      if (compDate > dlDate) {
        return { label: 'Hoàn thành chậm', variant: 'destructive' as const, color: 'text-rose-500' };
      }
    }
    return { label: 'Hoàn thành', variant: 'success' as const, color: 'text-emerald-500' };
  }
  const today = new Date();
  if (!deadline) return { label: 'Chưa có hạn', variant: 'secondary' as const, color: 'text-slate-400' };
  const dlDate = new Date(deadline);
  const diffTime = dlDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Quá hạn', variant: 'destructive' as const, color: 'text-rose-500' };
  if (progress === 0) return { label: 'Chờ thực hiện', variant: 'secondary' as const, color: 'text-slate-400' };
  return { label: 'Đang làm', variant: 'warning' as const, color: 'text-amber-500' };
};

const getPersonnelColor = (name: string) => {
  if (name === 'Chưa gán') return 'bg-slate-50 border-slate-200 text-slate-500';
  const colors = [
    'bg-blue-50 border-blue-100 text-blue-700',
    'bg-emerald-50 border-emerald-100 text-emerald-700',
    'bg-purple-50 border-purple-100 text-purple-700',
    'bg-amber-50 border-amber-100 text-amber-700',
    'bg-cyan-50 border-cyan-100 text-cyan-700',
    'bg-rose-50 border-rose-100 text-rose-700',
    'bg-indigo-50 border-indigo-100 text-indigo-700',
    'bg-teal-50 border-teal-100 text-teal-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export function OKRTree() {
  const { okrs, user, addOkr, updateOkr, deleteOkr, highlightTaskId, setHighlightTaskId, importOkrs } = useAppContext();
  const isAdmin = user?.role === 'admin';
  const highlightRef = useRef<HTMLDivElement>(null);

  const [newOkrTitle, setNewOkrTitle] = useState('');
  const [newOkrDeadline, setNewOkrDeadline] = useState('');
  const [editOkrTitle, setEditOkrTitle] = useState('');
  const [editOkrDeadline, setEditOkrDeadline] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const { addBigTask, updateBigTask, deleteBigTask, addSubTask, updateSubTask, deleteSubTask, systemUsers } = useAppContext();

  // Dialog & Form States
  const [okrToEdit, setOkrToEdit] = useState<OKR | null>(null);
  const [btToEdit, setBtToEdit] = useState<BigTask | null>(null);
  const [stToEdit, setStToEdit] = useState<SubTask | null>(null);
  const [targetBtId, setTargetBtId] = useState<string | null>(null);
  const [targetOkrId, setTargetOkrId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formWeight, setFormWeight] = useState(1);
  const [formAssignee, setFormAssignee] = useState<string[]>([]);
  const [formProgress, setFormProgress] = useState(0);
  const [formNote, setFormNote] = useState('');

  const [dialogType, setDialogType] = useState<'add-okr' | 'edit-okr' | 'add-bt' | 'edit-bt' | 'add-st' | 'edit-st' | null>(null);

  const filteredOkrs = useMemo(() => {
    let result = okrs;
    if (searchQuery) {
        result = result.map(okr => {
            const filteredBTs = okr.children.map(bt => {
                const filteredSTs = bt.children.filter(st => st.title.toLowerCase().includes(searchQuery.toLowerCase()));
                return { ...bt, children: filteredSTs };
            }).filter(bt => bt.children.length > 0 || bt.title.toLowerCase().includes(searchQuery.toLowerCase()));
            return { ...okr, children: filteredBTs };
        }).filter(okr => okr.children.length > 0 || okr.title.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (filterAssignee === 'all' && !filterStatus) return result;
    return result.map(okr => {
      const filteredBigTasks = okr.children.map(bt => {
        const filteredSubTasks = bt.children.filter(st => {
          const names = (st.assignee || '').split(',').map(n => n.trim());
          const matchAssignee = filterAssignee === 'all' || names.includes(filterAssignee) || (filterAssignee === 'Chưa gán' && (names.length === 0 || !st.assignee || st.assignee === 'Chưa gán'));
          if (!matchAssignee) return false;
          if (filterStatus) {
            const dlStatus = getDeadlineStatus(st.deadline, st.progress, st.completed_at);
            if (filterStatus === 'Done') return dlStatus.label.includes('Hoàn thành');
            if (filterStatus === 'Doing') return dlStatus.label === 'Đang làm';
            if (filterStatus === 'Delay') return dlStatus.label === 'Quá hạn';
          }
          return true;
        });
        return { ...bt, children: filteredSubTasks };
      }).filter(bt => bt.children.length > 0);
      return { ...okr, children: filteredBigTasks };
    }).filter(okr => okr.children.length > 0);
  }, [okrs, filterAssignee, filterStatus, searchQuery]);

  const expandedOkrIds = highlightTaskId
    ? okrs.filter(okr => okr.children.some(bt => bt.children.some(st => st.id === highlightTaskId))).map(o => o.id)
    : [];

  const [accordionValue, setAccordionValue] = useState<string[]>(expandedOkrIds.length > 0 ? expandedOkrIds : (okrs.length > 0 ? [okrs[0].id] : []));

  useEffect(() => {
    if (highlightTaskId && expandedOkrIds.length > 0) {
      setAccordionValue(expandedOkrIds);
      setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
      const timer = setTimeout(() => setHighlightTaskId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightTaskId]);

  useEffect(() => {
    if (filterAssignee !== 'all' || filterStatus || searchQuery) {
      setAccordionValue(filteredOkrs.map(o => o.id));
    }
  }, [filterAssignee, filterStatus, searchQuery]);

  const personnelStats = useMemo(() => {
    const stats: Record<string, { total: number; done: number; doing: number; delayed: number }> = {};
    okrs.forEach(okr => {
      okr.children.forEach(bt => {
        bt.children.forEach(st => {
          const names = (st.assignee || '').split(',').map(n => n.trim()).filter(n => n && n !== 'Chưa gán');
          if (names.length === 0) names.push('Chưa gán');
          names.forEach(assignee => {
            if (!stats[assignee]) stats[assignee] = { total: 0, done: 0, doing: 0, delayed: 0 };
            stats[assignee].total++;
            const dlStatus = getDeadlineStatus(st.deadline, st.progress, st.completed_at);
            if (dlStatus.label.includes('Hoàn thành')) stats[assignee].done++;
            else if (dlStatus.label === 'Quá hạn') stats[assignee].delayed++;
            else if (dlStatus.label === 'Đang làm') stats[assignee].doing++;
          });
        });
      });
    });
    return Object.entries(stats).sort((a, b) => b[1].total - a[1].total);
  }, [okrs]);

  const openDialog = (type: typeof dialogType, okrId?: string, btId?: string, item?: OKR | BigTask | SubTask) => {
    setDialogType(type);
    setTargetOkrId(okrId || null);
    setTargetBtId(btId || null);
    
    if (item) {
      setFormTitle(item.title || '');
      setFormDeadline(item.deadline || '2026-12-31');
      setFormWeight(item.weight || 1);
      setFormProgress(item.progress || 0);
      setFormNote(item.note || '');
      setFormAssignee(item.assignee ? item.assignee.split(',').map((s: string) => s.trim()) : []);
      
      if (type === 'edit-okr') setOkrToEdit(item);
      if (type === 'edit-bt') setBtToEdit(item);
      if (type === 'edit-st') setStToEdit(item);
    } else {
      setFormTitle('');
      setFormDeadline('2026-12-31');
      setFormWeight(1);
      setFormProgress(0);
      setFormNote('');
      setFormAssignee([]);
    }
  };

  const handleAction = () => {
    if (!formTitle) return toast.error('Vui lòng nhập tiêu đề');
    
    try {
      if (dialogType === 'add-okr') addOkr(formTitle, formDeadline);
      if (dialogType === 'edit-okr') updateOkr(okrToEdit.id, formTitle, formDeadline);
      if (dialogType === 'add-bt') addBigTask(targetOkrId!, { title: formTitle, weight: formWeight, deadline: formDeadline });
      if (dialogType === 'edit-bt') updateBigTask(targetOkrId!, btToEdit.id, formTitle, formWeight, formDeadline);
      if (dialogType === 'add-st') addSubTask(targetOkrId!, targetBtId!, { title: formTitle, weight: formWeight, deadline: formDeadline, assignee: formAssignee.join(', '), progress: formProgress, status: 'todo', note: formNote });
      if (dialogType === 'edit-st') updateSubTask(targetOkrId!, targetBtId!, stToEdit.id, formProgress, formNote, formAssignee.join(', '), formDeadline, formTitle, formWeight);
      
      setDialogType(null);
      toast.success('Thao tác thành công');
    } catch (e) {
      toast.error('Lỗi khi lưu dữ liệu');
    }
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col gap-3 font-inter overflow-hidden px-2">
      
      {/* Phân bổ nguồn lực */}
      <div className="glass-card p-4 rounded-[1.5rem] flex flex-col gap-3 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between gap-4 border-b border-white/20 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#2563eb] flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-sm font-bold text-[#1e3a8a] tracking-tight uppercase">Phân bổ nguồn lực</h2>
          </div>
          <div className="relative w-[350px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748b]" />
            <Input 
              placeholder="Tìm nhanh mục tiêu..." 
              className="pl-10 h-10 bg-white/60 border-white/80 text-[14px] rounded-xl focus:bg-white transition-all shadow-none" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 max-h-[120px] overflow-y-auto pr-2 scrollbar-hide">
          <button 
            onClick={() => { setFilterAssignee('all'); setFilterStatus(null); }}
            className={`flex items-center justify-center gap-2 h-11 px-6 rounded-xl border transition-all text-[13px] font-black ${filterAssignee === 'all' && !filterStatus ? 'bg-[#1e3a8a] text-white border-none shadow-md scale-105' : 'bg-white/60 border-white/80 text-[#1e3a8a] hover:bg-white'}`}
          >
            <Filter className="h-4 w-4" /> ALL
          </button>

          {personnelStats.map(([name, stat]) => {
            const colorClass = getPersonnelColor(name);
            const isPersonActive = filterAssignee === name;
            if (name === 'Chưa gán') return null;

            return (
              <div key={name} className={`flex items-center gap-3 h-11 px-4 rounded-xl border transition-all ${isPersonActive ? 'bg-white border-blue-200 shadow-sm ring-1 ring-blue-50' : `${colorClass} border-white/60`}`}>
                <div 
                  className={`cursor-pointer px-3 py-1 rounded-lg transition-colors flex items-center gap-2 ${isPersonActive && !filterStatus ? 'bg-[#2563eb] text-white shadow-sm' : 'hover:bg-black/5'}`}
                  onClick={() => { setFilterAssignee(isPersonActive && !filterStatus ? 'all' : name); setFilterStatus(null); }}
                >
                  <span className="text-[14px] font-bold capitalize">{name}</span>
                  <span className={`text-[11px] font-black px-2 rounded ${isPersonActive && !filterStatus ? 'bg-white/20' : 'bg-black/5 text-[#64748b]'}`}>{stat.total} task</span>
                </div>
                <div className="flex items-center gap-1.5 border-l border-black/5 pl-1.5">
                   <button 
                     onClick={() => { setFilterAssignee(name); setFilterStatus(filterStatus === 'Done' && isPersonActive ? null : 'Done'); }} 
                     className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition-all ${filterStatus === 'Done' && isPersonActive ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100'}`}
                   >
                     <span>{stat.done}</span> <span className="opacity-70">done</span>
                   </button>
                   <button 
                     onClick={() => { setFilterAssignee(name); setFilterStatus(filterStatus === 'Doing' && isPersonActive ? null : 'Doing'); }} 
                     className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition-all ${filterStatus === 'Doing' && isPersonActive ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-100'}`}
                   >
                     <span>{stat.doing}</span> <span className="opacity-70">doing</span>
                   </button>
                   <button 
                     onClick={() => { setFilterAssignee(name); setFilterStatus(filterStatus === 'Delay' && isPersonActive ? null : 'Delay'); }} 
                     className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition-all ${filterStatus === 'Delay' && isPersonActive ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-100'}`}
                   >
                     <span>{stat.delayed}</span> <span className="opacity-70">delay</span>
                   </button>
                </div>
              </div>
            );
          })}

          {personnelStats.find(s => s[0] === 'Chưa gán') && (
            <button 
              onClick={() => { setFilterAssignee(filterAssignee === 'Chưa gán' ? 'all' : 'Chưa gán'); setFilterStatus(null); }}
              className={`flex items-center gap-2 h-11 px-5 rounded-xl border border-dashed transition-all text-[13px] font-bold ${filterAssignee === 'Chưa gán' ? 'bg-slate-700 text-white border-none shadow-md' : 'bg-slate-50 border-slate-300 text-slate-500 hover:bg-slate-100'}`}
            >
              <AlertCircle className="h-4 w-4" /> Chưa gán: {personnelStats.find(s => s[0] === 'Chưa gán')![1].total} task
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-row justify-between items-center px-2 flex-shrink-0 mt-1">
        <div className="flex items-center gap-3">
           <Layers className="h-5 w-5 text-[#2563eb]" />
           <h1 className="text-base font-bold text-[#1e3a8a] tracking-tight">Nội dung chi tiết OKR</h1>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" className="h-9 border-white/80 text-[#2563eb] font-bold rounded-xl hover:bg-white text-[12px] px-4 shadow-sm">
              <FileUp className="h-4 w-4 mr-2" /> Nhập CSV
            </Button>
          )}
          {isAdmin && (
            <Button 
              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white h-9 px-5 rounded-xl font-bold text-[12px] shadow-md"
              onClick={() => openDialog('add-okr')}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Thêm OBJ
            </Button>
          )}
        </div>
      </div>

      <Dialog open={!!dialogType} onOpenChange={(open) => !open && setDialogType(null)}>
        <DialogContent className="border-none rounded-[2.5rem] p-0 overflow-hidden max-w-xl bg-white/95 backdrop-blur-xl shadow-2xl">
          <div className="bg-gradient-to-br from-[#6366f1] to-[#4f46e5] p-8 text-white">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="text-3xl font-bold flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                    {dialogType?.includes('add') ? <Plus className="h-6 w-6 text-white" /> : <Edit2 className="h-6 w-6 text-white" />}
                  </div>
                  <div>
                    <span className="block text-sm font-medium opacity-80 tracking-wider uppercase mb-1">
                      {dialogType?.includes('okr') ? 'Objective' : dialogType?.includes('bt') ? 'Plan' : 'Task'} Management
                    </span>
                    {dialogType === 'add-okr' && 'Khởi tạo OBJ'}
                    {dialogType === 'edit-okr' && 'Chỉnh sửa OBJ'}
                    {dialogType === 'add-bt' && 'Thêm PLAN mới'}
                    {dialogType === 'edit-bt' && 'Chỉnh sửa PLAN'}
                    {dialogType === 'add-st' && 'Thêm Công việc'}
                    {dialogType === 'edit-st' && 'Cập nhật Công việc'}
                  </div>
                </DialogTitle>
              </div>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6 bg-[#f8fafc]/50">
            <div className="space-y-2">
              <Label className="text-[#475569] text-[11px] uppercase font-black tracking-[0.1em] ml-1">Tiêu đề nội dung</Label>
              <Input 
                value={formTitle} 
                onChange={(e) => setFormTitle(e.target.value)} 
                disabled={!isAdmin}
                className="h-14 rounded-2xl bg-white border-[#e2e8f0] focus:border-[#6366f1] focus:ring-[#6366f1]/20 transition-all text-base px-5 shadow-sm disabled:opacity-70 disabled:bg-slate-50" 
                placeholder="Ví dụ: Hoàn thiện UI Dashboard..." 
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[#475569] text-[11px] uppercase font-black tracking-[0.1em] ml-1">Thời hạn kết thúc</Label>
                <div className="relative">
                  <Input 
                    type="date" 
                    value={formDeadline} 
                    onChange={(e) => setFormDeadline(e.target.value)} 
                    disabled={!isAdmin}
                    className="h-14 rounded-2xl bg-white border-[#e2e8f0] focus:border-[#6366f1] transition-all px-5 shadow-sm disabled:opacity-70 disabled:bg-slate-50" 
                  />
                </div>
              </div>
              {(dialogType?.includes('bt') || dialogType?.includes('st')) && (
                <div className="space-y-2">
                  <Label className="text-[#475569] text-[11px] uppercase font-black tracking-[0.1em] ml-1">Trọng số (Weight)</Label>
                  <Input 
                    type="number" 
                    value={formWeight} 
                    onChange={(e) => setFormWeight(Number(e.target.value))} 
                    disabled={!isAdmin}
                    className="h-14 rounded-2xl bg-white border-[#e2e8f0] focus:border-[#6366f1] transition-all px-5 shadow-sm font-mono text-lg disabled:opacity-70 disabled:bg-slate-50" 
                    min={0.1} 
                    step={0.1} 
                  />
                </div>
              )}
            </div>

            {(dialogType === 'add-st' || dialogType === 'edit-st') && (
              <div className="space-y-6 pt-2">
                <div className="space-y-2">
                  <Label className="text-[#475569] text-[11px] uppercase font-black tracking-[0.1em] ml-1">Nhân sự thực hiện</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline" 
                        disabled={!isAdmin}
                        className="w-full justify-between text-left font-normal h-14 rounded-2xl bg-white border-[#e2e8f0] hover:bg-white hover:border-[#6366f1] transition-all px-5 shadow-sm disabled:opacity-70 disabled:bg-slate-50"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <Users className="h-4 w-4 text-[#6366f1]" />
                          {formAssignee.length > 0 ? (
                            <div className="flex gap-1 overflow-hidden">
                              {formAssignee.map(name => (
                                <Badge key={name} variant="secondary" className="bg-[#6366f1]/10 text-[#6366f1] border-none whitespace-nowrap text-[10px]">
                                  {name.split(' ').pop()}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[#94a3b8]">Chọn nhân sự...</span>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-[#94a3b8]" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[320px] p-0 rounded-[1.5rem] shadow-2xl border-none overflow-hidden" align="start">
                      <Command className="border-none">
                        <CommandInput placeholder="Tìm nhân sự..." className="h-12 border-none focus:ring-0" />
                        <CommandList className="max-h-[250px]">
                          <CommandEmpty>Không tìm thấy.</CommandEmpty>
                          <CommandGroup className="p-2">
                            {systemUsers.map((u) => {
                              const name = u.display_name || u.email;
                              const isSelected = formAssignee.includes(name);
                              return (
                                <CommandItem
                                  key={u.id}
                                  onSelect={() => {
                                    setFormAssignee(prev => isSelected ? prev.filter(n => n !== name) : [...prev, name]);
                                  }}
                                  className="flex items-center justify-between rounded-xl p-3 cursor-pointer hover:bg-[#6366f1]/5"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold",
                                      isSelected ? "bg-[#6366f1] text-white" : "bg-slate-100 text-slate-500"
                                    )}>
                                      {name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className={cn("text-sm font-medium", isSelected ? "text-[#6366f1]" : "text-slate-700")}>
                                      {name}
                                    </span>
                                  </div>
                                  {isSelected && <Check className="h-4 w-4 text-[#6366f1]" />}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <Label className="text-[#475569] text-[11px] uppercase font-black tracking-[0.1em]">Tiến độ thực tế</Label>
                    <span className="text-[14px] font-black text-[#6366f1]">{formProgress}%</span>
                  </div>
                  <div className="flex items-center gap-5 bg-white p-4 rounded-2xl border border-[#e2e8f0] shadow-sm">
                    <Input 
                      type="number" 
                      value={formProgress} 
                      onChange={(e) => setFormProgress(Number(e.target.value))} 
                      className="h-10 rounded-lg bg-slate-50 border-none w-20 text-center font-bold text-[#1e293b]" 
                      min={0} 
                      max={100} 
                    />
                    <div className="flex-1 px-2">
                      <Progress value={formProgress} className="h-3 rounded-full bg-slate-100" indicatorColor="bg-gradient-to-r from-[#6366f1] to-[#a855f7]" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[#475569] text-[11px] uppercase font-black tracking-[0.1em] ml-1">Ghi chú chi tiết</Label>
                  <textarea 
                    value={formNote} 
                    onChange={(e) => setFormNote(e.target.value)} 
                    className="w-full min-h-[100px] rounded-2xl bg-white border border-[#e2e8f0] focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1]/20 transition-all p-4 text-sm resize-none shadow-sm" 
                    placeholder="Mô tả công việc hoặc các vấn đề cần lưu ý..." 
                  />
                </div>
              </div>
            )}

            <div className="pt-4 flex gap-3">
               <Button 
                variant="outline" 
                onClick={() => setDialogType(null)}
                className="flex-1 h-14 rounded-2xl font-bold text-slate-500 border-[#e2e8f0] hover:bg-slate-50 transition-all"
              >
                Hủy bỏ
              </Button>
              <Button 
                onClick={handleAction} 
                className="flex-[2] bg-gradient-to-r from-[#6366f1] to-[#4f46e5] hover:from-[#4f46e5] hover:to-[#4338ca] h-14 font-bold rounded-2xl text-lg shadow-xl shadow-indigo-100 transition-all active:scale-95"
              >
                <Check className="mr-2 h-5 w-5" /> Xác nhận & Lưu
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="glass-card border-none rounded-[2rem] flex-1 flex flex-col shadow-none overflow-hidden min-h-0">
        <div className="bg-[#2563eb]/5 px-8 py-3.5 grid grid-cols-[3fr_110px_140px_180px_170px] text-[11px] font-black text-[#64748b] uppercase tracking-[0.15em] border-b border-white/20">
          <div>OBJ -&gt; PLAN -&gt; Công việc chi tiết</div>
          <div className="text-center">Tiến độ</div>
          <div className="text-center">Thời hạn</div>
          <div className="text-center">Nhân sự thực hiện</div>
          <div className="text-right pr-6">Trạng thái</div>
        </div>
        <CardContent className="p-0 overflow-y-auto scrollbar-hide flex-1">
          <Accordion type="multiple" value={accordionValue} onValueChange={setAccordionValue} className="w-full">
            {filteredOkrs.map((okr) => {
              const dlStatusOkr = getDeadlineStatus(okr.deadline, okr.progress, okr.completed_at);
              return (
              <AccordionItem value={okr.id} key={okr.id} className="border-b border-white/10 last:border-0">
                <AccordionTrigger className={`px-8 py-5 hover:bg-white/30 transition-colors border-none no-underline ${dlStatusOkr.variant === 'destructive' ? 'bg-rose-50/10' : ''}`}>
                  <div className="grid grid-cols-[3fr_110px_140px_180px_170px] w-full items-center text-left">
                    <div className="flex items-center gap-4 font-bold text-[#1e3a8a] text-[15px]">
                      <div className={`h-2.5 w-2.5 rounded-full ${dlStatusOkr.variant === 'destructive' ? 'bg-rose-500 shadow-[0_0_6px_#f43f5e]' : 'bg-[#2563eb] shadow-[0_0_6px_#2563eb]'} animate-pulse`} />
                      <span className="truncate max-w-[500px]">OBJ: {okr.title}</span>
                    </div>
                    <div className="text-base font-black text-[#1e3a8a] text-center">{okr.progress}%</div>
                    <div className={`text-[12px] font-bold ${dlStatusOkr.color} text-center`}>{okr.deadline}</div>
                    <div className="text-[#64748b] text-[11px] font-bold uppercase tracking-widest text-center">-</div>
                      <div className="flex justify-end items-center pr-2 gap-2">
                        <Badge className={`px-4 py-1 rounded-full text-[10px] font-black uppercase border-none ${dlStatusOkr.variant === 'destructive' ? 'bg-rose-500 text-white' : 'bg-blue-100 text-[#2563eb]'}`}>
                          {dlStatusOkr.label}
                        </Badge>
                        {isAdmin && (
                          <div className="flex items-center">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#2563eb] hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); openDialog('add-bt', okr.id); }}><Plus className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#64748b] hover:text-[#2563eb]" onClick={(e) => { e.stopPropagation(); openDialog('edit-okr', undefined, undefined, okr); }}><Edit2 className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50" onClick={(e) => { e.stopPropagation(); if (confirm('Xóa OBJ này?')) deleteOkr(okr.id); }}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        )}
                      </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-0 pb-3 px-3">
                  <div className="space-y-2">
                    {okr.children.map((bigTask) => {
                      const dlStatus = getDeadlineStatus(bigTask.deadline, bigTask.progress, bigTask.completed_at);
                      return (
                        <div key={bigTask.id} className="glass-card bg-white/20 border-white/40 rounded-2xl overflow-hidden">
                          <div className="px-7 py-3.5 grid grid-cols-[3fr_110px_140px_160px_170px] items-center hover:bg-white/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="bg-[#1e3a8a] text-white text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider">PLAN</div>
                              <span className="text-[14px] font-bold text-[#1e3a8a]">{bigTask.title}</span>
                            </div>
                            <div className="text-sm font-black text-[#1e3a8a] text-center">{bigTask.progress}%</div>
                            <div className={`text-[11px] font-bold ${dlStatus.color} text-center`}>{bigTask.deadline}</div>
                            <div className="text-[#64748b] text-center">-</div>
                            <div className="flex justify-end items-center pr-2 gap-2">
                               <Badge className={`px-3 py-0.5 rounded-full text-[9px] font-black uppercase border-none ${dlStatus.variant === 'destructive' ? 'bg-rose-500 text-white' : 'bg-white/60 text-[#2563eb]'}`}>
                                {dlStatus.label}
                               </Badge>
                               {isAdmin && (
                                 <div className="flex items-center">
                                   <Button variant="ghost" size="icon" className="h-8 w-8 text-[#2563eb] hover:bg-blue-50" onClick={() => openDialog('add-st', okr.id, bigTask.id)}><Plus className="h-4 w-4" /></Button>
                                   <Button variant="ghost" size="icon" className="h-8 w-8 text-[#64748b] hover:text-[#2563eb]" onClick={() => openDialog('edit-bt', okr.id, undefined, bigTask)}><Edit2 className="h-4 w-4" /></Button>
                                   <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50" onClick={() => { if (confirm('Xóa PLAN này?')) deleteBigTask(okr.id, bigTask.id); }}><Trash2 className="h-4 w-4" /></Button>
                                 </div>
                               )}
                            </div>
                          </div>
                          
                          <div className="bg-white/5 px-3 py-2 space-y-1.5 border-t border-white/10">
                            {bigTask.children.map((subTask) => {
                              const isHighlighted = highlightTaskId === subTask.id;
                              const stStatus = getDeadlineStatus(subTask.deadline, subTask.progress, subTask.completed_at);
                              return (
                                <div key={subTask.id} ref={isHighlighted ? highlightRef : undefined} className={`px-6 py-3 rounded-xl grid grid-cols-[3fr_110px_140px_160px_170px] items-center hover:bg-white/40 transition-all ${isHighlighted ? 'bg-amber-100 ring-2 ring-amber-400' : ''}`}>
                                  <div className="pl-6 flex flex-col">
                                    <div className="text-[14px] font-bold text-[#1e3a8a] flex items-center gap-3">
                                      <ChevronRight className="h-4 w-4 text-[#64748b]" />
                                      {subTask.title}
                                    </div>
                                    {subTask.note && <span className="text-[10px] text-[#64748b] ml-7 mt-1 italic line-clamp-1 leading-relaxed">{subTask.note}</span>}
                                  </div>
                                  <div className="flex items-center justify-center gap-3">
                                    <Progress value={subTask.progress} indicatorColor={getProgressColor(subTask.progress)} className="h-2 w-14 bg-white/50" />
                                    <span className="text-[11px] font-black text-[#1e3a8a]">{subTask.progress}%</span>
                                  </div>
                                  <div className={`text-[11px] font-bold ${stStatus.color} text-center`}>{subTask.deadline}</div>
                                  <div className="flex items-center justify-center gap-3">
                                     <div className="flex -space-x-1.5">
                                        {subTask.assignee.split(',').map((name, i) => (
                                          <div key={i} className="h-7 w-7 rounded-full border-2 border-white text-[8px] flex items-center justify-center text-white font-black shadow-sm bg-blue-500">
                                            {name.trim().substring(0, 2).toUpperCase()}
                                          </div>
                                        ))}
                                     </div>
                                     <span className="text-[11px] font-bold text-[#1e3a8a] truncate max-w-[100px]">{subTask.assignee}</span>
                                  </div>
                                  <div className="flex justify-end pr-2 gap-1">
                                     <Badge variant="ghost" className={`text-[9px] font-black uppercase ${stStatus.color} border-none`}>{stStatus.label}</Badge>
                                     {(() => {
                                       const isAssigned = user && subTask.assignee.includes(user.name);
                                       return (isAdmin || isAssigned) && (
                                         <div className="flex items-center">
                                           <Button 
                                             variant="ghost" 
                                             size="icon" 
                                             className={cn("h-7 w-7", isAssigned && !isAdmin ? "text-amber-600 bg-amber-50" : "text-[#64748b] hover:text-[#2563eb]")} 
                                             onClick={() => openDialog('edit-st', okr.id, bigTask.id, subTask)}
                                           >
                                             <Edit2 className="h-3.5 w-3.5" />
                                           </Button>
                                           {isAdmin && (
                                             <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-50" onClick={() => { if (confirm('Xóa công việc này?')) deleteSubTask(okr.id, bigTask.id, subTask.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                                           )}
                                         </div>
                                       );
                                     })()}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )})}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
