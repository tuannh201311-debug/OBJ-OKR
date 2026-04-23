import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Network, Settings, Shield, LogOut, FileText, Sparkles, KanbanSquare } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { Badge } from '@/components/ui/badge';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, logout } = useAppContext();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, adminOnly: false },
    { name: 'Quản lý OKR', href: '/okr-tree', icon: Network, adminOnly: false },
    { name: 'Kanban Board', href: '/kanban', icon: KanbanSquare, adminOnly: false },
    { name: 'Báo cáo tuần', href: '/weekly-report', icon: FileText, adminOnly: false },
    { name: 'Cài đặt hệ thống', href: '/settings', icon: Settings, adminOnly: true },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const visibleNav = navigation.filter(item => !item.adminOnly || user?.role === 'admin');

  return (
    <div className="min-h-screen liquid-gradient flex font-inter text-[#1e293b] overflow-hidden">
      {/* Premium Glass Sidebar */}
      <aside className="w-[280px] glass-card m-4 rounded-[2rem] p-6 flex flex-col shrink-0 z-50 print:hidden">
        <div className="mb-10 px-2 flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#2563eb] to-[#60a5fa] flex items-center justify-center shadow-lg shadow-blue-200">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <div>
            <span className="block text-xl font-fira-code font-bold text-[#1e3a8a] leading-none">9Pay OKR</span>
            <span className="text-[11px] font-black text-[#2563eb] uppercase tracking-widest mt-1 block">Hệ thống quản lý</span>
          </div>
        </div>

        <nav className="flex flex-col gap-3">
          {visibleNav.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group px-5 py-4 rounded-2xl text-[16px] font-semibold flex items-center gap-3 cursor-pointer transition-all duration-300 ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#2563eb] to-[#60a5fa] text-white shadow-lg shadow-blue-200 scale-105' 
                    : 'text-[#64748b] hover:bg-white/50 hover:text-[#2563eb]'
                }`}
              >
                <item.icon className={`h-5 w-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6">
          {user ? (
            <div className="space-y-4">
              <div className="glass-card bg-white/30 p-4 rounded-2xl flex items-center gap-3 border-none shadow-none">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-[#2563eb] to-cyan-400 flex items-center justify-center text-white font-bold text-base shadow-md ring-2 ring-white/50">
                  {user?.name?.substring(0, 2).toUpperCase() || "ND"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1e3a8a] truncate">{user?.name || 'Người dùng'}</p>
                  <Badge variant="outline" className="text-[10px] h-4.5 px-2 bg-blue-50 text-[#2563eb] border-blue-100 uppercase font-black">{user?.role === 'admin' ? 'Quản trị' : 'Thành viên'}</Badge>
                </div>
              </div>
              <button 
                onClick={handleLogout} 
                className="w-full px-4 py-3 rounded-2xl text-[13px] font-black text-[#EF4444] uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-red-50/50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </button>
            </div>
          ) : (
            <Link to="/login" className="px-4 py-4 rounded-2xl bg-[#2563eb] text-white text-base font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200">
              <Shield className="h-5 w-5" />
              Đăng nhập
            </Link>
          )}
        </div>
      </aside>

      {/* Main Content with subtle entrance */}
      <main className="flex-1 p-4 md:p-10 flex flex-col h-screen overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
             <div className="h-14 w-14 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
             <p className="text-[#2563eb] font-inter font-bold text-base animate-pulse">Đang đồng bộ dữ liệu...</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-700">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  );
}
