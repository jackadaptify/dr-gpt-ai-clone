import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { User } from '../../types';
import { IconUser, IconPlus, IconLink, IconCopy, IconCheck, IconX } from '../Icons';
import CreateUserModal from './CreateUserModal';

export default function UsersList() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Magic Link State
    const [generatingLinkFor, setGeneratingLinkFor] = useState<string | null>(null);
    const [magicLinkResult, setMagicLinkResult] = useState<string | null>(null);

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

    const handleGenerateMagicLink = async (user: User) => {
        if (!confirm(`Gerar novo Magic Link para ${user.email}?`)) return;

        setGeneratingLinkFor(user.id);
        try {
            // Reusing createUser endpoint which handles existing users
            const result = await adminService.createUser({
                email: user.email,
                fullName: user.full_name || '',
                generateMagicLink: true,
                // Do not change trial status unless calling specifically to change it (we are just generating link)
            });

            if (result.magicLink) {
                setMagicLinkResult(result.magicLink);
            } else {
                alert('Link não retornado pelo servidor.');
            }
        } catch (error: any) {
            console.error('Failed to generate link:', error);
            alert('Erro ao gerar link: ' + error.message);
        } finally {
            setGeneratingLinkFor(null);
        }
    };

    const copyToClipboard = () => {
        if (magicLinkResult) {
            navigator.clipboard.writeText(magicLinkResult);
        }
    };

    const getTrialBadge = (user: User) => {
        if (user.trial_status === 'active') {
            // Check expiry
            const endsAt = user.trial_ends_at ? new Date(user.trial_ends_at) : null;
            const isExpired = endsAt && endsAt < new Date();

            if (isExpired) {
                return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">Trial Expirado</span>;
            }
            return <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20">Trial Ativo</span>;
        }
        if (user.trial_status === 'expired') {
            return <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">Trial Expirado</span>;
        }
        return null;
    };

    if (loading) return <div className="text-textMuted">Carregando usuários...</div>;

    return (
        <div className="space-y-6 relative">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold mb-2">Usuários</h2>
                    <p className="text-textMuted">Gerencie os usuários registrados no sistema.</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 bg-primary hover:bg-primaryHover text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-lg shadow-primary/20"
                >
                    <IconPlus className="w-5 h-5" />
                    Criar Usuário
                </button>
            </div>

            <div className="bg-surface border border-borderLight rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-borderLight bg-surfaceHighlight/50">
                            <th className="p-4 text-xs font-bold text-textMuted uppercase tracking-wider">Usuário</th>
                            <th className="p-4 text-xs font-bold text-textMuted uppercase tracking-wider">Email</th>
                            <th className="p-4 text-xs font-bold text-textMuted uppercase tracking-wider">Role / Status</th>
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
                                    <div className="flex gap-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.role === 'admin'
                                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                            : 'bg-surfaceHighlight text-textMuted'
                                            }`}>
                                            {user.role || 'user'}
                                        </span>
                                        {getTrialBadge(user)}
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => handleGenerateMagicLink(user)}
                                            disabled={generatingLinkFor === user.id}
                                            className="p-2 hover:bg-surfaceHighlight rounded-lg text-textMuted hover:text-primary transition-colors disabled:opacity-50"
                                            title="Gerar Magic Link"
                                        >
                                            <IconLink className="w-4 h-4" />
                                        </button>
                                        <button className="text-xs font-medium text-textMuted hover:text-textMain transition-colors">
                                            Detalhes
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <CreateUserModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    loadUsers();
                    // Optional: Show success toast
                }}
            />

            {/* Magic Link Result Modal */}
            {magicLinkResult && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-surface border border-borderLight rounded-2xl w-full max-w-sm shadow-2xl p-6 relative">
                        <button
                            onClick={() => setMagicLinkResult(null)}
                            className="absolute top-4 right-4 text-textMuted hover:text-textMain transition-colors"
                        >
                            <IconX className="w-6 h-6" />
                        </button>

                        <div className="text-center mb-4">
                            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
                                <IconCheck className="w-6 h-6 text-green-500" />
                            </div>
                            <h3 className="text-lg font-bold">Magic Link Gerado</h3>
                        </div>

                        <div className="mb-6">
                            <label className="block text-xs font-medium text-textMuted mb-1 uppercase text-left">Link de Acesso</label>
                            <div className="flex gap-2">
                                <input
                                    readOnly
                                    value={magicLinkResult}
                                    className="w-full bg-surfaceHighlight border border-borderLight rounded-xl px-4 py-3 text-xs font-mono text-textMain focus:outline-none"
                                />
                                <button
                                    onClick={copyToClipboard}
                                    className="bg-surfaceHighlight border border-borderLight hover:bg-surfaceHover text-textMain px-3 rounded-xl transition-colors shrink-0"
                                    title="Copiar"
                                >
                                    <IconCopy className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => setMagicLinkResult(null)}
                            className="w-full bg-surfaceHighlight hover:bg-surfaceHover text-textMain py-2 rounded-xl text-sm font-medium transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
