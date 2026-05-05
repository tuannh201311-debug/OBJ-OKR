import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History, Search, Filter, Calendar, User, Tag, ArrowRight } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { fetchWithAuth } from '@/lib/api';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface ActivityLog {
  id: string;
  user_name: string;
  item_type: string;
  item_title: string;
  action: string;
  changes: Record<string, { old: any; new: any }>;
  timestamp: string;
}

export function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAppContext();

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const res = await fetchWithAuth('/activity-logs');
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (error) {
        console.error('Failed to load logs:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'admin') {
      loadLogs();
    }
  }, [user]);

  const filteredLogs = logs.filter(log => 
    log.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.item_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.item_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getItemTypeBadge = (type: string) => {
    switch (type) {
      case 'okr': return <Badge className="bg-blue-100 text-blue-700 border-blue-200">OKR</Badge>;
      case 'big_task': return <Badge className="bg-purple-100 text-purple-700 border-purple-200">PLAN</Badge>;
      case 'sub_task': return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">TASK</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  const renderChanges = (changes: Record<string, { old: any; new: any }>) => {
    return Object.entries(changes).map(([field, delta]) => (
      <div key={field} className="flex flex-col gap-1 mb-2 last:mb-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{field}:</span>
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 line-through truncate max-w-[150px]">
            {delta.old === null || delta.old === "" ? "Trống" : String(delta.old)}
          </span>
          <ArrowRight className="h-3 w-3 text-slate-300" />
          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold truncate max-w-[150px]">
            {delta.new === null || delta.new === "" ? "Trống" : String(delta.new)}
          </span>
        </div>
      </div>
    ));
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-rose-500 font-bold">Bạn không có quyền truy cập trang này.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-6 font-inter">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] flex items-center justify-center shadow-lg shadow-blue-100">
            <History className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#1e3a8a] tracking-tight">Nhật ký hoạt động</h1>
            <p className="text-[#64748b] text-sm font-medium">Theo dõi các thay đổi tiến độ và kế hoạch của hệ thống</p>
          </div>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94a3b8]" />
          <input
            type="text"
            placeholder="Tìm theo tên, nội dung hoặc loại..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/60 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all outline-none text-sm font-medium shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card className="flex-1 glass-card border-none rounded-[2rem] overflow-hidden flex flex-col shadow-xl shadow-blue-900/5">
        <CardContent className="p-0 flex-1 overflow-auto scrollbar-hide">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="h-10 w-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-blue-600 font-bold animate-pulse">Đang tải dữ liệu...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-400">
              <History className="h-12 w-12 opacity-20" />
              <p className="font-bold">Chưa có hoạt động nào được ghi lại</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-md">
                <TableRow className="border-slate-100">
                  <TableHead className="w-[180px] font-black text-[10px] uppercase tracking-widest text-slate-500 pl-8">Thời gian</TableHead>
                  <TableHead className="w-[180px] font-black text-[10px] uppercase tracking-widest text-slate-500">Thành viên</TableHead>
                  <TableHead className="w-[120px] font-black text-[10px] uppercase tracking-widest text-slate-500">Loại</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-500">Đối tượng & Thay đổi</TableHead>
                  <TableHead className="w-[100px] text-right pr-8 font-black text-[10px] uppercase tracking-widest text-slate-500">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id} className="border-slate-50 hover:bg-white/40 transition-colors group">
                    <TableCell className="pl-8 py-4">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-[#1e3a8a]">{format(new Date(log.timestamp), 'dd/MM/yyyy', { locale: vi })}</span>
                        <span className="text-[11px] font-medium text-slate-400">{format(new Date(log.timestamp), 'HH:mm:ss')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-black text-[11px] border border-blue-100 shadow-sm">
                          {log.user_name.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[14px] font-bold text-slate-700">{log.user_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getItemTypeBadge(log.item_type)}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col gap-2">
                        <span className="text-[14px] font-bold text-[#1e3a8a] line-clamp-1">{log.item_title}</span>
                        <div className="bg-white/40 rounded-xl p-3 border border-white/60">
                          {log.action === 'create' ? (
                            <span className="text-[12px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded">Khởi tạo mới mục tiêu</span>
                          ) : (
                            renderChanges(log.changes)
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <Badge className={log.action === 'create' ? 'bg-emerald-500' : log.action === 'update' ? 'bg-blue-500' : 'bg-rose-500'}>
                        {log.action.toUpperCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
