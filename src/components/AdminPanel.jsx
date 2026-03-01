import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333';

export default function AdminPanel() {
  const { session, role } = useAuth();
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newRole, setNewRole] = useState('read');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const authHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
  }), [session]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Fetch users error:', err);
    }
  }, [authHeaders]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  if (role !== 'admin') {
    return (
      <div className="rounded-xl border border-jll-red/30 bg-jll-red/5 p-6 text-center">
        <p className="text-jll-red font-medium">Admin access required</p>
      </div>
    );
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/create-user`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ email, password, role: newRole, display_name: displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      setSuccess(`Created ${email} as ${newRole}`);
      setEmail('');
      setPassword('');
      setDisplayName('');
      setNewRole('read');
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error('Failed to update role');
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (userId, userEmail) => {
    if (!confirm(`Delete user ${userEmail}? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to delete user');
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const roleBadge = (r) => {
    const cls = {
      admin: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
      owner: 'bg-jll-teal/15 text-jll-accent border border-jll-teal/30',
      read: 'bg-jll-border/40 text-jll-muted',
    }[r] || 'bg-jll-border/40 text-jll-muted';
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{r}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Create User */}
      <div className="rounded-xl border border-jll-border bg-jll-card p-6">
        <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Create New User</h3>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-3 py-2 rounded-lg border border-jll-border bg-jll-navy/60 text-white text-sm placeholder-jll-muted/50 focus:outline-none focus:border-jll-accent/50"
            required
          />
          <input
            type="text"
            placeholder="Display name (optional)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="px-3 py-2 rounded-lg border border-jll-border bg-jll-navy/60 text-white text-sm placeholder-jll-muted/50 focus:outline-none focus:border-jll-accent/50"
          />
          <input
            type="password"
            placeholder="Temporary password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-3 py-2 rounded-lg border border-jll-border bg-jll-navy/60 text-white text-sm placeholder-jll-muted/50 focus:outline-none focus:border-jll-accent/50"
            required
            minLength={6}
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="px-3 py-2 rounded-lg border border-jll-border bg-jll-navy/60 text-white text-sm focus:outline-none focus:border-jll-accent/50"
          >
            <option value="read">Read Only</option>
            <option value="owner">Owner (upload)</option>
            <option value="admin">Admin</option>
          </select>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 rounded-lg bg-jll-accent text-jll-navy text-sm font-semibold hover:bg-jll-accent/90 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
        {error && <p className="text-jll-red text-sm mt-3">{error}</p>}
        {success && <p className="text-green-400 text-sm mt-3">{success}</p>}
      </div>

      {/* Users List */}
      <div className="rounded-xl border border-jll-border bg-jll-card overflow-hidden">
        <div className="px-5 py-3 border-b border-jll-border">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
            Users ({users.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-jll-border bg-jll-navy/30">
                <th className="text-left p-3 text-jll-muted font-medium">Email</th>
                <th className="text-left p-3 text-jll-muted font-medium">Name</th>
                <th className="text-left p-3 text-jll-muted font-medium">Role</th>
                <th className="text-left p-3 text-jll-muted font-medium">Created</th>
                <th className="text-right p-3 text-jll-muted font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-jll-border/40 hover:bg-jll-border/10">
                  <td className="p-3 text-white">{u.email}</td>
                  <td className="p-3 text-jll-muted">{u.display_name || '—'}</td>
                  <td className="p-3">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="bg-transparent text-xs border border-jll-border/50 rounded px-2 py-1 text-white focus:outline-none"
                    >
                      <option value="read">read</option>
                      <option value="owner">owner</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="p-3 text-jll-muted text-xs">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleDelete(u.id, u.email)}
                      className="text-jll-red/70 hover:text-jll-red text-xs transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-jll-muted">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
