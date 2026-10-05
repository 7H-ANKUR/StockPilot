'use client';

import { useState, useEffect } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Users, UserPlus, Shield, ShieldCheck, Search,
  Trash2, Mail, Phone, Calendar, CheckCircle2, XCircle
} from 'lucide-react';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'OWNER' | 'MANAGER' | 'PROCUREMENT' | 'FINANCE' | 'ANALYST';
  phone?: string | null;
  isActive: boolean;
  createdAt: string;
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-purple-500/15 text-purple-600 border-purple-500/30',
  ADMIN: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30',
  MANAGER: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  PROCUREMENT: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  FINANCE: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  ANALYST: 'bg-slate-500/15 text-slate-600 border-slate-500/30',
};

export function UserManagementPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'ANALYST' as UserItem['role'],
    phone: '',
    password: '',
  });

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/v1/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      }
    } catch (e: any) {
      toast({
        title: 'Failed to load users',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();

      if (data.error) {
        toast({
          title: 'Failed to create user',
          description: data.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'User created successfully',
          description: `${newUser.name} added as ${newUser.role}.`,
        });
        setDialogOpen(false);
        setNewUser({
          name: '',
          email: '',
          role: 'ANALYST',
          phone: '',
          password: '',
        });
        loadUsers();
      }
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: UserItem) => {
    try {
      const res = await fetch(`/api/v1/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (data.error) {
        toast({
          title: 'Status update failed',
          description: data.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: user.isActive ? 'User deactivated' : 'User activated',
          description: `${user.name} is now ${user.isActive ? 'inactive' : 'active'}.`,
        });
        loadUsers();
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/v1/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (data.error) {
        toast({
          title: 'Role update failed',
          description: data.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Role updated',
          description: 'User permissions adjusted successfully.',
        });
        loadUsers();
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (user: UserItem) => {
    if (!confirm(`Are you sure you want to remove ${user.name} (${user.email})?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/users/${user.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.error) {
        toast({
          title: 'Deletion failed',
          description: data.error,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'User removed',
          description: data.message || `${user.name} removed.`,
        });
        loadUsers();
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalAdmins = users.filter(u => u.role === 'ADMIN' || u.role === 'OWNER').length;
  const totalManagers = users.filter(u => u.role === 'MANAGER').length;
  const totalProcurement = users.filter(u => u.role === 'PROCUREMENT' || u.role === 'FINANCE').length;

  return (
    <div className="space-y-6">
      {/* Header and Add User Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card/60 backdrop-blur-sm shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">Team & Access Management</h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
              RBAC Enabled
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage store team members, assign operational roles, and enforce approval authority.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="w-4 h-4 mr-1.5" />
              Add Team Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <form onSubmit={handleCreateUser}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Invite New User
                </DialogTitle>
                <DialogDescription>
                  Create an account and assign role-based permissions for your retail store.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 py-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newUser.name}
                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="e.g. Priya Sharma"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="priya@store.in"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Role *</label>
                    <select
                      value={newUser.role}
                      onChange={e => setNewUser({ ...newUser, role: e.target.value as any })}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="ANALYST">Analyst (View only)</option>
                      <option value="PROCUREMENT">Procurement (Create POs)</option>
                      <option value="FINANCE">Finance (Audit & GST)</option>
                      <option value="MANAGER">Manager (Approve POs)</option>
                      <option value="ADMIN">Admin (Full Control)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Phone Number</label>
                    <input
                      type="tel"
                      value={newUser.phone}
                      onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                      className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Temporary Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="At least 6 characters"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create User'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-medium">Total Members</div>
            <div className="text-2xl font-bold">{users.length}</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-medium">Administrators</div>
            <div className="text-2xl font-bold">{totalAdmins}</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-medium">Store Managers</div>
            <div className="text-2xl font-bold">{totalManagers}</div>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-medium">Procurement & Ops</div>
            <div className="text-2xl font-bold">{totalProcurement}</div>
          </div>
        </Card>
      </div>

      {/* Users Table Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Team Directory</CardTitle>
              <CardDescription>All registered users and access rights for this tenant.</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search name or email…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <select
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="h-8 px-2.5 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="PROCUREMENT">Procurement</option>
                <option value="FINANCE">Finance</option>
                <option value="ANALYST">Analyst</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2 py-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-muted/40 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead>User</TableHead>
                    <TableHead>Assigned Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => {
                    const initials = user.name
                      .split(' ')
                      .map(p => p[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    return (
                      <TableRow key={user.id} className="text-xs">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs border border-primary/20">
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground flex items-center gap-2">
                                {user.name}
                                {user.phone && (
                                  <span className="text-[11px] text-muted-foreground font-normal flex items-center gap-0.5">
                                    <Phone className="w-2.5 h-2.5" />
                                    {user.phone}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Mail className="w-2.5 h-2.5" />
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <select
                            value={user.role}
                            onChange={e => handleRoleChange(user.id, e.target.value)}
                            className={`h-7 px-2 rounded border text-xs font-medium cursor-pointer ${
                              ROLE_COLORS[user.role] || 'bg-muted'
                            }`}
                          >
                            <option value="ANALYST">Analyst</option>
                            <option value="PROCUREMENT">Procurement</option>
                            <option value="FINANCE">Finance</option>
                            <option value="MANAGER">Manager</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        </TableCell>

                        <TableCell>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            className="inline-flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            {user.isActive ? (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] py-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30 text-[10px] py-0.5">
                                <XCircle className="w-2.5 h-2.5 mr-1" />
                                Inactive
                              </Badge>
                            )}
                          </button>
                        </TableCell>

                        <TableCell className="text-muted-foreground">
                          <span className="flex items-center gap-1 text-[11px]">
                            <Calendar className="w-3 h-3" />
                            {new Date(user.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            title="Remove user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                        No team members match the search criteria.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
