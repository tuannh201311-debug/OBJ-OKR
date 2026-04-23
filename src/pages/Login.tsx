import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/context/AppContext';
import { API_URL } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Sparkles, Key, Mail } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshAuth } = useAppContext();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Authentication failed.');
      }

      const data = await res.json();
      localStorage.setItem("token", data.access_token);
      await refreshAuth();
      navigate('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đăng nhập thất bại.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen liquid-gradient flex items-center justify-center p-6 font-fira-sans">
      <div className="w-full max-w-md relative group">
        {/* Decorative Background Elements */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#2563eb] to-[#60a5fa] rounded-[3rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />

        <Card className="glass-card border-none rounded-[3rem] shadow-2xl relative overflow-hidden">
          <CardHeader className="space-y-4 text-center p-10 pb-6">
            <div className="flex justify-center mb-2">
              <div className="h-16 w-16 rounded-[1.5rem] bg-gradient-to-br from-[#2563eb] to-[#60a5fa] flex items-center justify-center shadow-lg shadow-blue-200">
                <Shield className="h-8 w-8 text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-3xl font-fira-code font-bold text-[#1e3a8a]">Chào mừng trở lại</CardTitle>
              <CardDescription className="text-[#64748b] font-medium flex items-center justify-center gap-2">
                <Sparkles className="h-3.5 w-3.5" /> Quản lý OKR Chiến lược 9Pay
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-10 pt-0">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 text-xs font-bold text-center animate-in shake-2">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-black text-[#64748b] uppercase tracking-widest ml-1">Tài khoản (Email)</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748b]" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@9pay.vn"
                    required
                    className="h-14 pl-12 rounded-2xl bg-white/50 border-white/60 focus:bg-white focus:ring-blue-200 transition-all text-[#1e3a8a] font-bold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" title="Mật khẩu" className="text-[10px] font-black text-[#64748b] uppercase tracking-widest ml-1">Mật mã truy cập</Label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748b]" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="h-14 pl-12 rounded-2xl bg-white/50 border-white/60 focus:bg-white focus:ring-blue-200 transition-all text-[#1e3a8a] font-bold"
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-14 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98] mt-4">
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang xác thực...
                  </div>
                ) : 'Đăng nhập'}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-[10px] text-[#64748b] font-bold uppercase tracking-widest">
                Bảo mật theo tiêu chuẩn doanh nghiệp
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
