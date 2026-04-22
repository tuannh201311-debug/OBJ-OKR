import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/context/AppContext';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { Eye, Shield, Calendar, Layers, TrendingUp, Sparkles, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const COLORS = ['#2563eb', '#e2e8f0'];

const getProgressColor = (progress: number) => {
  if (progress >= 80) return 'bg-[#10b981]';
  if (progress >= 50) return 'bg-[#f59e0b]';
  return 'bg-[#ef4444]';
};

const getDeadlineStatus = (deadline: string, progress: number, completedAt?: string) => {
  if (progress === 100) {
    if (completedAt && deadline) {
      const compDate = new Date(completedAt);
      const dlDate = new Date(deadline);
      compDate.setHours(0, 0, 0, 0);
      dlDate.setHours(0, 0, 0, 0);
      if (compDate > dlDate) {
        return { label: 'Completed Late', variant: 'destructive' as const, color: 'text-rose-500' };
      }
    }
    return { label: 'Completed', variant: 'success' as const, color: 'text-emerald-500' };
  }
  const today = new Date();
  if (!deadline) return { label: 'No Deadline', variant: 'secondary' as const, color: 'text-slate-400' };
  const dlDate = new Date(deadline);
  const diffTime = dlDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Overdue', variant: 'destructive' as const, color: 'text-rose-500' };
  if (progress === 0) return { label: 'Pending', variant: 'secondary' as const, color: 'text-slate-400' };
  return { label: 'In Progress', variant: 'warning' as const, color: 'text-amber-500' };
};

export function Viewer() {
  const { okrs } = useAppContext();
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [accordionValue, setAccordionValue] = useState<string[]>([]);

  useEffect(() => {
    if (okrs.length > 0 && accordionValue.length === 0 && filterAssignee === 'all' && !filterStatus) {
      setAccordionValue([okrs[0].id]);
    }
  }, [okrs]);

  useEffect(() => {
    if (filterAssignee !== 'all' || filterStatus) {
      setAccordionValue(filteredOkrs.map(o => o.id));
    }
  }, [filterAssignee, filterStatus]);

  const filteredOkrs = useMemo(() => {
    if (filterAssignee === 'all' && !filterStatus) return okrs;

    return okrs.map(okr => {
      const filteredBigTasks = okr.children.map(bt => {
        const filteredSubTasks = bt.children.filter(st => {
          const names = (st.assignee || '').split(',').map(n => n.trim());
          const matchAssignee = filterAssignee === 'all' || names.includes(filterAssignee) || (filterAssignee === 'Chưa gán' && (names.length === 0 || !st.assignee || st.assignee === 'Chưa gán'));

          if (!matchAssignee) return false;

          if (filterStatus) {
            const dlStatus = getDeadlineStatus(st.deadline, st.progress, st.completed_at);
            if (filterStatus === 'Done') return dlStatus.label.includes('Completed');
            if (filterStatus === 'Doing') return dlStatus.label === 'In Progress';
            if (filterStatus === 'Delay') return dlStatus.label === 'Overdue';
          }

          return true;
        });
        return { ...bt, children: filteredSubTasks };
      }).filter(bt => bt.children.length > 0);

      return { ...okr, children: filteredBigTasks };
    }).filter(okr => okr.children.length > 0);
  }, [okrs, filterAssignee, filterStatus]);

  const personnelStats = useMemo(() => {
    const stats: Record<string, { total: number; done: number; doing: number; delayed: number }> = {};
    okrs.forEach(okr => {
      okr.children.forEach(bt => {
        bt.children.forEach(st => {
          const names = (st.assignee || '').split(',').map(n => n.trim()).filter(n => n && n !== 'Chưa gán');
          if (names.length === 0) names.push('Chưa gán');

          names.forEach(assignee => {
            if (!stats[assignee]) {
              stats[assignee] = { total: 0, done: 0, doing: 0, delayed: 0 };
            }
            stats[assignee].total++;
            const dlStatus = getDeadlineStatus(st.deadline, st.progress, st.completed_at);

            if (dlStatus.label.includes('Completed')) {
              stats[assignee].done++;
            } else if (dlStatus.label === 'Overdue') {
              stats[assignee].delayed++;
            } else if (dlStatus.label === 'In Progress') {
              stats[assignee].doing++;
            }
          });
        });
      });
    });
    return Object.entries(stats).sort((a, b) => b[1].total - a[1].total);
  }, [okrs]);

  const totalOkrProgress = okrs.length > 0
    ? Math.round(okrs.reduce((acc, okr) => acc + okr.progress, 0) / okrs.length)
    : 0;

  const overallProgressData = [
    { name: 'Hoàn thành', value: totalOkrProgress },
    { name: 'Chưa hoàn thành', value: 100 - totalOkrProgress },
  ];

  const okrTLData = okrs.map(okr => ({ name: okr.title, progress: okr.progress }));

  return (
    <div className="min-h-screen liquid-gradient font-fira-sans text-[#1e293b] pb-20">
      {/* Premium Header */}
      <header className="glass-card m-4 p-4 rounded-[2rem] flex items-center justify-between sticky top-4 z-50">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#2563eb] to-[#60a5fa] flex items-center justify-center shadow-lg shadow-blue-200">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="block text-lg font-fira-code font-bold text-[#1e3a8a] leading-none">9Pay OKR</span>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-blue-50 text-[#2563eb] text-[8px] h-4 px-1.5 border-none font-black uppercase tracking-widest"><Eye className="h-2.5 w-2.5 mr-1" /> Public View</Badge>
            </div>
          </div>
        </div>
        <Link to="/login" className="text-sm font-bold text-[#2563eb] hover:underline px-4">Admin Portal</Link>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-fira-code font-bold text-[#1e3a8a]">Strategic Progress</h1>
            <p className="text-[#64748b] text-sm mt-1">External dashboard for transparency and alignment.</p>
          </div>
          <div className="bg-white/40 border border-white/60 px-4 py-2 rounded-2xl flex items-center gap-3">
            <Calendar className="h-4 w-4 text-[#2563eb]" />
            <span className="text-sm font-bold text-[#1e3a8a]">{new Date().toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Resource Allocation */}
        <div className="glass-card p-4 rounded-3xl space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Sparkles className="h-4 w-4 text-[#2563eb]" />
            <span className="text-[10px] font-black text-[#64748b] uppercase tracking-widest">Ownership & Velocity</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {personnelStats.map(([name, stat]) => (
              <button
                key={name}
                onClick={() => { setFilterAssignee(filterAssignee === name ? 'all' : name); setFilterStatus(null); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-2xl border transition-all text-xs font-bold ${filterAssignee === name ? 'bg-[#2563eb] text-white border-none shadow-lg' : 'bg-white/40 border-white/60 text-[#1e3a8a] hover:bg-white/80'}`}
              >
                {name} <span className={`px-1.5 rounded-lg ${filterAssignee === name ? 'bg-white/20' : 'bg-blue-50 text-[#2563eb]'}`}>{stat.total}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card p-8 rounded-[2.5rem] border-none flex flex-col gap-3 group hover:scale-105 transition-all">
            <TrendingUp className="h-8 w-8 text-[#2563eb]" />
            <p className="text-[10px] font-black text-[#64748b] uppercase tracking-widest">Total Velocity</p>
            <div className="text-4xl font-fira-code font-bold text-[#1e3a8a]">{totalOkrProgress}%</div>
          </Card>
          <Card className="glass-card p-8 rounded-[2.5rem] border-none flex flex-col gap-3 group hover:scale-105 transition-all">
            <Layers className="h-8 w-8 text-cyan-500" />
            <p className="text-[10px] font-black text-[#64748b] uppercase tracking-widest">Active Objectives</p>
            <div className="text-4xl font-fira-code font-bold text-[#1e3a8a]">{okrs.length}</div>
          </Card>
          <Card className="glass-card p-8 rounded-[2.5rem] border-none flex flex-col gap-3 group hover:scale-105 transition-all">
            <Sparkles className="h-8 w-8 text-amber-500" />
            <p className="text-[10px] font-black text-[#64748b] uppercase tracking-widest">Total Deliverables</p>
            <div className="text-4xl font-fira-code font-bold text-[#1e3a8a]">{okrs.reduce((a, o) => a + o.children.reduce((b, bt) => b + bt.children.length, 0), 0)}</div>
          </Card>
        </div>

        {/* Visual Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="glass-card rounded-[2.5rem] p-8 border-none flex flex-col items-center">
            <h3 className="text-sm font-black text-[#1e3a8a] uppercase tracking-widest mb-6 w-full text-center">Global Progress</h3>
            <div className="w-full h-[220px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={overallProgressData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={10} dataKey="value" stroke="none">
                    {overallProgressData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={12} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-fira-code font-bold text-[#1e3a8a]">{totalOkrProgress}%</span>
                <span className="text-[10px] font-black text-[#64748b] uppercase">Done</span>
              </div>
            </div>
          </Card>
          <Card className="lg:col-span-2 glass-card rounded-[2.5rem] p-8 border-none">
            <h3 className="text-sm font-black text-[#1e3a8a] uppercase tracking-widest mb-6">Objective Matrix</h3>
            <div className="w-full h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={okrTLData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} height={40} />
                  <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                  <RechartsTooltip cursor={{ fill: 'rgba(37, 99, 235, 0.05)' }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="progress" radius={[12, 12, 12, 12]} barSize={40} fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Detailed Tree (Read Only) */}
        <Card className="glass-card border-none rounded-[3rem] overflow-hidden">
          <div className="bg-[#1e3a8a]/5 px-10 py-6 grid grid-cols-[2fr_100px_120px_150px_160px] text-[10px] font-black text-[#64748b] uppercase tracking-[0.2em] border-b border-white/20">
            <div>Hierarchy & Deliverables</div>
            <div>Velocity</div>
            <div>Timeline</div>
            <div>Ownership</div>
            <div className="text-right pr-6">Status</div>
          </div>
          <CardContent className="p-0 overflow-y-auto scrollbar-hide">
            <Accordion type="multiple" value={accordionValue} onValueChange={setAccordionValue} className="w-full">
              {filteredOkrs.map((okr) => {
                const dlStatusOkr = getDeadlineStatus(okr.deadline, okr.progress, okr.completed_at);
                return (
                  <AccordionItem value={okr.id} key={okr.id} className="border-b border-white/10 last:border-0">
                    <AccordionTrigger className={`px-10 py-6 hover:bg-white/30 transition-colors border-none no-underline`}>
                      <div className="grid grid-cols-[2fr_100px_120px_150px_160px] w-full items-center text-left">
                        <div className="flex items-center gap-4 font-fira-code font-bold text-[#1e3a8a] text-sm">
                          <div className="h-2.5 w-2.5 rounded-full bg-[#2563eb] shadow-[0_0_8px_#2563eb]" />
                          OBJ: {okr.title}
                        </div>
                        <div className="text-xs font-black text-[#1e3a8a]">{okr.progress}%</div>
                        <div className="text-[10px] font-bold text-[#64748b] italic">Strategic</div>
                        <div className="text-[#64748b] text-[10px] font-bold uppercase tracking-widest">-</div>
                        <div className="flex justify-end pr-4">
                          <Badge className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border-none bg-blue-100 text-[#2563eb]`}>
                            {dlStatusOkr.label}
                          </Badge>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-0 pb-8 px-8">
                      <div className="space-y-4">
                        {okr.children.map((bigTask) => {
                          const dlStatus = getDeadlineStatus(bigTask.deadline, bigTask.progress, bigTask.completed_at);
                          return (
                            <div key={bigTask.id} className="glass-card bg-white/20 border-white/40 rounded-3xl overflow-hidden">
                              <div className="px-8 py-5 bg-white/30 grid grid-cols-[2fr_100px_120px_150px_160px] items-center">
                                <div className="flex items-center gap-3">
                                  <div className="bg-[#1e3a8a] text-white text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest">KR</div>
                                  <span className="text-xs font-bold text-[#1e3a8a]">{bigTask.title}</span>
                                </div>
                                <div className="text-xs font-black text-[#1e3a8a]">{bigTask.progress}%</div>
                                <div className={`text-[10px] font-bold ${dlStatus.color}`}>{bigTask.deadline}</div>
                                <div className="text-[#64748b]">-</div>
                                <div className="flex justify-end pr-2">
                                  <Badge className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase border-none bg-white text-[#2563eb]`}>
                                    {dlStatus.label}
                                  </Badge>
                                </div>
                              </div>
                              <div className="p-2 space-y-1">
                                {bigTask.children.map((subTask) => {
                                  const stStatus = getDeadlineStatus(subTask.deadline, subTask.progress, subTask.completed_at);
                                  return (
                                    <div key={subTask.id} className="px-6 py-4 rounded-2xl grid grid-cols-[2fr_100px_120px_150px_160px] items-center hover:bg-white/40 transition-all">
                                      <div className="flex flex-col">
                                        <div className="text-xs font-bold text-[#1e3a8a] flex items-center gap-2">
                                          <ChevronRight className="h-3 w-3 text-[#64748b]" />
                                          {subTask.title}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <Progress value={subTask.progress} indicatorColor={getProgressColor(subTask.progress)} className="h-1 w-12 bg-white/60" />
                                        <span className="text-[10px] font-black text-[#1e3a8a]">{subTask.progress}%</span>
                                      </div>
                                      <div className={`text-[9px] font-bold ${stStatus.color}`}>{subTask.deadline}</div>
                                      <div className="flex items-center gap-2">
                                        <div className="flex -space-x-1.5">
                                          {subTask.assignee.split(',').map((name, i) => (
                                            <div key={i} className="h-6 w-6 rounded-full bg-[#2563eb] border-2 border-white text-[8px] flex items-center justify-center text-white font-black" title={name.trim()}>
                                              {name.trim().substring(0, 2).toUpperCase()}
                                            </div>
                                          ))}
                                        </div>
                                        <span className="text-[9px] font-bold text-[#1e3a8a] truncate max-w-[80px]">{subTask.assignee}</span>
                                      </div>
                                      <div className="flex justify-end pr-2">
                                        <Badge variant="ghost" className={`text-[8px] font-black uppercase ${stStatus.color} border-none`}>{stStatus.label}</Badge>
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
                );
              })}
            </Accordion>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
