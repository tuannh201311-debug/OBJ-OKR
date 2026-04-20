import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/context/AppContext';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { Eye, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const COLORS = ['#2563eb', '#e2e8f0'];

const getProgressColor = (progress: number) => {
  if (progress >= 80) return 'bg-[#10b981]';
  if (progress >= 50) return 'bg-[#f59e0b]';
  return 'bg-[#ef4444]';
};

const getDeadlineStatus = (deadline: string, progress: number) => {
  if (progress === 100) return { label: 'Hoàn thành', variant: 'success' as const };
  const today = new Date();
  const dlDate = new Date(deadline);
  const diffTime = dlDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Quá hạn', variant: 'destructive' as const };
  if (progress === 0) return { label: 'Chưa triển khai', variant: 'secondary' as const };
  return { label: 'Đang triển khai', variant: 'warning' as const };
};

export function Viewer() {
  const { okrs } = useAppContext();

  const totalOkrProgress = okrs.length > 0
    ? Math.round(okrs.reduce((acc, okr) => acc + okr.progress, 0) / okrs.length)
    : 0;

  const overallProgressData = [
    { name: 'Hoàn thành', value: totalOkrProgress },
    { name: 'Chưa hoàn thành', value: 100 - totalOkrProgress },
  ];

  const okrTLData = okrs.map(okr => ({ name: okr.title, progress: okr.progress }));

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-[#1e293b]">
      {/* Header */}
      <header className="bg-[#ffffff] border-b border-[#e2e8f0] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-[#2563eb]" />
          <span className="text-xl font-extrabold text-[#2563eb]">OKR TL - 9Pay</span>
          <Badge variant="secondary" className="ml-3 text-xs"><Eye className="h-3 w-3 mr-1" />Chế độ xem</Badge>
        </div>
        <Link to="/login" className="text-sm text-[#2563eb] hover:underline">Đăng nhập Admin</Link>
      </header>

      <main className="max-w-7xl mx-auto p-6 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Tổng quan tiến độ dự án</h1>
          <p className="text-[#64748b] text-sm mt-1">Cập nhật lần cuối: {new Date().toLocaleString('vi-VN')}</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-[#ffffff] p-4 rounded-xl border border-[#e2e8f0]">
            <div className="text-xs text-[#64748b] uppercase tracking-wide mb-2">Tổng hoàn thành</div>
            <div className="text-2xl font-bold text-[#1e293b]">{totalOkrProgress}%</div>
          </Card>
          <Card className="bg-[#ffffff] p-4 rounded-xl border border-[#e2e8f0]">
            <div className="text-xs text-[#64748b] uppercase tracking-wide mb-2">Số dự án</div>
            <div className="text-2xl font-bold text-[#1e293b]">{okrs.length}</div>
          </Card>
          <Card className="bg-[#ffffff] p-4 rounded-xl border border-[#e2e8f0]">
            <div className="text-xs text-[#64748b] uppercase tracking-wide mb-2">Tổng công việc</div>
            <div className="text-2xl font-bold text-[#1e293b]">{okrs.reduce((a, o) => a + o.children.reduce((b, bt) => b + bt.children.length, 0), 0)}</div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 h-[280px]">
          <Card className="bg-[#ffffff] rounded-xl border border-[#e2e8f0] p-4 flex flex-col">
            <div className="text-sm font-semibold mb-3 text-[#1e293b]">Tiến độ Tổng thể</div>
            <div className="flex-1 flex justify-center items-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={overallProgressData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                    {overallProgressData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-bold text-[#1e293b]">{totalOkrProgress}%</span>
                <span className="text-[0.7rem] text-[#64748b]">Hoàn thành</span>
              </div>
            </div>
          </Card>
          <Card className="bg-[#ffffff] rounded-xl border border-[#e2e8f0] p-4 flex flex-col">
            <div className="text-sm font-semibold mb-3 text-[#1e293b]">Tiến độ dự án</div>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={okrTLData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} angle={-15} textAnchor="end" interval={0} height={60} />
                  <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <RechartsTooltip cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="progress" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* OKR Detail - Read Only */}
        <Card className="bg-[#ffffff] rounded-xl border border-[#e2e8f0] flex flex-col overflow-hidden">
          <div className="bg-[#f1f5f9] px-4 py-2.5 grid grid-cols-[2fr_100px_120px_150px_100px] text-xs font-semibold text-[#64748b] uppercase">
            <div>Cấu trúc Phân cấp OKR & Công việc</div>
            <div>Tiến độ</div>
            <div>Thời hạn</div>
            <div>Người thực hiện</div>
            <div>Trạng thái</div>
          </div>
          <CardContent className="p-0 overflow-y-auto">
            <Accordion type="multiple" defaultValue={okrs.map(o => o.id)} className="w-full">
              {okrs.map((okr) => (
                <AccordionItem value={okr.id} key={okr.id} className="border-b border-[#e2e8f0]">
                  <AccordionTrigger className="px-4 py-3 hover:bg-[#f8fafc] border-b border-[#e2e8f0]">
                    <div className="grid grid-cols-[2fr_100px_120px_150px_100px] w-full items-center text-left text-[0.85rem]">
                      <div className="flex items-center gap-2 pl-4 font-semibold text-[#2563eb]">OKR: {okr.title}</div>
                      <div className="font-medium text-[#1e293b]">{okr.progress}%</div>
                      <div className="text-[#64748b]">-</div>
                      <div className="text-[#64748b]">-</div>
                      <div><span className="px-2 py-0.5 rounded-full text-[0.7rem] font-medium bg-[#dbeafe] text-[#2563eb]">{okr.progress}%</span></div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-0 pb-0">
                    {okr.children.map((bigTask) => {
                      const dlStatus = getDeadlineStatus(bigTask.deadline, bigTask.progress);
                      return (
                        <div key={bigTask.id} className="border-b border-[#e2e8f0] last:border-b-0">
                          <div className="px-4 py-3 bg-[#f8fafc] grid grid-cols-[2fr_100px_120px_150px_100px] items-center text-[0.85rem] border-l-[3px] border-[#cbd5e1]">
                            <div className="flex items-center gap-2 pl-7 text-[#334155] font-semibold">
                              <div className="px-1.5 py-0.5 rounded bg-[#e2e8f0] text-[#475569] text-[0.65rem] font-bold uppercase tracking-wider">Đầu việc</div>
                              <span>{bigTask.title}</span>
                            </div>
                            <div className="font-semibold text-[#1e293b]">{bigTask.progress}%</div>
                            <div className="text-[#475569] font-medium">{bigTask.deadline}</div>
                            <div className="text-[#94a3b8]">-</div>
                            <div><Badge variant={dlStatus.variant} className="px-2 py-0.5 rounded-full text-[0.7rem] font-medium">{dlStatus.label}</Badge></div>
                          </div>
                          {bigTask.children.map((subTask) => (
                            <div key={subTask.id} className="px-4 py-2 hover:bg-[#ffffff] grid grid-cols-[2fr_100px_120px_150px_100px] items-center text-[0.8rem] border-b border-[#e2e8f0] last:border-b-0">
                              <div className="pl-14 flex flex-col gap-0.5">
                                <div className="text-[#1e293b] font-medium flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#cbd5e1]"></span>
                                  {subTask.title}
                                </div>
                                {subTask.note && <span className="text-[#64748b] text-[0.7rem] ml-3.5 line-clamp-1">{subTask.note}</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <Progress value={subTask.progress} indicatorColor={getProgressColor(subTask.progress)} className="h-1.5 w-12 bg-[#e2e8f0]" />
                                <span className="font-medium text-[#1e293b]">{subTask.progress}%</span>
                              </div>
                              <div className="text-[#64748b]">{subTask.deadline}</div>
                              <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                  {subTask.assignee.split(',').map((name, idx) => (
                                    <div key={idx} className="w-6 h-6 rounded-full bg-[#cbd5e1] border-2 border-[#ffffff] flex items-center justify-center text-[0.6rem] text-[#ffffff] font-bold" title={name.trim()}>
                                      {name.trim().substring(0, 2).toUpperCase()}
                                    </div>
                                  ))}
                                </div>
                                <span className="text-[#1e293b] text-[0.7rem] truncate max-w-[80px]">{subTask.assignee}</span>
                              </div>
                              <div>
                                <Badge variant={getDeadlineStatus(subTask.deadline, subTask.progress).variant} className="px-2 py-0.5 rounded-full text-[0.7rem] font-medium">
                                  {getDeadlineStatus(subTask.deadline, subTask.progress).label}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
