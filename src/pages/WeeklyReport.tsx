import { useState, useEffect } from 'react';
import { useAppContext, SubTask } from '@/context/AppContext';
import { fetchWithAuth } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle2, Circle, Clock, AlertCircle, FileText, Download, Calendar, Plus, Trash2, Search, Layers, Users, Sparkles, Send, Check, X } from 'lucide-react';
import { toast } from 'sonner';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface TaskInfo {
  id: string;
  title: string;
  okr_title: string;
}

interface Report {
  id: string;
  week_number: number;
  year: number;
  done_tasks: TaskInfo[];
  doing_tasks: TaskInfo[];
  ad_hoc_tasks: string[];
  challenges: string;
  next_week_plan: string;
  user_id: string;
  user_name: string;
  submitted_at: string;
}

export function WeeklyReport() {
  const { user, okrs } = useAppContext();
  const isAdmin = user?.role === 'admin';

  const now = new Date();
  const getISOWeek = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  const currentWeek = getISOWeek(now);
  const currentYear = now.getFullYear();

  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [myReport, setMyReport] = useState<Partial<Report> | null>(null);
  const [teamReports, setTeamReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [challenges, setChallenges] = useState('');
  const [nextWeekPlan, setNextWeekPlan] = useState('');
  const [doneTasks, setDoneTasks] = useState<TaskInfo[]>([]);
  const [doingTasks, setDoingTasks] = useState<TaskInfo[]>([]);
  const [adHocTasks, setAdHocTasks] = useState<string[]>([]);
  const [newAdHoc, setNewAdHoc] = useState('');

  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [viewingReport, setViewingReport] = useState<Report | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const resReport = await fetchWithAuth(`/reports/my-report?week=${selectedWeek}&year=${selectedYear}`);
      if (resReport.ok) {
        const data = await resReport.json();
        if (data) {
          setMyReport(data);
          setChallenges(data.challenges || '');
          setNextWeekPlan(data.next_week_plan || '');
          setDoneTasks(data.done_tasks || []);
          setDoingTasks(data.doing_tasks || []);
          setAdHocTasks(data.ad_hoc_tasks || []);
        } else {
          setMyReport(null);
          setChallenges('');
          setNextWeekPlan('');
          setDoneTasks([]);
          setDoingTasks([]);
          setAdHocTasks([]);
        }
      }

      if (isAdmin) {
        const resTeam = await fetchWithAuth(`/reports/team?week=${selectedWeek}&year=${selectedYear}`);
        if (resTeam.ok) {
          setTeamReports(await resTeam.json());
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setMyReport(null);
      setTeamReports([]);
    }
  }, [selectedWeek, selectedYear, user]);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const res = await fetchWithAuth('/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_number: selectedWeek,
          year: selectedYear,
          done_tasks: doneTasks,
          doing_tasks: doingTasks,
          ad_hoc_tasks: adHocTasks,
          challenges,
          next_week_plan: nextWeekPlan
        })
      });
      if (res.ok) {
        toast.success('Gửi báo cáo thành công');
        loadData();
      } else {
        toast.error('Gửi báo cáo thất bại');
      }
    } catch (e) {
      toast.error('Lỗi kết nối');
    } finally {
      setSaving(false);
    }
  };

  const addAdHoc = () => {
    if (!newAdHoc.trim()) return;
    setAdHocTasks(prev => [...prev, newAdHoc.trim()]);
    setNewAdHoc('');
  };

  const toggleTaskSelection = (st: SubTask, okrTitle: string) => {
    const isAlreadySelected = doneTasks.find(d => d.id === st.id);
    if (isAlreadySelected) {
      setDoneTasks(p => p.filter(d => d.id !== st.id));
    } else {
      setDoneTasks(p => [...p, { id: st.id, title: st.title, okr_title: okrTitle }]);
    }
  };

  const exportMarkdown = (report: Partial<Report>) => {
    const md = `
# BÁO CÁO CÔNG VIỆC TUẦN ${report.week_number} - ${report.year}
**Người thực hiện:** ${report.user_name || user?.name}
**Ngày nộp:** ${report.submitted_at ? new Date(report.submitted_at).toLocaleDateString('vi-VN') : 'Chưa nộp'}

## 1. Công việc thực hiện trong tuần
${report.done_tasks?.length ? report.done_tasks.map(t => `- [x] ${t.title} (${t.okr_title})`).join('\n') : '- Không có'}

## 2. Công việc phát sinh ngoài OKR
${report.ad_hoc_tasks?.length ? report.ad_hoc_tasks.map(t => `- [x] ${t}`).join('\n') : '- Không có'}

## 3. Công việc đang triển khai
${report.doing_tasks?.length ? report.doing_tasks.map(t => `- [/] ${t.title} (${t.okr_title})`).join('\n') : '- Không có'}

## 4. Khó khăn & Thách thức
${report.challenges || '- Không có'}

## 5. Kế hoạch tuần tới
${report.next_week_plan || '- Chưa lập kế hoạch'}
    `.trim();

    navigator.clipboard.writeText(md);
    toast.success('Đã sao chép nội dung Markdown');
  };

  const exportToPDF = () => {
    const element = document.getElementById('report-content-area');
    if (!element) {
      toast.error('Không tìm thấy nội dung để xuất PDF');
      return;
    }
    
    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     `Bao_Cao_Tuan_${selectedWeek}_${selectedYear}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    toast.info("Đang tạo file PDF...");
    html2pdf().set(opt).from(element).save().then(() => {
        toast.success("Đã tải xuống file PDF thành công!");
    }).catch((err: any) => {
        console.error(err);
        toast.error("Lỗi khi tạo PDF: " + err.message);
    });
  };

  if (!user) {
    return (
      <div className="h-[calc(100vh-80px)] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-xl">
          <div className="bg-gradient-to-br from-[#6366f1] to-[#4f46e5] p-10 text-center text-white">
            <div className="h-20 w-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner mx-auto mb-6">
              <Clock className="h-10 w-10 text-white animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Yêu cầu đăng nhập</h2>
            <p className="text-indigo-100 opacity-90 text-sm leading-relaxed">
              Bạn cần đăng nhập vào tài khoản của mình để có thể gửi báo cáo tuần và xem lịch sử báo cáo.
            </p>
          </div>
          <CardContent className="p-8">
            <Button 
              className="w-full bg-[#6366f1] hover:bg-[#4f46e5] h-14 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-100 transition-all active:scale-95"
              onClick={() => window.location.href = '/login'}
            >
              Đi tới trang Đăng nhập
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] print:h-auto overflow-hidden print:overflow-visible flex flex-col font-inter p-4 md:px-8 md:py-4 gap-4">
      
      {/* Floating Header - Compact Style */}
      <header className="glass-card p-4 rounded-[1.5rem] flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-[#2563eb] flex items-center justify-center shadow-md">
            <Sparkles className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#1e3a8a] tracking-tight">Báo cáo tổng kết tuần</h1>
            <p className="text-[#2563eb] text-xs font-bold uppercase tracking-widest">Tuần {selectedWeek}, Năm {selectedYear}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white/60 border border-white/80 rounded-xl px-4 h-10 shadow-sm">
            <Calendar className="h-4 w-4 text-[#2563eb] mr-2" />
            <select className="bg-transparent outline-none cursor-pointer text-sm font-bold text-[#1e3a8a]" value={selectedWeek} onChange={(e) => setSelectedWeek(Number(e.target.value))}>
              {[...Array(52)].map((_, i) => <option key={i + 1} value={i + 1}>Tuần {i + 1}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            {myReport && (
              <Button size="sm" onClick={() => exportMarkdown(myReport)} className="bg-white text-[#2563eb] hover:bg-[#F0F7FF] border border-[#DBEAFE] rounded-xl h-10 font-bold shadow-sm px-4 print:hidden">
                <Download className="h-4 w-4 mr-2" />
                Markdown
              </Button>
            )}
            <Button size="sm" onClick={exportToPDF} className="bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white border-none rounded-xl h-10 font-bold shadow-sm px-4 print:hidden">
              <FileText className="h-4 w-4 mr-2" />
              Xuất PDF
            </Button>
          </div>
        </div>
      </header>

      <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-4' : ''} print:block gap-4 flex-1 overflow-hidden print:overflow-visible`}>
        {/* Main Content Area - Scrollable */}
        <main className={`${isAdmin ? 'lg:col-span-3' : 'w-full'} flex flex-col gap-4 overflow-hidden print:overflow-visible`} id="report-content-area">
          <Card className="glass-card border-none rounded-[2rem] shadow-none flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
            <CardHeader className="p-6 pb-2 border-b border-white/20 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-[#1e3a8a] flex items-center gap-2">
                    <FileText className="h-5 w-5" /> Chi tiết báo cáo
                  </CardTitle>
                  <CardDescription className="text-[#2563eb] text-xs mt-1">Ghi nhận tiến độ và kết quả công việc trong tuần qua.</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 overflow-y-auto print:overflow-visible scrollbar-hide space-y-8 flex-1">

              {/* OKR Tasks Section */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1e3a8a] flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Công việc thực hiện trong tuần
                  </h3>
                  
                  <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="text-[#2563eb] border-blue-100 hover:bg-blue-50 rounded-xl px-4 h-9 font-bold text-xs shadow-sm bg-white/40">
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Chọn từ danh mục OKR
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl bg-white rounded-[2.5rem] border-none p-0 overflow-hidden shadow-2xl">
                      {/* Light Header */}
                      <div className="bg-slate-50 p-7 border-b border-slate-100 flex justify-between items-center relative">
                        <div>
                          <DialogTitle className="text-xl font-bold text-[#1e3a8a]">Danh mục OKR (OBJ - PLAN)</DialogTitle>
                          <p className="text-[#64748b] text-xs mt-1 font-medium italic">Vui lòng tích chọn các công việc bạn đã thực hiện trong tuần.</p>
                        </div>
                        <div className="relative w-[320px]">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input placeholder="Tìm nhanh theo tên công việc..." className="pl-12 h-11 bg-white border-slate-200 text-[#1e3a8a] rounded-xl focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-300" value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} />
                        </div>
                        <button onClick={() => setPickerOpen(false)} className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-slate-200 flex items-center justify-center transition-colors">
                          <X className="h-4 w-4 text-slate-500" />
                        </button>
                      </div>

                      <div className="max-h-[60vh] overflow-y-auto p-8 space-y-10 scrollbar-hide bg-[#F8FAFC]">
                        {okrs.map(okr => (
                          <div key={okr.id} className="space-y-5">
                            <div className="flex items-center gap-3">
                               <div className="h-7 w-2 bg-[#2563eb] rounded-full shadow-sm shadow-blue-200"></div>
                               <h4 className="text-[15px] font-black text-[#1e3a8a] uppercase tracking-widest">OBJ: {okr.title}</h4>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-6 pl-5 border-l-2 border-slate-200/50 ml-1">
                              {okr.children.map(bt => (
                                <div key={bt.id} className="space-y-4">
                                   <div className="flex items-center gap-2.5">
                                      <Badge className="bg-blue-600/10 text-blue-600 text-[10px] font-black border-none rounded-lg px-2.5 py-1">PLAN</Badge>
                                      <span className="text-[14px] font-bold text-[#1e3a8a] opacity-90">{bt.title}</span>
                                   </div>
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                                      {bt.children.filter(st => st.title.toLowerCase().includes(pickerSearch.toLowerCase())).map(st => {
                                        const isSelected = doneTasks.find(d => d.id === st.id);
                                        return (
                                          <button 
                                            key={st.id} 
                                            onClick={() => toggleTaskSelection(st, okr.title)}
                                            className={`flex items-start gap-4 p-5 rounded-[1.5rem] border transition-all text-left relative group ${isSelected ? 'bg-white border-[#2563eb] shadow-xl shadow-blue-100/50 ring-2 ring-blue-50' : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md'}`}
                                          >
                                            <div className={`mt-0.5 h-6 w-6 rounded-xl border-2 flex items-center justify-center transition-all duration-300 ${isSelected ? 'bg-[#2563eb] border-[#2563eb] scale-110' : 'border-slate-200 bg-slate-50 group-hover:border-blue-200'}`}>
                                              {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[3px]" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className={`text-[14px] font-bold leading-snug transition-colors ${isSelected ? 'text-[#1e3a8a]' : 'text-[#64748b] group-hover:text-[#1e3a8a]'}`}>{st.title}</p>
                                              <div className="flex items-center gap-3 mt-3">
                                                 <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                                    <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-700" style={{ width: `${st.progress}%` }}></div>
                                                 </div>
                                                 <span className="text-[10px] font-black text-blue-500 uppercase tracking-tighter">{st.progress}% TIẾN ĐỘ</span>
                                              </div>
                                            </div>
                                          </button>
                                        );
                                      })}
                                   </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Light Footer */}
                      <div className="p-6 bg-white border-t border-slate-100 flex justify-between items-center px-10">
                        <div className="flex items-center gap-3">
                           <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                              <CheckCircle2 className="h-5 w-5 text-blue-600" />
                           </div>
                           <div>
                              <div className="text-[15px] font-bold text-[#1e3a8a]">Đã chọn {doneTasks.length} công việc</div>
                              <p className="text-[#64748b] text-[11px] font-medium italic">Sẵn sàng để nộp báo cáo tuần.</p>
                           </div>
                        </div>
                        <Button onClick={() => setPickerOpen(false)} className="bg-[#2563eb] hover:bg-[#1d4ed8] px-10 rounded-2xl font-bold h-12 text-base shadow-lg shadow-blue-100 transition-all hover:scale-105">
                          Xác nhận & Đóng
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {doneTasks.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white/40 border border-white/60 rounded-2xl group hover:border-[#2563eb] transition-all shadow-sm">
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-[14px] font-bold text-[#1e3a8a] truncate">{t.title}</span>
                        <span className="text-[10px] text-[#2563eb] font-black uppercase tracking-wider mt-1 opacity-60">{t.okr_title}</span>
                      </div>
                      <button onClick={() => setDoneTasks(p => p.filter((_, i) => i !== idx))} className="h-9 w-9 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-xl transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {doneTasks.length === 0 && (
                    <div className="col-span-full text-center py-10 border-2 border-dashed border-white/40 rounded-3xl text-[#64748b] text-sm italic bg-white/10">
                      Chưa thêm công việc OKR nào trong tuần này.
                    </div>
                  )}
                </div>
              </section>

              {/* Ad-hoc Tasks */}
              <section className="space-y-4 pt-6 border-t border-white/10">
                <h3 className="text-sm font-bold text-[#1e3a8a] flex items-center gap-2">
                  <Plus className="h-4 w-4 text-[#2563eb]" />
                  Công việc phát sinh ngoài OKR
                </h3>
                <div className="flex gap-2">
                  <Input placeholder="Nhập công việc phát sinh khác..." value={newAdHoc} onChange={(e) => setNewAdHoc(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addAdHoc()} className="h-11 rounded-xl bg-white/40 border-white/60 placeholder:text-[#64748b] text-[14px]" />
                  <Button onClick={addAdHoc} className="bg-[#2563eb] hover:bg-[#1d4ed8] h-11 w-11 p-0 rounded-xl shadow-md">
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {adHocTasks.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white/40 border border-white/60 rounded-2xl hover:border-blue-200 transition-all shadow-sm">
                      <span className="text-[14px] font-bold text-[#1e3a8a]">{t}</span>
                      <button onClick={() => setAdHocTasks(p => p.filter((_, i) => i !== idx))} className="h-9 w-9 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-xl">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Reflections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/10">
                <div className="space-y-3">
                  <label className="text-xs font-black text-[#1e3a8a] flex items-center gap-2 uppercase tracking-widest opacity-80">
                    <AlertCircle className="h-3.5 w-3.5 text-rose-500" /> Khó khăn & Thách thức
                  </label>
                  <Textarea value={challenges} onChange={(e) => setChallenges(e.target.value)} placeholder="Vấn đề kỹ thuật, nguồn lực, rào cản..." className="min-h-[120px] rounded-2xl bg-white/40 border-white/60 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-[#64748b] text-[14px] leading-relaxed" />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-[#1e3a8a] flex items-center gap-2 uppercase tracking-widest opacity-80">
                    <Circle className="h-3.5 w-3.5 text-blue-500" fill="currentColor" fillOpacity={0.2} /> Chiến lược tuần tới
                  </label>
                  <Textarea value={nextWeekPlan} onChange={(e) => setNextWeekPlan(e.target.value)} placeholder="Các mục tiêu trọng tâm bạn sẽ tập trung là gì?" className="min-h-[120px] rounded-2xl bg-white/40 border-white/60 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-[#64748b] text-[14px] leading-relaxed" />
                </div>
              </div>

            </CardContent>
            
            <div className="p-6 pt-4 flex justify-center bg-white/5 border-t border-white/10">
                <Button onClick={handleSubmit} disabled={saving} className="bg-[#2563eb] hover:bg-[#1d4ed8] px-16 rounded-2xl h-14 text-lg font-bold shadow-xl shadow-blue-100 transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  {saving ? 'Đang gửi...' : 'Gửi báo cáo tuần'}
                </Button>
            </div>
          </Card>
        </main>

        {/* Admin Sidebar - Teams */}
        {isAdmin && (
          <aside className="flex flex-col gap-4 overflow-hidden print:hidden">
            <Card className="glass-card border-none rounded-[2.5rem] p-6 shadow-sm flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-700">
              <CardHeader className="p-0 pb-4 flex-shrink-0">
                <CardTitle className="text-sm font-black text-[#1e3a8a] flex items-center gap-2 uppercase tracking-widest">
                  <Users className="h-4 w-4" /> Trạng thái đội ngũ
                </CardTitle>
                <div className="flex items-center justify-between mt-2">
                  <Badge variant="secondary" className="bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg px-2 border-none">TỔNG SỐ: {teamReports.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 space-y-2.5 overflow-y-auto scrollbar-hide flex-1 pr-1 mt-4">
                {teamReports.map(rep => (
                  <div 
                    key={rep.id} 
                    className="flex items-center justify-between p-3.5 bg-white/40 border border-white/60 rounded-2xl hover:bg-white transition-all shadow-sm group cursor-pointer"
                    onClick={() => setViewingReport(rep)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-[#2563eb] flex items-center justify-center text-white text-[11px] font-black border-2 border-white shadow-md flex-shrink-0 group-hover:scale-110 transition-transform">
                        {rep.user_name?.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-bold text-[#1e3a8a] truncate">{rep.user_name}</span>
                        <span className="text-[9px] text-[#64748b] font-medium">{new Date(rep.submitted_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500 text-white text-[9px] h-5 rounded-full px-2 border-none shadow-sm font-black">CHI TIẾT</Badge>
                  </div>
                ))}
                {teamReports.length === 0 && (
                  <div className="text-center py-10 opacity-30 flex flex-col items-center gap-2">
                    <Users className="h-8 w-8 text-[#64748b]" />
                    <p className="text-[10px] font-black uppercase tracking-widest italic">Chưa có báo cáo nào</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        )}
      </div>

      <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
        <DialogContent className="max-w-3xl bg-[#f8fafc] rounded-[2.5rem] border-none p-0 overflow-hidden shadow-2xl">
          {viewingReport && (
            <div className="flex flex-col max-h-[85vh]">
              <div className="bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] p-8 text-white">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-5">
                    <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl font-black shadow-inner">
                      {viewingReport.user_name?.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{viewingReport.user_name}</h2>
                      <p className="opacity-80 text-sm font-medium">Báo cáo Tuần {viewingReport.week_number} • {viewingReport.year}</p>
                    </div>
                  </div>
                  <Button variant="ghost" onClick={() => exportMarkdown(viewingReport)} className="text-white hover:bg-white/10 rounded-xl h-10 font-bold border border-white/20">
                    <Download className="h-4 w-4 mr-2" /> Markdown
                  </Button>
                </div>
              </div>

              <div className="p-8 overflow-y-auto space-y-8 flex-1">
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-[#1e3a8a] flex items-center gap-2 uppercase tracking-[0.15em] opacity-70">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Công việc thực hiện trong tuần
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {viewingReport.done_tasks.map((t, idx) => (
                      <div key={idx} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                        <p className="text-[14px] font-bold text-[#1e293b]">{t.title}</p>
                        <p className="text-[10px] text-[#2563eb] font-black uppercase tracking-wider mt-1.5">{t.okr_title}</p>
                      </div>
                    ))}
                    {!viewingReport.done_tasks.length && <p className="text-sm italic text-slate-400">Không có</p>}
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-xs font-black text-[#1e3a8a] flex items-center gap-2 uppercase tracking-[0.15em] opacity-70">
                    <Plus className="h-4 w-4 text-blue-500" /> Công việc ngoài OKR
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {viewingReport.ad_hoc_tasks.map((t, idx) => (
                      <div key={idx} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                        <p className="text-[14px] font-bold text-[#1e293b]">{t}</p>
                      </div>
                    ))}
                    {!viewingReport.ad_hoc_tasks.length && <p className="text-sm italic text-slate-400">Không có</p>}
                  </div>
                </section>

                <div className="grid grid-cols-2 gap-8">
                  <section className="space-y-3">
                    <h3 className="text-xs font-black text-rose-600 flex items-center gap-2 uppercase tracking-[0.15em] opacity-70">
                      <AlertCircle className="h-4 w-4" /> Khó khăn
                    </h3>
                    <div className="p-5 bg-rose-50/30 border border-rose-100 rounded-2xl text-sm text-slate-700 leading-relaxed italic">
                      {viewingReport.challenges || "Không có khó khăn nào được ghi nhận."}
                    </div>
                  </section>
                  <section className="space-y-3">
                    <h3 className="text-xs font-black text-blue-600 flex items-center gap-2 uppercase tracking-[0.15em] opacity-70">
                      <Circle className="h-4 w-4" /> Kế hoạch tuần tới
                    </h3>
                    <div className="p-5 bg-blue-50/30 border border-blue-100 rounded-2xl text-sm text-slate-700 leading-relaxed italic">
                      {viewingReport.next_week_plan || "Chưa có kế hoạch tuần tới."}
                    </div>
                  </section>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <Button onClick={() => setViewingReport(null)} className="bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white px-10 h-12 rounded-xl font-bold">
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
