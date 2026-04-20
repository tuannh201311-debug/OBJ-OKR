import { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { fetchWithAuth } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, Trash2, Shield, Edit2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface Member {
  id: string; // Used to be user_id
  display_name: string;
  email: string | null;
  role: 'admin' | 'member';
}

export function Settings() {
  const { user } = useAppContext();
  const [members, setMembers] = useState<Member[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'member'>('member');
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editUpdating, setEditUpdating] = useState(false);

  const loadMembers = async () => {
    try {
      const res = await fetchWithAuth('/users');
      if (res.ok) {
        const users = await res.json();
        setMembers(users);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadMembers();
    }
  }, [user]);

  const handleAddMember = async () => {
    if (!newEmail || !newPassword) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }
    setLoading(true);
    try {
      const res = await fetchWithAuth('/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          display_name: newName || newEmail
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Không thể thao tác');
      }
      
      const newU = await res.json();

      // If role is admin, update it because default is member
      if (newRole === 'admin') {
        await handleChangeRole(newU.id, 'admin');
      } else {
        toast.success('Đã thêm thành viên thành công');
        loadMembers();
      }
      
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      setNewRole('member');
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Không thể thêm thành viên');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!editUserId) return;
    setEditUpdating(true);
    try {
      const payload: any = {};
      if (editName) payload.display_name = editName;
      if (editPassword) payload.password = editPassword;
      
      const res = await fetchWithAuth(`/users/${editUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Could not modify member");
      toast.success('Cập nhật thông tin thành công');
      loadMembers();
      setEditUserId(null);
    } catch(e) {
      toast.error('Lỗi khi cập nhật thông tin');
    } finally {
      setEditUpdating(false);
    }
  };

  const handleChangeRole = async (userId: string, role: 'admin' | 'member') => {
    try {
      const res = await fetchWithAuth(`/users/${userId}/role?role=${role}`, {
        method: 'PUT'
      });
      if (!res.ok) throw new Error("Could not modify");
      toast.success('Đã cập nhật quyền');
      loadMembers();
    } catch(e) {
      toast.error('Lỗi khi cập nhật quyền');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (userId === user?.uid) {
      toast.error('Không thể xóa chính mình');
      return;
    }
    try {
      const res = await fetchWithAuth(`/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Đã xóa thành viên');
        loadMembers();
      }
    } catch (e) {
      toast.error('Lỗi xóa hệ thống');
    }
  };

  const handleResetDatabase = async () => {
    if (!confirm('BẠN CÓ CHẮC CHẮN? Hành động này sẽ xóa toàn bộ OKR và nhiệm vụ. Chỉ giữ lại tài khoản admin hiện tại.')) {
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetchWithAuth('/admin/reset-db', { method: 'POST' });
      if (res.ok) {
        toast.success('Đã làm mới database thành công');
        window.location.reload(); // Reload to refresh all data
      } else {
        toast.error('Không thể làm mới database');
      }
    } catch (e) {
      toast.error('Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-[#64748b]">
          <Shield className="h-12 w-12 mx-auto mb-4 text-[#cbd5e1]" />
          <p className="text-lg font-medium">Bạn không có quyền truy cập trang này</p>
          <p className="text-sm mt-1">Chỉ admin mới có thể quản lý cài đặt</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Cài đặt & Quản lý thành viên</h1>
          <p className="text-[#64748b] text-sm mt-1">Thêm, phân quyền và quản lý thành viên trong hệ thống</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#2563eb] hover:bg-[#1d4ed8]">
              <UserPlus className="mr-2 h-4 w-4" /> Thêm thành viên
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thêm thành viên mới</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tên hiển thị</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nguyễn Văn A" />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@example.com" required />
              </div>
              <div className="space-y-2">
                <Label>Mật khẩu *</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Tối thiểu 6 ký tự" required />
              </div>
              <div className="space-y-2">
                <Label>Quyền</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as 'admin' | 'member')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin - Toàn quyền</SelectItem>
                    <SelectItem value="member">Member - Chỉ xem</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddMember} disabled={loading} className="w-full bg-[#2563eb]">
                {loading ? 'Đang tạo...' : 'Thêm thành viên'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-[#ffffff] rounded-xl border border-[#e2e8f0]">
        <CardHeader>
          <CardTitle className="text-base">Danh sách thành viên ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-[#2563eb] flex items-center justify-center text-[#ffffff] text-xs font-bold">
                    {member.display_name?.substring(0, 2).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1e293b]">{member.display_name || 'Chưa đặt tên'}</p>
                    <p className="text-xs text-[#64748b]">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={member.role}
                    onValueChange={(v) => handleChangeRole(member.id, v as 'admin' | 'member')}
                    disabled={member.id === user?.uid}
                  >
                    <SelectTrigger className="w-[140px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                  <Dialog open={editUserId === member.id} onOpenChange={(open) => {
                    if (open) {
                      setEditUserId(member.id);
                      setEditName(member.display_name || '');
                      setEditPassword('');
                    } else {
                      setEditUserId(null);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-[#64748b] hover:bg-[#e2e8f0]">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Cập nhật thông tin</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Tên hiển thị</Label>
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Tên mới..." />
                        </div>
                        <div className="space-y-2">
                          <Label>Mật khẩu mới (bỏ trống nếu không đổi)</Label>
                          <Input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Mật khẩu mới..." />
                        </div>
                        <Button onClick={handleEditUser} disabled={editUpdating} className="w-full bg-[#2563eb]">
                          {editUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  {member.id === user?.uid ? (
                    <Badge variant="secondary" className="text-xs">Bạn</Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                      className="h-8 w-8 p-0 text-[#ef4444] hover:bg-[#fee2e2]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {members.length === 0 && (
              <div className="text-center py-8 text-[#64748b] text-sm">
                Chưa có thành viên nào. Hãy thêm thành viên đầu tiên.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#ffffff] rounded-xl border border-red-200 overflow-hidden mt-8">
        <CardHeader className="bg-red-50 border-b border-red-100">
          <CardTitle className="text-base text-red-700 flex items-center gap-2">
            <RotateCcw className="h-4 w-4" /> Khu vực nguy hiểm
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="font-semibold text-[#1e293b]">Tạo lại Database</p>
              <p className="text-sm text-[#64748b]">Xóa tất cả các OKR, Big Tasks và Sub Tasks. Tất cả dữ liệu sẽ bị mất vĩnh viễn.</p>
            </div>
            <Button 
              variant="destructive" 
              onClick={handleResetDatabase}
              disabled={loading}
              className="bg-[#ef4444] hover:bg-[#dc2626]"
            >
              {loading ? 'Đang xử lý...' : 'Làm mới Database'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
