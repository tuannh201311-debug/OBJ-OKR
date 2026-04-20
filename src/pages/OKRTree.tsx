import { useState, useEffect, useRef, useMemo } from 'react';
import Papa from 'papaparse';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Plus, AlertCircle, Trash2 } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const getProgressColor = (progress: number) => {
  if (progress >= 80) return 'bg-[#10b981]';
  if (progress >= 50) return 'bg-[#f59e0b]';
  return 'bg-[#ef4444]';
};

const getDeadlineStatus = (deadline: string, progress: number) => {
  if (progress >= 100) return { label: 'Done', variant: 'success' as const };
  const today = new Date();
  const dlDate = new Date(deadline);
  const diffTime = dlDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Quá hạn', variant: 'destructive' as const };
  if (progress === 0) return { label: 'To do', variant: 'secondary' as const };
  return { label: 'In progress', variant: 'warning' as const };
};

export function OKRTree() {
  const { okrs, user, addOkr, updateOkr, deleteOkr, addBigTask, updateBigTask, deleteBigTask, addSubTask, updateSubTask, deleteSubTask, importOkrs, highlightTaskId, setHighlightTaskId, systemUsers } = useAppContext();
  const isAdmin = user?.role === 'admin';
  const highlightRef = useRef<HTMLDivElement>(null);

  const [newOkrTitle, setNewOkrTitle] = useState('');
  const [newOkrDeadline, setNewOkrDeadline] = useState('');
  const [newOkrOwner, setNewOkrOwner] = useState('');
  const [editOkrTitle, setEditOkrTitle] = useState('');
  const [editOkrDeadline, setEditOkrDeadline] = useState('');
  const [editOkrOwner, setEditOkrOwner] = useState('');

  const [newBtTitle, setNewBtTitle] = useState('');
  const [newBtWeight, setNewBtWeight] = useState(100);
  const [newBtDeadline, setNewBtDeadline] = useState('');

  const [newStTitle, setNewStTitle] = useState('');
  const [newStAssignee, setNewStAssignee] = useState('');
  const [newStAssignee2, setNewStAssignee2] = useState('');
  const [newStWeight, setNewStWeight] = useState(100);
  const [newStDeadline, setNewStDeadline] = useState('');
  const [editStProgress, setEditStProgress] = useState(0);
  const [editStNote, setEditStNote] = useState('');
  const [editStAssignee, setEditStAssignee] = useState('');
  const [editStAssignee2, setEditStAssignee2] = useState('');
  const [editStDeadline, setEditStDeadline] = useState('');

  const expandedOkrIds = highlightTaskId
    ? okrs.filter(okr => okr.children.some(bt => bt.children.some(st => st.id === highlightTaskId))).map(o => o.id)
    : [];

  const [filterAssignee, setFilterAssignee] = useState<string>('all');

  const filteredOkrs = useMemo(() => {
    if (filterAssignee === 'all') return okrs;

    return okrs.map(okr => {
      const filteredBigTasks = okr.children.map(bt => {
        const filteredSubTasks = bt.children.filter(st => {
          const names = st.assignee.split(',').map(n => n.trim());
          return names.includes(filterAssignee);
        });
        return { ...bt, children: filteredSubTasks };
      }).filter(bt => bt.children.length > 0);

      return { ...okr, children: filteredBigTasks };
    }).filter(okr => okr.children.length > 0);
  }, [okrs, filterAssignee]);

  const [accordionValue, setAccordionValue] = useState<string[]>(expandedOkrIds.length > 0 ? expandedOkrIds : (okrs.length > 0 ? [okrs[0].id] : []));

  useEffect(() => {
    if (highlightTaskId && expandedOkrIds.length > 0) {
      setAccordionValue(expandedOkrIds);
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
      const timer = setTimeout(() => setHighlightTaskId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightTaskId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      complete: (results) => {
        const data = results.data as string[][];
        if (data.length < 2) { alert('File không đúng định dạng.'); return; }
        let headerIndex = 0;
        for (let i = 0; i < Math.min(5, data.length); i++) {
          if (data[i].some(cell => cell?.toLowerCase().includes('okr'))) { headerIndex = i; break; }
        }
        const newOkrsMap = new Map<string, any>();
        let currentOkr = '', currentBtTitle = '', currentBtDeadline = '', currentBtWeight = 0, currentStTitle = '';
        for (let i = headerIndex + 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length < 2) continue;
          if (row[0]?.trim()) currentOkr = row[0].trim();
          if (row[2]?.trim()) { currentBtTitle = row[2].trim(); currentBtDeadline = row[1]?.trim() || '2026-12-31'; currentBtWeight = parseFloat(row[3]?.replace('%', '')) || 0; }
          if (row[4]?.trim()) currentStTitle = row[4].trim();
          if (!currentOkr) continue;
          const okrTitle = currentOkr, btTitle = currentBtTitle || 'Untitled', stTitle = currentStTitle || 'Untitled';
          const hasSubTaskInfo = row[4]?.trim() || row[5]?.trim();
          const assignee = row[5]?.trim() || 'Chưa gán';
          const weight = parseFloat(row[6]?.replace('%', '')) || 0;
          const progress = parseFloat(row[7]?.replace('%', '')) || 0;
          const note = row[8]?.trim() || '';
          let deadline = row[1]?.trim() || currentBtDeadline;
          if (deadline.includes('/')) { const parts = deadline.split('/'); if (parts.length === 2) deadline = `2026-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`; }
          if (!newOkrsMap.has(okrTitle)) newOkrsMap.set(okrTitle, { id: `okr-imp-${Date.now()}-${Math.random()}`, title: okrTitle, type: 'OKR', progress: 0, deadline: '2026-12-31', children: [] });
          const okr = newOkrsMap.get(okrTitle)!;
          let bt = okr.children.find((b: any) => b.title === btTitle);
          if (!bt) { bt = { id: `bt-imp-${Date.now()}-${Math.random()}`, title: btTitle, progress: 0, weight: currentBtWeight, deadline, children: [] }; okr.children.push(bt); }
          if (hasSubTaskInfo) bt.children.push({ id: `st-imp-${Date.now()}-${Math.random()}`, title: stTitle, assignee, weight, deadline, progress, status: progress === 100 ? 'done' : progress > 0 ? 'in-progress' : 'todo', note });
        }
        importOkrs(Array.from(newOkrsMap.values()));
        alert('Import thành công!');
      }
    });
  };
  const personnelStats = useMemo(() => {
    const stats: Record<string, { total: number; delayed: number }> = {};
    okrs.forEach(okr => {
      okr.children.forEach(bt => {
        bt.children.forEach(st => {
          const names = st.assignee.split(',').map(n => n.trim()).filter(n => n && n !== 'Chưa gán');
          if (names.length === 0) names.push('Chưa gán');
          
          names.forEach(assignee => {
            if (!stats[assignee]) {
              stats[assignee] = { total: 0, delayed: 0 };
            }
            stats[assignee].total++;
            const dlStatus = getDeadlineStatus(st.deadline, st.progress);
            if (dlStatus.label === 'Quá hạn') {
              stats[assignee].delayed++;
            }
          });
        });
      });
    });
    return Object.entries(stats).sort((a, b) => b[1].total - a[1].total);
  }, [okrs]);


  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="flex flex-wrap gap-2 p-3 bg-[#f8fafc] rounded-lg border border-[#e2e8f0] shadow-sm">
        <div className="text-[10px] font-bold text-[#64748b] w-full mb-1 uppercase tracking-widest flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#2563eb]"></div>
            Thống kê nhân sự đang thực hiện {filterAssignee !== 'all' && <span className="text-[#2563eb] normal-case"> - Đang lọc: {filterAssignee}</span>}
          </div>
          {filterAssignee !== 'all' && (
            <button 
              onClick={() => setFilterAssignee('all')}
              className="text-[#2563eb] hover:underline cursor-pointer"
            >
              Hiển thị tất cả
            </button>
          )}
        </div>
        {personnelStats.length > 0 ? personnelStats.map(([name, stat]) => (
          <div 
            key={name} 
            onClick={() => setFilterAssignee(filterAssignee === name ? 'all' : name)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all cursor-pointer shadow-sm group hover:scale-[1.02] ${filterAssignee === name ? 'border-[#2563eb] bg-[#eff6ff] ring-1 ring-[#2563eb]' : 'border-[#e2e8f0] bg-[#ffffff] hover:border-[#2563eb]'}`}
          >
            <span className={`text-xs font-bold ${filterAssignee === name ? 'text-[#2563eb]' : 'text-[#334155]'}`}>{name}:</span>
            <div className="flex items-center gap-1.5">
               <div className={`flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${filterAssignee === name ? 'bg-[#2563eb] text-[#ffffff] border-[#2563eb]' : 'bg-[#eff6ff] text-[#2563eb] border-[#dbeafe]'}`}>
                  {stat.total} việc
               </div>
               {stat.delayed > 0 && (
                 <div className="flex items-center px-1.5 py-0.5 rounded-md bg-[#fef2f2] text-[#ef4444] text-[10px] font-bold border border-[#fee2e2]">
                    chậm {stat.delayed}
                 </div>
               )}
            </div>
          </div>
        )) : <p className="text-xs text-[#94a3b8] italic">Chưa có dữ liệu thống kê</p>}
      </div>
      <div className="flex justify-between items-center mb-1">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Quản lý OKR & Tiến độ</h1>
          <p className="text-[#64748b] text-sm mt-1">Cấu trúc phân cấp: OKR → Đầu việc lớn → Công việc chi tiết</p>
        </div>
        <div className="flex gap-2.5 items-center">
          {isAdmin && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-[#ffffff] border-[#e2e8f0] text-[#1e293b] rounded-md font-medium">Import Sheet</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Import OKR từ CSV</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-[#64748b]">Tải lên file CSV.</p>
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="flex h-10 w-full rounded-md border border-[#e2e8f0] bg-[#ffffff] px-3 py-2 text-sm" />
                </div>
              </DialogContent>
            </Dialog>
          )}
          {isAdmin && (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-[#2563eb] text-[#ffffff] rounded-md font-medium hover:bg-[#1d4ed8]">
                  <Plus className="mr-2 h-4 w-4" /> Thêm OKR
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Thêm OKR mới</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Tên OKR</Label>
                    <Input value={newOkrTitle} onChange={(e) => setNewOkrTitle(e.target.value)} placeholder="Nhập tên OKR..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Thời hạn OKR</Label>
                    <Input type="date" value={newOkrDeadline} onChange={(e) => setNewOkrDeadline(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Người thực hiện (Owner)</Label>
                    <select className="flex h-10 w-full rounded-md border border-[#e2e8f0] bg-[#ffffff] px-3 py-2 text-sm" value={newOkrOwner} onChange={(e) => setNewOkrOwner(e.target.value)}>
                      <option value="">Chọn</option>
                      {systemUsers.map(u => (
                        <option key={u.id} value={u.display_name || u.email}>{u.display_name || u.email}</option>
                      ))}
                    </select>
                  </div>
                  <Button onClick={() => { addOkr(newOkrTitle, newOkrDeadline || '2026-12-31', newOkrOwner || 'Chưa gán'); setNewOkrTitle(''); setNewOkrDeadline(''); setNewOkrOwner(''); }} className="w-full bg-[#2563eb]">Thêm</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>



      <Card className="bg-[#ffffff] rounded-xl border border-[#e2e8f0] flex-1 flex flex-col shadow-none overflow-hidden">
        <div className="bg-[#f1f5f9] px-4 py-2.5 grid grid-cols-[2fr_100px_120px_150px_160px] text-xs font-semibold text-[#64748b] uppercase">
          <div>Cấu trúc Phân cấp OKR & Công việc</div>
          <div>Tiến độ</div>
          <div>Thời hạn</div>
          <div>Người thực hiện</div>
          <div>Trạng thái</div>
        </div>
        <CardContent className="p-0 overflow-y-auto">
          <Accordion type="multiple" value={accordionValue} onValueChange={setAccordionValue} className="w-full">
            {filteredOkrs.map((okr) => {
              const dlStatusOkr = getDeadlineStatus(okr.deadline, okr.progress);
              return (
              <AccordionItem value={okr.id} key={okr.id} className="border-b border-[#e2e8f0]">
                <AccordionTrigger className={`px-4 py-3 hover:bg-[#f8fafc] border-b border-[#e2e8f0] ${dlStatusOkr.variant === 'destructive' ? 'bg-[#fee2e2]/30' : ''}`}>
                  <div className="grid grid-cols-[2fr_100px_120px_150px_160px] w-full items-center text-left text-[0.85rem]">
                    <div className={`flex items-center gap-2 pl-4 font-semibold ${dlStatusOkr.variant === 'destructive' ? 'text-[#ef4444]' : 'text-[#2563eb]'}`}>
                      <span>OKR: {okr.title}</span>
                    </div>
                    <div className="font-medium text-[#1e293b]">{okr.progress}%</div>
                    <div className="flex items-center gap-1 font-medium text-[#475569]">
                        {okr.deadline}
                        {dlStatusOkr.variant === 'destructive' && <AlertCircle className="h-3 w-3 text-[#ef4444]" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#cbd5e1] flex items-center justify-center text-[0.6rem] text-[#ffffff] font-bold">
                        {(okr.ownerId || 'C').substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-[#1e293b]">{okr.ownerId || 'Chưa gán'}</span>
                    </div>
                    <div className="flex justify-between items-center pr-6">
                      <Badge variant={dlStatusOkr.variant} className="px-2 py-0.5 rounded-full text-[0.7rem] font-medium">{dlStatusOkr.label}</Badge>
                      {isAdmin && (
                        <div className="flex gap-1" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                          <Dialog>
                            <DialogTrigger asChild>
                              <div className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-[#e2e8f0] cursor-pointer transition-colors" onClick={() => { setEditOkrTitle(okr.title); setEditOkrDeadline(okr.deadline || '2026-12-31'); setEditOkrOwner(okr.ownerId || 'Chưa gán'); }}>
                                <Edit2 className="h-3 w-3 text-[#64748b]" />
                              </div>
                            </DialogTrigger>
                            <DialogContent onClick={(e) => e.stopPropagation()}>
                              <DialogHeader><DialogTitle>Sửa OKR</DialogTitle></DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2"><Label>Tên OKR</Label><Input value={editOkrTitle} onChange={(e) => setEditOkrTitle(e.target.value)} /></div>
                                <div className="space-y-2"><Label>Thời hạn OKR</Label><Input type="date" value={editOkrDeadline} onChange={(e) => setEditOkrDeadline(e.target.value)} /></div>
                                <div className="space-y-2">
                                  <Label>Người thực hiện</Label>
                                  <select className="flex h-10 w-full rounded-md border border-[#e2e8f0] bg-[#ffffff] px-3 py-2 text-sm" value={editOkrOwner} onChange={(e) => setEditOkrOwner(e.target.value)}>
                                    <option value="">Chọn</option>
                                    {systemUsers.map(u => (
                                      <option key={u.id} value={u.display_name || u.email}>{u.display_name || u.email}</option>
                                    ))}
                                    <option value="Chưa gán">Chưa gán</option>
                                  </select>
                                </div>
                                <Button onClick={() => updateOkr(okr.id, editOkrTitle, editOkrDeadline, editOkrOwner)} className="w-full bg-[#2563eb]">Lưu thay đổi</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Dialog>
                            <DialogTrigger asChild>
                              <div className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-[#fee2e2] cursor-pointer transition-colors">
                                <Trash2 className="h-3 w-3 text-[#ef4444]" />
                              </div>
                            </DialogTrigger>
                            <DialogContent onClick={(e) => e.stopPropagation()}>
                              <DialogHeader><DialogTitle>Xác nhận xoá OKR</DialogTitle></DialogHeader>
                              <div className="py-4"><p className="text-sm text-[#64748b]">Bạn có chắc chắn muốn xoá OKR này?</p></div>
                              <Button variant="destructive" onClick={() => deleteOkr(okr.id)} className="w-full">Xoá OKR</Button>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-0 pb-0">
                  <div className="w-full">
                    {okr.children.map((bigTask) => {
                      const dlStatus = getDeadlineStatus(bigTask.deadline, bigTask.progress);
                      return (
                        <div key={bigTask.id} className={`w-full border-b border-[#e2e8f0] last:border-b-0 ${dlStatus.variant === 'destructive' ? 'bg-[#fee2e2]/20' : ''}`}>
                          <div className="px-4 py-3 hover:bg-[#f1f5f9] grid grid-cols-[2fr_100px_120px_150px_160px] items-center text-left text-[0.85rem] border-l-[3px] border-[#cbd5e1] ml-2">
                            <div className="flex items-center gap-2 pl-5 text-[#334155] font-semibold">
                              <div className="px-1.5 py-0.5 rounded bg-[#e2e8f0] text-[#475569] text-[0.65rem] font-bold uppercase tracking-wider">Đầu việc</div>
                              <span>{bigTask.title}</span>
                            </div>
                            <div className="font-semibold text-[#1e293b]">{bigTask.progress}%</div>
                            <div className="flex items-center gap-1 text-[#475569] font-medium">
                              {bigTask.deadline}
                              {dlStatus.variant === 'destructive' && <AlertCircle className="h-3 w-3 text-[#ef4444]" />}
                            </div>
                            <div className="text-[#94a3b8]">-</div>
                            <div className="flex justify-between items-center pr-6">
                              <Badge variant={dlStatus.variant} className="px-2 py-0.5 rounded-full text-[0.7rem] font-medium">{dlStatus.label}</Badge>
                              {isAdmin && (
                                <div className="flex gap-1 ml-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <div className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-[#e2e8f0] cursor-pointer transition-colors" onClick={() => { setNewBtTitle(bigTask.title); setNewBtWeight(bigTask.weight); setNewBtDeadline(bigTask.deadline); }}>
                                        <Edit2 className="h-3 w-3 text-[#64748b]" />
                                      </div>
                                    </DialogTrigger>
                                    <DialogContent onClick={(e) => e.stopPropagation()}>
                                      <DialogHeader><DialogTitle>Sửa Đầu việc lớn</DialogTitle></DialogHeader>
                                      <div className="space-y-4 py-4">
                                        <div className="space-y-2"><Label>Tên</Label><Input value={newBtTitle} onChange={(e) => setNewBtTitle(e.target.value)} /></div>
                                        <div className="grid grid-cols-2 gap-4">
                                          <div className="space-y-2"><Label>Trọng số (%)</Label><Input type="number" value={newBtWeight} onChange={(e) => setNewBtWeight(Number(e.target.value))} /></div>
                                          <div className="space-y-2"><Label>Thời hạn</Label><Input type="date" value={newBtDeadline} onChange={(e) => setNewBtDeadline(e.target.value)} /></div>
                                        </div>
                                        <Button onClick={() => updateBigTask(okr.id, bigTask.id, newBtTitle, newBtWeight, newBtDeadline)} className="w-full bg-[#2563eb]">Lưu</Button>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <div className="inline-flex items-center justify-center h-6 w-6 rounded-md hover:bg-[#fee2e2] cursor-pointer transition-colors">
                                        <Trash2 className="h-3 w-3 text-[#ef4444]" />
                                      </div>
                                    </DialogTrigger>
                                    <DialogContent onClick={(e) => e.stopPropagation()}>
                                      <DialogHeader><DialogTitle>Xác nhận xoá</DialogTitle></DialogHeader>
                                      <div className="py-4"><p className="text-sm text-[#64748b]">Xoá đầu việc lớn này?</p></div>
                                      <Button variant="destructive" onClick={() => deleteBigTask(okr.id, bigTask.id)} className="w-full">Xoá</Button>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="bg-[#f8fafc] border-y border-[#e2e8f0]">
                            {bigTask.children.map((subTask) => {
                              const isHighlighted = highlightTaskId === subTask.id;
                              const stStatus = getDeadlineStatus(subTask.deadline, subTask.progress);
                              return (
                                <div
                                  key={subTask.id}
                                  ref={isHighlighted ? highlightRef : undefined}
                                  className={`px-4 py-2 hover:bg-[#ffffff] grid grid-cols-[2fr_100px_120px_150px_160px] items-center text-left text-[0.8rem] border-b border-[#e2e8f0] last:border-b-0 transition-colors duration-500 ${isHighlighted ? 'bg-[#fef9c3] ring-2 ring-[#f59e0b] ring-inset' : ''} ${stStatus.variant === 'destructive' ? 'bg-[#fee2e2]/10' : ''}`}
                                >
                                  <div className="pl-14 flex flex-col gap-0.5 justify-center">
                                    <div className="text-[#1e293b] font-medium flex items-center gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#cbd5e1]"></span>
                                      {subTask.title}
                                    </div>
                                    {subTask.note && <span className="text-[#64748b] text-[0.75rem] ml-3.5 whitespace-pre-wrap break-words leading-relaxed mt-1" title={subTask.note}>{subTask.note}</span>}

                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Progress value={subTask.progress} indicatorColor={getProgressColor(subTask.progress)} className="h-1.5 w-12 bg-[#e2e8f0]" />
                                    <span className="font-medium text-[#1e293b]">{subTask.progress}%</span>
                                  </div>
                                  <div className="text-[#64748b] flex items-center gap-1">
                                    {subTask.deadline}
                                    {stStatus.variant === 'destructive' && <AlertCircle className="h-3 w-3 text-[#ef4444]" />}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="flex -space-x-2">
                                      {subTask.assignee.split(',').map((name, idx) => (
                                        <div key={idx} className="w-6 h-6 rounded-full bg-[#cbd5e1] border-2 border-[#ffffff] flex items-center justify-center text-[0.6rem] text-[#ffffff] font-bold" title={name.trim()}>
                                          {name.trim().substring(0, 2).toUpperCase()}
                                        </div>
                                      ))}
                                    </div>
                                    <span className="text-[#1e293b] text-[0.75rem] truncate max-w-[100px]">{subTask.assignee}</span>
                                  </div>
                                  <div className="flex justify-between items-center pr-3">
                                    <Badge variant={stStatus.variant} className="px-2 py-0.5 rounded-full text-[0.7rem] font-medium">
                                      {stStatus.label}
                                    </Badge>
                                    {isAdmin && (
                                      <div className="flex gap-1">
                                        <Dialog>
                                          <DialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                                              setEditStProgress(subTask.progress); 
                                              setEditStNote(subTask.note || ''); 
                                              const assignees = subTask.assignee.split(',').map(a => a.trim());
                                              setEditStAssignee(assignees[0] || '');
                                              setEditStAssignee2(assignees[1] || '');
                                              setEditStDeadline(subTask.deadline); 
                                              setNewStTitle(subTask.title); 
                                              setNewStWeight(subTask.weight);
                                            }}>
                                              <Edit2 className="h-3 w-3 text-[#64748b]" />
                                            </Button>
                                          </DialogTrigger>
                                          <DialogContent>
                                            <DialogHeader><DialogTitle>Cập nhật công việc</DialogTitle></DialogHeader>
                                            <div className="space-y-4 py-4">
                                              <div className="space-y-2"><Label>Tên</Label><Input value={newStTitle} onChange={(e) => setNewStTitle(e.target.value)} /></div>
                                              <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2"><Label>Tiến độ (%)</Label><Input type="number" min="0" max="100" value={editStProgress} onChange={(e) => setEditStProgress(Number(e.target.value))} /></div>
                                                <div className="space-y-2"><Label>Trọng số (%)</Label><Input type="number" value={newStWeight} onChange={(e) => setNewStWeight(Number(e.target.value))} /></div>
                                              </div>
                                              <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                  <Label>Người gán 1</Label>
                                                  <select className="flex h-10 w-full rounded-md border border-[#e2e8f0] bg-[#ffffff] px-3 py-2 text-sm" value={editStAssignee} onChange={(e) => setEditStAssignee(e.target.value)}>
                                                    <option value="">Chọn</option>
                                                    {systemUsers.map(u => (
                                                      <option key={u.id} value={u.display_name || u.email}>{u.display_name || u.email}</option>
                                                    ))}
                                                    <option value="Chưa gán">Chưa gán</option>
                                                  </select>
                                                </div>
                                                <div className="space-y-2">
                                                  <Label>Người gán 2</Label>
                                                  <select className="flex h-10 w-full rounded-md border border-[#e2e8f0] bg-[#ffffff] px-3 py-2 text-sm" value={editStAssignee2} onChange={(e) => setEditStAssignee2(e.target.value)}>
                                                    <option value="">Chọn</option>
                                                    {systemUsers.map(u => (
                                                      <option key={u.id} value={u.display_name || u.email}>{u.display_name || u.email}</option>
                                                    ))}
                                                  </select>
                                                </div>
                                              </div>
                                              <div className="space-y-2"><Label>Thời hạn</Label><Input type="date" value={editStDeadline} onChange={(e) => setEditStDeadline(e.target.value)} /></div>
                                              <div className="space-y-2"><Label>Ghi chú</Label><Input value={editStNote} onChange={(e) => setEditStNote(e.target.value)} placeholder="Nhập ghi chú..." /></div>
                                              <Button onClick={() => {
                                                const combinedAssignees = [editStAssignee, editStAssignee2].filter(a => a && a !== 'Chưa gán').join(', ') || 'Chưa gán';
                                                updateSubTask(okr.id, bigTask.id, subTask.id, editStProgress, editStNote, combinedAssignees, editStDeadline, newStTitle, newStWeight);
                                              }} className="w-full bg-[#2563eb]">Lưu</Button>
                                            </div>
                                          </DialogContent>
                                        </Dialog>
                                        <Dialog>
                                          <DialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-[#fee2e2]">
                                              <Trash2 className="h-3 w-3 text-[#ef4444]" />
                                            </Button>
                                          </DialogTrigger>
                                          <DialogContent>
                                            <DialogHeader><DialogTitle>Xác nhận xoá</DialogTitle></DialogHeader>
                                            <div className="py-4"><p className="text-sm text-[#64748b]">Xoá công việc này?</p></div>
                                            <Button variant="destructive" onClick={() => deleteSubTask(okr.id, bigTask.id, subTask.id)} className="w-full">Xoá</Button>
                                          </DialogContent>
                                        </Dialog>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                            {isAdmin && (
                              <div className="px-4 py-2 pl-14">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="text-xs text-[#2563eb] h-7 hover:bg-[#eff6ff]">
                                      <Plus className="h-3 w-3 mr-1" /> Thêm công việc chi tiết
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader><DialogTitle>Thêm công việc chi tiết</DialogTitle></DialogHeader>
                                    <div className="space-y-4 py-4">
                                      <div className="space-y-2"><Label>Tên</Label><Input value={newStTitle} onChange={(e) => setNewStTitle(e.target.value)} /></div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label>Người gán 1</Label>
                                          <select className="flex h-10 w-full rounded-md border border-[#e2e8f0] bg-[#ffffff] px-3 py-2 text-sm" value={newStAssignee} onChange={(e) => setNewStAssignee(e.target.value)}>
                                            <option value="">Chọn</option>
                                            {systemUsers.map(u => (
                                              <option key={u.id} value={u.display_name || u.email}>{u.display_name || u.email}</option>
                                            ))}
                                          </select>
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Người gán 2</Label>
                                          <select className="flex h-10 w-full rounded-md border border-[#e2e8f0] bg-[#ffffff] px-3 py-2 text-sm" value={newStAssignee2} onChange={(e) => setNewStAssignee2(e.target.value)}>
                                            <option value="">Chọn</option>
                                            {systemUsers.map(u => (
                                              <option key={u.id} value={u.display_name || u.email}>{u.display_name || u.email}</option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2"><Label>Trọng số (%)</Label><Input type="number" value={newStWeight} onChange={(e) => setNewStWeight(Number(e.target.value))} /></div>
                                        <div className="space-y-2"><Label>Thời hạn</Label><Input type="date" value={newStDeadline} onChange={(e) => setNewStDeadline(e.target.value)} /></div>
                                      </div>
                                      <Button onClick={() => { 
                                        const combinedAssignees = [newStAssignee, newStAssignee2].filter(a => a && a !== 'Chưa gán').join(', ') || 'Chưa gán';
                                        addSubTask(okr.id, bigTask.id, { title: newStTitle, assignee: combinedAssignees, weight: newStWeight, deadline: newStDeadline, progress: 0, status: 'todo' }); 
                                        setNewStTitle(''); setNewStAssignee(''); setNewStAssignee2(''); setNewStDeadline(''); 
                                      }} className="w-full bg-[#2563eb]">Thêm</Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {isAdmin && (
                      <div className="px-4 py-2 pl-9 border-t border-[#e2e8f0]">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-xs text-[#2563eb] h-7 hover:bg-[#eff6ff]">
                              <Plus className="h-3 w-3 mr-1" /> Thêm Đầu việc lớn
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Thêm Đầu việc lớn</DialogTitle></DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2"><Label>Tên</Label><Input value={newBtTitle} onChange={(e) => setNewBtTitle(e.target.value)} /></div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Trọng số (%)</Label><Input type="number" value={newBtWeight} onChange={(e) => setNewBtWeight(Number(e.target.value))} /></div>
                                <div className="space-y-2"><Label>Thời hạn</Label><Input type="date" value={newBtDeadline} onChange={(e) => setNewBtDeadline(e.target.value)} /></div>
                              </div>
                              <Button onClick={() => { addBigTask(okr.id, { title: newBtTitle, weight: newBtWeight, deadline: newBtDeadline }); setNewBtTitle(''); setNewBtDeadline(''); }} className="w-full bg-[#2563eb]">Thêm</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
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
