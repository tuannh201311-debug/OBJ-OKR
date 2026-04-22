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
import { UserPlus, Trash2, Shield, Edit2, Settings as SettingsIcon, Users, Key } from 'lucide-react';
import { toast } from 'sonner';

interface Member {
  id: string;
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
      toast.error('Please fill in required fields');
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
        throw new Error(err.detail || 'Action failed');
      }

      const newU = await res.json();

      if (newRole === 'admin') {
        await handleChangeRole(newU.id, 'admin');
      } else {
        toast.success('Member added successfully');
        loadMembers();
      }

      setNewEmail('');
      setNewName('');
      setNewPassword('');
      setNewRole('member');
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Could not add member');
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
      toast.success('User updated');
      loadMembers();
      setEditUserId(null);
    } catch (e) {
      toast.error('Failed to update');
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
      toast.success('Role updated');
      loadMembers();
    } catch (e) {
      toast.error('Failed to update role');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (userId === user?.uid) {
      toast.error('Cannot remove yourself');
      return;
    }
    try {
      const res = await fetchWithAuth(`/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Member removed');
        loadMembers();
      }
    } catch (e) {
      toast.error('System error');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
        <div className="h-16 w-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
          <Shield className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-xl font-fira-code font-bold text-[#1e3a8a]">Access Restricted</h2>
          <p className="text-[#64748b] text-sm max-w-xs mx-auto">Only administrators can manage system users and global settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 font-fira-sans pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-fira-code font-bold text-[#1e3a8a] flex items-center gap-3">
            <SettingsIcon className="h-8 w-8 text-[#2563eb]" /> System Governance
          </h1>
          <p className="text-[#64748b] text-sm mt-1">Configure workspace permissions and directory access.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-6 rounded-xl h-12 font-bold shadow-lg shadow-blue-100 transition-all hover:scale-105">
              <UserPlus className="mr-2 h-5 w-5" /> Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-none rounded-3xl">
            <DialogHeader>
              <DialogTitle className="font-fira-code text-[#1e3a8a]">Provision New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black text-[#64748b] uppercase">Display Name</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="rounded-xl border-white/60 bg-white/40" />
              </div>
              <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black text-[#64748b] uppercase">Email Identity</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="rounded-xl border-white/60 bg-white/40" />
              </div>
              <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black text-[#64748b] uppercase">Access Key</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="rounded-xl border-white/60 bg-white/40" />
              </div>
              <div className="space-y-1.5 text-left">
                <Label className="text-[10px] font-black text-[#64748b] uppercase">Privilege Tier</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as 'admin' | 'member')}>
                  <SelectTrigger className="rounded-xl border-white/60 bg-white/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="member">Standard Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddMember} disabled={loading} className="w-full bg-[#2563eb] h-12 rounded-xl mt-4">
                {loading ? 'Provisioning...' : 'Add to Workspace'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <Card className="glass-card border-none rounded-[2.5rem] shadow-none overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
            <CardHeader className="p-8 pb-4 border-b border-white/20">
              <CardTitle className="text-lg font-bold text-[#1e3a8a] flex items-center gap-2">
                <Users className="h-5 w-5 text-[#2563eb]" /> Workspace Directory
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 bg-white/40 border border-white/60 rounded-2xl hover:bg-white/70 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#2563eb] to-[#60a5fa] flex items-center justify-center text-white text-xs font-bold shadow-md">
                        {member.display_name?.substring(0, 2).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#1e3a8a]">{member.display_name || 'Anonymous'}</p>
                        <p className="text-[10px] text-[#64748b] font-medium">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <Select
                        value={member.role}
                        onValueChange={(v) => handleChangeRole(member.id, v as 'admin' | 'member')}
                        disabled={member.id === user?.uid}
                      >
                        <SelectTrigger className="w-[120px] h-9 text-[10px] font-black uppercase tracking-tighter rounded-xl bg-white/50 border-white/40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-2">
                        <Dialog open={editUserId === member.id} onOpenChange={(open) => open ? setEditUserId(member.id) : setEditUserId(null)}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-[#2563eb] hover:bg-blue-50" onClick={() => { setEditName(member.display_name); setEditPassword(''); }}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="glass-card border-none rounded-3xl">
                            <DialogHeader><DialogTitle className="font-fira-code">User Configuration</DialogTitle></DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-1.5"><Label>Display Name</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
                              <div className="space-y-1.5"><Label>Rotate Access Key</Label><Input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Keep blank for no change" /></div>
                              <Button onClick={handleEditUser} disabled={editUpdating} className="w-full bg-[#2563eb] h-12 rounded-xl mt-4">Save Changes</Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {member.id === user?.uid ? (
                          <Badge className="bg-blue-50 text-[#2563eb] text-[9px] h-9 px-3 rounded-xl border-none">You</Badge>
                        ) : (
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => handleRemoveMember(member.id)}
                            className="h-9 w-9 rounded-xl text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="glass-card border-none rounded-[2rem] p-8">
            <div className="h-12 w-12 rounded-2xl bg-cyan-50 flex items-center justify-center mb-4">
              <Key className="h-6 w-6 text-cyan-600" />
            </div>
            <h3 className="text-base font-bold text-[#1e3a8a] mb-2">Workspace Security</h3>
            <p className="text-xs text-[#64748b] leading-relaxed">Ensure all users have strong access keys. Roles define who can manage the strategic OKR tree.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
