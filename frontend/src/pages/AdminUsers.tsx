import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface EmployeeItem {
  name: string;
  role: string;
}

interface UserItem {
  _id: string;
  name: string;
  username: string;
  role: string;
  isActive: boolean;
  supervisorId?: string;
  employees?: EmployeeItem[];
}

export default function AdminUsers() {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New user form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('supervisor');

  // Edit modal
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editActive, setEditActive] = useState(true);

  // Employee management
  const [managingEmployees, setManagingEmployees] = useState<UserItem | null>(null);
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('');
  const [localEmployees, setLocalEmployees] = useState<EmployeeItem[]>([]);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [accessToken, user]);

  async function fetchUsers() {
    try {
      setLoading(true);
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Falha ao buscar usuários');
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setError(null);
    setSuccess(null);
    if (!newUsername.trim() || !newPassword.trim()) {
      setError('Usuário e senha são obrigatórios');
      return;
    }
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: newName.trim() || newUsername.trim().toUpperCase(),
          username: newUsername.trim(),
          password: newPassword.trim(),
          role: newRole,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Erro ao criar usuário');
      }
      setNewUsername('');
      setNewPassword('');
      setNewName('');
      setNewRole('supervisor');
      setSuccess('Usuário criado com sucesso');
      await fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function openEdit(u: UserItem) {
    setEditing(u);
    setEditName(u.name);
    setEditUsername(u.username);
    setEditRole(u.role);
    setEditPassword('');
    setEditActive(u.isActive);
  }

  async function handleSaveEdit() {
    if (!editing) return;
    setError(null);
    setSuccess(null);
    try {
      const body: any = {
        name: editName.trim(),
        username: editUsername.trim(),
        role: editRole,
        isActive: editActive,
      };
      if (editPassword.trim()) body.password = editPassword.trim();

      const res = await fetch(`/api/users/${editing._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Erro ao atualizar');
      }
      setEditing(null);
      setSuccess('Usuário atualizado com sucesso');
      await fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(u: UserItem) {
    if (!confirm(`Tem certeza que deseja excluir "${u.name}"?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/users/${u._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Erro ao excluir');
      }
      setSuccess('Usuário excluído');
      await fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function openEmployees(u: UserItem) {
    setManagingEmployees(u);
    setLocalEmployees([...(u.employees || [])]);
    setEmpName('');
    setEmpRole('');
  }

  function addEmployee() {
    if (!empName.trim()) return;
    setLocalEmployees(prev => [...prev, { name: empName.trim().toUpperCase(), role: empRole.trim().toUpperCase() || 'FUNCIONÁRIO' }]);
    setEmpName('');
    setEmpRole('');
  }

  function removeEmployee(idx: number) {
    setLocalEmployees(prev => prev.filter((_, i) => i !== idx));
  }

  async function saveEmployees() {
    if (!managingEmployees) return;
    setError(null);
    try {
      const res = await fetch(`/api/users/${managingEmployees._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ employees: localEmployees }),
      });
      if (!res.ok) throw new Error('Erro ao salvar funcionários');
      setManagingEmployees(null);
      setSuccess('Funcionários atualizados');
      await fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const roleLabel = (r: string) =>
    r === 'admin' ? '🔑 Admin' : r === 'supervisor' ? '👷 Supervisor' : '👁 Expectador';

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground py-4 px-6 shadow-lg">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Central de Usuários</h1>
            <p className="text-sm text-primary-foreground/80">Gerenciamento de usuários e equipes</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground rounded-lg text-sm font-medium transition-colors"
          >
            ← Voltar ao Painel
          </button>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg">
            {error}
            <button onClick={() => setError(null)} className="ml-2 font-bold">×</button>
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-700 px-4 py-3 rounded-lg">
            {success}
            <button onClick={() => setSuccess(null)} className="ml-2 font-bold">×</button>
          </div>
        )}

        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="font-semibold text-lg mb-4">Criar Novo Usuário</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <input
              placeholder="Nome"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 bg-background text-sm"
            />
            <input
              placeholder="Usuário (login)"
              value={newUsername}
              onChange={e => setNewUsername(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 bg-background text-sm"
            />
            <input
              placeholder="Senha"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 bg-background text-sm"
            />
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 bg-background text-sm"
            >
              <option value="admin">Admin</option>
              <option value="supervisor">Supervisor</option>
              <option value="expectador">Expectador</option>
            </select>
            <button
              onClick={handleCreate}
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              + Criar
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold text-lg">Usuários ({users.length})</h2>
            <button
              onClick={fetchUsers}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ↻ Atualizar
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="px-4 py-3 font-medium">Nome</th>
                    <th className="px-4 py-3 font-medium">Login</th>
                    <th className="px-4 py-3 font-medium">Papel</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Equipe</th>
                    <th className="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} className={`border-t border-border/50 hover:bg-muted/30 transition-colors ${!u.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 font-medium">{u.name?.toUpperCase()}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.username}</td>
                      <td className="px-4 py-3">{roleLabel(u.role)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {u.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {u.role === 'supervisor' ? `${u.employees?.length || 0} funcionário(s)` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => openEdit(u)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        >
                          Editar
                        </button>
                        {u.role === 'supervisor' && (
                          <button
                            onClick={() => openEmployees(u)}
                            className="text-purple-600 hover:text-purple-800 text-xs font-medium"
                          >
                            Equipe
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(u)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditing(null)}>
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-lg">Editar Usuário</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-muted-foreground">Nome</label>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Login</label>
                <input
                  value={editUsername}
                  onChange={e => setEditUsername(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Nova Senha (deixe vazio para manter)</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Papel</label>
                <select
                  value={editRole}
                  onChange={e => setEditRole(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 bg-background text-sm mt-1"
                >
                  <option value="admin">Admin</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="expectador">Expectador</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editActive}
                  onChange={e => setEditActive(e.target.checked)}
                  id="edit-active"
                />
                <label htmlFor="edit-active" className="text-sm">Ativo</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {managingEmployees && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setManagingEmployees(null)}>
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-lg mx-4 space-y-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-lg">
              Equipe de {managingEmployees.name?.toUpperCase()}
            </h3>

            <div className="flex gap-2">
              <input
                placeholder="Nome do funcionário"
                value={empName}
                onChange={e => setEmpName(e.target.value)}
                className="flex-1 border border-border rounded-lg px-3 py-2 bg-background text-sm"
                onKeyDown={e => e.key === 'Enter' && addEmployee()}
              />
              <input
                placeholder="Função"
                value={empRole}
                onChange={e => setEmpRole(e.target.value)}
                className="w-40 border border-border rounded-lg px-3 py-2 bg-background text-sm"
                onKeyDown={e => e.key === 'Enter' && addEmployee()}
              />
              <button
                onClick={addEmployee}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
              >
                +
              </button>
            </div>

            <div className="space-y-1">
              {localEmployees.length === 0 && (
                <p className="text-sm text-muted-foreground py-2">Nenhum funcionário cadastrado</p>
              )}
              {localEmployees.map((emp, idx) => (
                <div key={idx} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                  <div className="text-sm">
                    <span className="font-medium">{emp.name?.toUpperCase()}</span>
                    <span className="text-muted-foreground ml-2">— {emp.role?.toUpperCase()}</span>
                  </div>
                  <button
                    onClick={() => removeEmployee(idx)}
                    className="text-red-500 hover:text-red-700 text-sm font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-muted-foreground">{localEmployees.length} funcionário(s)</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setManagingEmployees(null)}
                  className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveEmployees}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Salvar Equipe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
