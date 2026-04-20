import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Network, Settings, Shield, LogOut } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, logout } = useAppContext();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, adminOnly: false },
    { name: 'Quản lý OKR', href: '/okr-tree', icon: Network, adminOnly: false },
    { name: 'Cài đặt', href: '/settings', icon: Settings, adminOnly: true },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const visibleNav = navigation.filter(item => !item.adminOnly || user?.role === 'admin');

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans text-[#1e293b] overflow-hidden">
      <aside className="w-[220px] bg-[#ffffff] border-r border-[#e2e8f0] p-5 flex flex-col shrink-0">
        <div className="text-xl font-extrabold text-[#2563eb] mb-8 flex items-center gap-2">
          <Shield className="h-6 w-6" />
          OKR TL - 9Pay
        </div>
        <nav className="flex flex-col">
          {visibleNav.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`px-3 py-2.5 rounded-lg mb-1 text-sm font-medium flex items-center gap-2.5 cursor-pointer transition-colors ${
                  isActive ? 'bg-[#eff6ff] text-[#2563eb]' : 'text-[#64748b] hover:bg-[#f8fafc]'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-5 border-t border-[#e2e8f0] flex flex-col">
          {user ? (
            <>
              <div className="flex items-center gap-3 px-3 py-2 mb-2">
                <div className="h-8 w-8 rounded-full bg-[#2563eb] flex items-center justify-center text-[#ffffff] text-xs font-bold">
                  {user?.name?.substring(0, 2).toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1e293b] truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-[#64748b] truncate">{user?.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}</p>
                </div>
              </div>
              <div onClick={handleLogout} className="px-3 py-2.5 rounded-lg text-sm font-medium text-[#ef4444] flex items-center gap-2.5 cursor-pointer hover:bg-[#fee2e2]">
                <LogOut className="h-4 w-4" />
                Đăng xuất
              </div>
            </>
          ) : (
            <Link to="/login" className="px-3 py-2.5 rounded-lg text-sm font-medium text-[#2563eb] flex items-center gap-2.5 cursor-pointer hover:bg-[#eff6ff]">
              <Shield className="h-4 w-4" />
              Đăng nhập
            </Link>
          )}
        </div>
      </aside>

      <main className="flex-1 p-6 flex flex-col gap-5 h-screen overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-[#64748b]">Đang tải...</div>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
