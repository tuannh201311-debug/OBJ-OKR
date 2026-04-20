import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { useAppContext } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';

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
    <div className="flex flex-col gap-5">
      <div className="flex justify-between items-center mb-1">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Tổng quan tiến độ dự án</h1>
          <p className="text-[#64748b] text-sm mt-1">Cập nhật lần cuối: {new Date().toLocaleString('vi-VN')}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#ffffff] p-4 rounded-xl border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="text-xs text-[#64748b] uppercase tracking-wide mb-2">Tổng hoàn thành</div>
          <div className="text-2xl font-bold text-[#1e293b]">{totalOkrProgress}%</div>
          <div className="text-xs mt-1 text-[#10b981]">↑ Tổng tiến độ dự án</div>
        </Card>
        <Card className="bg-[#ffffff] p-4 rounded-xl border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="text-xs text-[#64748b] uppercase tracking-wide mb-2">Chậm Deadline</div>
          <div className="text-2xl font-bold text-[#ef4444]">{delayedTasks.length}</div>
          <div className="text-xs mt-1 text-[#ef4444]">&nbsp;</div>
        </Card>
        <Card className="bg-[#ffffff] p-4 rounded-xl border border-[#e2e8f0] shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="text-xs text-[#64748b] uppercase tracking-wide mb-2">Đang thực hiện</div>
          <div className="text-2xl font-bold text-[#1e293b]">{activeTaskCount}</div>
          <div className="text-xs mt-1 text-[#1e293b]">Tổng dự án: {okrs.length}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 h-[280px]">
        {/* Donut Chart */}
        <Card className="bg-[#ffffff] rounded-xl border border-[#e2e8f0] p-4 flex flex-col shadow-none">
          <div className="text-sm font-semibold mb-3 text-[#1e293b]">Tiến độ Tổng thể</div>
          <div className="flex-1 flex justify-center items-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={overallProgressData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value" stroke="none">
                  {overallProgressData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-[#1e293b]">{totalOkrProgress}%</span>
              <span className="text-[0.7rem] text-[#64748b]">Hoàn thành</span>
            </div>
          </div>
        </Card>

        {/* Bar Chart - FIXED: title changed, full names shown */}
        <Card className="bg-[#ffffff] rounded-xl border border-[#e2e8f0] p-4 flex flex-col shadow-none">
          <div className="text-sm font-semibold mb-3 flex justify-between text-[#1e293b]">
            Tiến độ dự án
            <span className="text-xs font-normal text-[#2563eb] cursor-pointer" onClick={() => navigate('/okr-tree')}>Chi tiết</span>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={okrTLData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  angle={-15}
                  textAnchor="end"
                  interval={0}
                  height={60}
                />
                <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12 }} />
                <RechartsTooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="progress" radius={[4, 4, 0, 0]} barSize={32}>
                  {okrTLData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isOverdue ? '#ef4444' : '#2563eb'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-4">
        {/* Upcoming Tasks */}
        <Card className="bg-[#ffffff] rounded-xl border border-[#e2e8f0] p-4 flex flex-col shadow-none">
          <div className="text-sm font-semibold mb-1 text-[#1e293b]">Những công việc sắp tới deadline</div>
          <div className="text-xs text-[#64748b] mb-3">Hạn chót trong 7 ngày tới</div>
          <div className="space-y-3 overflow-y-auto max-h-[200px] pr-2">
            {upcomingTasks.length > 0 ? upcomingTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-2.5 bg-[#fef3c7]/30 border border-[#fef3c7] rounded-lg cursor-pointer hover:bg-[#fef3c7]/50 transition-colors" onClick={() => handleTaskClick(task.id)}>
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="text-sm font-medium text-[#1e293b] truncate">{task.title}</h4>
                  <div className="flex items-center mt-1 space-x-2 text-xs text-[#64748b]">
                    <span className="truncate max-w-[120px]">{task.assignee}</span>
                    <span>•</span>
                    <span className="text-[#d97706] font-medium">
                      {task.daysLeft === 0 ? 'Hôm nay' : `Còn ${task.daysLeft} ngày`}
                    </span>
                  </div>
                </div>
                <div className="w-24 flex-shrink-0">
                  <div className="flex justify-between text-[10px] mb-1 text-[#1e293b]">
                    <span>Tiến độ</span>
                    <span className="font-medium">{task.progress}%</span>
                  </div>
                  <Progress value={task.progress} indicatorColor="bg-[#d97706]" className="h-1.5 bg-[#e2e8f0]" />
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-[#64748b] text-sm">Không có công việc nào sắp tới hạn.</div>
            )}
          </div>
        </Card>

        {/* Delayed Tasks - FIXED: clickable to navigate to OKR tree */}
        <Card className="bg-[#ffffff] rounded-xl border border-[#e2e8f0] p-4 flex flex-col shadow-none">
          <div className="text-sm font-semibold mb-1 text-[#1e293b]">Công việc chậm deadline</div>
          <div className="text-xs text-[#64748b] mb-3">Cần ưu tiên xử lý ngay - Nhấn để xem chi tiết</div>
          <div className="space-y-3 overflow-y-auto max-h-[200px] pr-2">
            {delayedTasks.length > 0 ? delayedTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-2.5 bg-[#fee2e2]/30 border border-[#fee2e2] rounded-lg cursor-pointer hover:bg-[#fee2e2]/50 transition-colors"
                onClick={() => handleTaskClick(task.id)}
              >
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="text-sm font-medium text-[#1e293b] truncate">{task.title}</h4>
                  <div className="flex items-center mt-1 space-x-2 text-xs text-[#64748b]">
                    <span className="truncate max-w-[120px]">{task.assignee}</span>
                    <span>•</span>
                    <span className="text-[#ef4444] font-medium">Chậm {task.delayDays} ngày</span>
                  </div>
                </div>
                <div className="w-24 flex-shrink-0">
                  <div className="flex justify-between text-[10px] mb-1 text-[#1e293b]">
                    <span>Tiến độ</span>
                    <span className="font-medium">{task.progress}%</span>
                  </div>
                  <Progress value={task.progress} indicatorColor="bg-[#ef4444]" className="h-1.5 bg-[#e2e8f0]" />
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-[#64748b] text-sm">Không có công việc nào bị chậm tiến độ.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
