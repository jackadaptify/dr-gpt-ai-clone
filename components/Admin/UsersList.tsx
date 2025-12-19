import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { User } from '../../types';
import { IconUser } from '../Icons';

export default function UsersList() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const data = await adminService.getUsers();
            setUsers(data);
        } catch (error) {
            console.error('Failed to load users', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-textMuted">Carregando usuários...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold mb-2">Usuários</h2>
                <p className="text-textMuted">Gerencie os usuários registrados no sistema.</p>
            </div>

            <div className="bg-surface border border-borderLight rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-borderLight bg-surfaceHighlight/50">
                            <th className="p-4 text-xs font-bold text-textMuted uppercase tracking-wider">Usuário</th>
                            <th className="p-4 text-xs font-bold text-textMuted uppercase tracking-wider">Email</th>
                            <th className="p-4 text-xs font-bold text-textMuted uppercase tracking-wider">Role</th>
                            <th className="p-4 text-xs font-bold text-textMuted uppercase tracking-wider text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-b border-borderLight hover:bg-surfaceHighlight/50 transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        {user.avatar_url ? (
                                            <img src={user.avatar_url} alt={user.full_name} className="w-8 h-8 rounded-full" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-surfaceHighlight flex items-center justify-center">
                                                <IconUser className="w-4 h-4 text-textMuted" />
                                            </div>
                                        )}
                                        <span className="font-medium">{user.full_name || 'Sem nome'}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-textMuted text-sm">{user.email}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.role === 'admin'
                                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                        : 'bg-surfaceHighlight text-textMuted'
                                        }`}>
                                        {user.role || 'user'}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <button className="text-xs font-medium text-textMuted hover:text-textMain transition-colors">
                                        Detalhes
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
