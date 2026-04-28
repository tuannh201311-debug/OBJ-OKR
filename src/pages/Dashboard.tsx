import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Calendar, CheckCircle2, Clock, Sparkles, TrendingUp } from 'lucide-react';

const COLORS = ['#2563eb', '#e2e8f0'];

export function Dashboard() {
  const { okrs, setHighlightTaskId } = useAppContext();
  const navigate = useNavigate();

  const totalOkrProgress = okrs.length > 0
    ? Math.round(okrs.reduce((acc, okr) => acc + okr.progress, 0) / okrs.length)
    : 0;

  const overallProgressData = [
    { name: 'Hoàn thành', value: totalOkrProgress },
    { name: 'Chưa hoàn thành', value: 100 - totalOkrProgress },
  ];

  const okrTLData = okrs.map(okr => {
    let isOverdue = false;
    if (okr.progress < 100 && okr.deadline) {
      const today = new Date();
      const dlDate = new Date(okr.deadline);
      const diffTime = dlDate.getTime() - today.getTime();
      if (Math.ceil(diffTime / (1000 * 60 * 60 * 24)) < 0) {
        isOverdue = true;
      }
    }
    return {
      id: okr.id,
      name: okr.title,
      progress: okr.progress,
      isOverdue
    };
  });

  const delayedTasks: any[] = [];
  const upcomingTasks: any[] = [];

  okrs.forEach(okr => {
    okr.children.forEach(bt => {
      bt.children.forEach(st => {
        if (st.progress < 100) {
          const today = new Date();
          const dlDate = new Date(st.deadline);
          const diffTime = dlDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays < 0) {
            delayedTasks.push({
              id: st.id, title: st.title, assignee: st.assignee, progress: st.progress, delayDays: Math.abs(diffDays),
              okrId: okr.id, btId: bt.id
            });
          } else if (diffDays <= 7) {
            upcomingTasks.push({
              id: st.id, title: st.title, assignee: st.assignee, progress: st.progress, deadline: st.deadline, daysLeft: diffDays,
              okrId: okr.id, btId: bt.id
            });
          }
        }
      });
    });
  });

  delayedTasks.sort((a, b) => b.delayDays - a.delayDays);
  upcomingTasks.sort((a, b) => a.daysLeft - b.daysLeft);

  const handleTaskClick = (taskId: string) => {
    setHighlightTaskId(taskId);
    navigate('/okr-tree');
  };

  const activeTaskCount = okrs.reduce((acc, okr) => acc + okr.children.reduce((a, bt) => a + bt.children.filter(st => st.progress > 0 && st.progress < 100).length, 0), 0);

  return (
    <div className="flex flex-col gap-3 font-inter h-[calc(100vh-100px)] overflow-hidden">
      <header className="flex flex-row justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-[#1e3a8a] tracking-tight">Dashboard</h1>
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#2563eb] text-[10px] font-black uppercase tracking-widest">
             <Sparkles className="h-3 w-3" /> Hiệu suất 9Pay
          </div>
        </div>
        <div className="bg-white/40 border border-white/60 px-4 py-1.5 rounded-xl flex items-center gap-2 shadow-sm">
          <Calendar className="h-4 w-4 text-[#2563eb]" />
          <span className="text-sm font-semibold text-[#1e3a8a]">{new Date().toLocaleDateString('vi-VN', { day: 'numeric', month: 'long' })}</span>
        </div>
      </header>

      {/* KPI Cards - Compact Row */}
      <div className="grid grid-cols-3 gap-3 shrink-0">
        <Card className="glass-card p-4 rounded-[1.5rem] border-none flex items-center gap-4 group hover:scale-[1.01] transition-all">
          <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <TrendingUp className="h-5 w-5 text-[#2563eb]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest truncate">Tiến độ chung</p>
            <div className="text-2xl font-fira-code font-bold text-[#1e3a8a]">{totalOkrProgress}%</div>
          </div>
        </Card>
        
        <Card className="glass-card p-4 rounded-[1.5rem] border-none flex items-center gap-4 group hover:scale-[1.01] transition-all">
          <div className="h-9 w-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
            <AlertCircle className="h-5 w-5 text-rose-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest truncate">Chậm Deadline</p>
            <div className="text-2xl font-fira-code font-bold text-rose-600">{delayedTasks.length}</div>
          </div>
        </Card>

        <Card className="glass-card p-4 rounded-[1.5rem] border-none flex items-center gap-4 group hover:scale-[1.01] transition-all">
          <div className="h-9 w-9 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5 text-cyan-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest truncate">Đang thực hiện</p>
            <div className="text-2xl font-fira-code font-bold text-[#1e3a8a]">{activeTaskCount}</div>
          </div>
        </Card>
      </div>

      {/* Enlarged Chart Section */}
      <div className="grid grid-cols-4 gap-3 flex-[2] min-h-0">
        <Card className="glass-card rounded-[2rem] border-none p-5 flex flex-col items-center">
          <h3 className="text-[11px] font-bold text-[#1e3a8a] uppercase tracking-widest mb-4">Tiến độ tổng thể</h3>
          <div className="w-full flex-1 relative min-h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={overallProgressData} cx="50%" cy="50%" innerRadius="70%" outerRadius="95%" paddingAngle={5} dataKey="value" stroke="none">
                  {overallProgressData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={12} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-fira-code font-bold text-[#1e3a8a]">{totalOkrProgress}%</span>
              <span className="text-[10px] font-bold text-[#64748b] uppercase">Hoàn thành</span>
            </div>
          </div>
        </Card>

        <Card className="col-span-3 glass-card rounded-[2rem] border-none p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-[#1e3a8a] uppercase tracking-[0.2em]">Tiến độ dự án</h3>
            <div className="flex items-center gap-5">
               <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" /><span className="text-xs font-medium text-[#64748b]">Đúng hạn</span></div>
               <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" /><span className="text-xs font-medium text-[#64748b]">Chậm hạn</span></div>
            </div>
          </div>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={okrTLData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} 
                  height={80} 
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                <RechartsTooltip cursor={{ fill: 'rgba(37, 99, 235, 0.03)' }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Bar 
                  dataKey="progress" 
                  radius={[12, 12, 12, 12]} 
                  barSize={50}
                  onClick={(data) => {
                    if (data && data.id) {
                      setHighlightTaskId(data.id);
                      navigate('/okr-tree');
                    }
                  }}
                  className="cursor-pointer"
                >
                  {okrTLData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isOverdue ? '#EF4444' : '#2563eb'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Colored Task Section */}
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
        {/* Upcoming Tasks - Orange Background */}
        <Card className="glass-card rounded-[1.5rem] border-none p-5 flex flex-col min-h-0">
          <div className="flex items-center gap-3 mb-3 shrink-0">
             <div className="h-7 w-7 rounded-lg bg-amber-100 flex items-center justify-center shadow-sm">
               <Clock className="h-4 w-4 text-amber-600" />
             </div>
             <div className="flex items-center gap-2">
               <h3 className="text-sm font-bold text-[#1e3a8a]">Hạn chót sắp tới</h3>
               <Badge className="bg-amber-100 text-amber-700 border-none px-2 py-0 h-5 text-[10px] font-black">{upcomingTasks.length}</Badge>
             </div>
          </div>
          <div className="space-y-2 overflow-y-auto pr-1 scrollbar-hide flex-1">
            {upcomingTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-4 bg-amber-50/70 border border-amber-200/60 rounded-2xl cursor-pointer hover:bg-amber-100/80 transition-all group" onClick={() => handleTaskClick(task.id)}>
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="text-[14px] font-bold text-[#1e3a8a] truncate leading-tight">{task.title}</h4>
                  <div className="flex items-center mt-1.5 gap-3">
                    <span className="text-[10px] font-bold text-[#64748b] uppercase">{task.assignee}</span>
                    <span className="text-[10px] text-amber-600 font-bold uppercase">• Còn {task.daysLeft === 0 ? 'Hôm nay' : `${task.daysLeft} ngày`}</span>
                  </div>
                </div>
                <div className="w-12 shrink-0 text-right">
                  <span className="text-[12px] font-black text-[#1e3a8a]">{task.progress}%</span>
                </div>
              </div>
            ))}
            {upcomingTasks.length === 0 && <p className="text-center py-4 text-[#64748b] text-xs italic">Dữ liệu trống.</p>}
          </div>
        </Card>

        {/* Delayed Tasks - Red Background */}
        <Card className="glass-card rounded-[1.5rem] border-none p-5 flex flex-col min-h-0">
          <div className="flex items-center gap-3 mb-3 shrink-0">
             <div className="h-7 w-7 rounded-lg bg-rose-100 flex items-center justify-center shadow-sm">
               <AlertCircle className="h-4 w-4 text-rose-600" />
             </div>
             <div className="flex items-center gap-2">
               <h3 className="text-sm font-bold text-[#1e3a8a]">Chậm Deadline</h3>
               <Badge className="bg-rose-100 text-rose-700 border-none px-2 py-0 h-5 text-[10px] font-black">{delayedTasks.length}</Badge>
             </div>
          </div>
          <div className="space-y-2 overflow-y-auto pr-1 scrollbar-hide flex-1">
            {delayedTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-4 bg-rose-50/80 border border-rose-200/60 rounded-2xl cursor-pointer hover:bg-rose-100/80 transition-all group" onClick={() => handleTaskClick(task.id)}>
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="text-[14px] font-bold text-[#1e3a8a] truncate leading-tight">{task.title}</h4>
                  <div className="flex items-center mt-1.5 gap-3">
                    <span className="text-[10px] font-bold text-[#64748b] uppercase">{task.assignee}</span>
                    <span className="text-[10px] text-rose-500 font-black uppercase">• Chậm {task.delayDays} ngày</span>
                  </div>
                </div>
                <div className="w-12 shrink-0 text-right">
                  <span className="text-[12px] font-black text-rose-600">{task.progress}%</span>
                </div>
              </div>
            ))}
            {delayedTasks.length === 0 && <p className="text-center py-4 text-[#64748b] text-xs italic">Không có task trễ.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
