import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { IconCheck, IconAlertTriangle } from '../Icons';
import { Copy, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface TrialInvite {
    id: string;
    token: string;
    expires_at: string;
    trial_days: number;
    status: 'active' | 'used' | 'revoked' | 'expired';
    note: string | null;
    is_test: boolean;
    created_at: string;
    used_at: string | null;
    used_by: string | null;
}

export default function TrialInvites() {
    const [invites, setInvites] = useState<TrialInvite[]>([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);

    // Form State
    const [trialDays, setTrialDays] = useState(3);
    const [note, setNote] = useState('');
    const [isTest, setIsTest] = useState(true);
    const [lastCreatedLink, setLastCreatedLink] = useState<string | null>(null);

    const loadInvites = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('trial_invites')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setInvites(data || []);
        } catch (error) {
            console.error('Error loading invites:', error);
            toast.error('Erro ao carregar convites');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadInvites();
    }, []);

    const generateSecureToken = () => {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    };

    const handleCreateInvite = async () => {
        setCreating(true);
        try {
            const token = generateSecureToken();
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h default

            const { data, error } = await supabase
                .from('trial_invites')
                .insert({
                    token,
                    trial_days: trialDays,
                    expires_at: expiresAt,
                    note: note || null,
                    is_test: isTest,
                    status: 'active'
                })
                .select()
                .single();

            if (error) throw error;

            const link = `${window.location.origin}/signup/invite?token=${token}`;
            setLastCreatedLink(link);
            toast.success('Convite criado com sucesso!');
            setNote('');
            loadInvites();
        } catch (error) {
            console.error('Error creating invite:', error);
            toast.error('Erro ao criar convite');
        } finally {
            setCreating(false);
        }
    };

    const handleCopyLink = (token: string) => {
        const link = `${window.location.origin}/signup/invite?token=${token}`;
        navigator.clipboard.writeText(link);
        toast.success('Link copiado!');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
            case 'used': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
            case 'expired': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
            default: return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-200">
                    Gerenciar Convites de Teste
                </h2>
                <button
                    onClick={loadInvites}
                    className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    title="Recarregar"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Create Invite Card */}
            <div className="p-6 rounded-2xl bg-[#18181b] border border-white/10 shadow-lg">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Plus size={20} className="text-emerald-500" />
                    Novo Convite
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label className="text-xs text-zinc-400 mb-1 block">Dias de Trial</label>
                        <input
                            type="number"
                            value={trialDays}
                            onChange={(e) => setTrialDays(parseInt(e.target.value))}
                            className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs text-zinc-400 mb-1 block">Nota (Opcional)</label>
                        <input
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Ex: Lead WhatsApp João"
                            className="w-full bg-zinc-800 border-zinc-700 rounded-lg px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                        />
                    </div>
                    <div className="flex items-center gap-2 pb-2">
                        <input
                            type="checkbox"
                            checked={isTest}
                            onChange={(e) => setIsTest(e.target.checked)}
                            id="isTest"
                            className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
                        />
                        <label htmlFor="isTest" className="text-sm text-zinc-300">Conta de Teste</label>
                    </div>
                </div>

                <div className="mt-4 flex justify-between items-center">
                    <button
                        onClick={handleCreateInvite}
                        disabled={creating}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {creating ? 'Gerando...' : 'Gerar Link de Convite'}
                    </button>

                    {lastCreatedLink && (
                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg animate-in slide-in-from-left duration-300">
                            <Copy size={16} className="text-emerald-500" />
                            <span className="text-xs text-emerald-200 font-mono truncate max-w-[200px]">{lastCreatedLink}</span>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(lastCreatedLink);
                                    toast.success('Link copiado!');
                                }}
                                className="text-xs bg-emerald-500 text-white px-2 py-1 rounded hover:bg-emerald-600 transition-colors"
                            >
                                Copiar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-xs text-zinc-500 border-b border-white/5">
                            <th className="p-3 font-medium">Data</th>
                            <th className="p-3 font-medium">Nota</th>
                            <th className="p-3 font-medium">Status</th>
                            <th className="p-3 font-medium">Dias</th>
                            <th className="p-3 font-medium">Expira em</th>
                            <th className="p-3 font-medium">Usado Por</th>
                            <th className="p-3 font-medium text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-white/5">
                        {invites.map(invite => (
                            <tr key={invite.id} className="hover:bg-white/5 transition-colors">
                                <td className="p-3 text-zinc-300">
                                    {new Date(invite.created_at).toLocaleDateString()}
                                </td>
                                <td className="p-3 text-zinc-300">
                                    {invite.note || '-'}
                                </td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(invite.status)}`}>
                                        {invite.status === 'active' && new Date(invite.expires_at) < new Date() ? 'Expirado' : invite.status.toUpperCase()}
                                    </span>
                                </td>
                                <td className="p-3 text-zinc-300">
                                    {invite.trial_days}d
                                </td>
                                <td className="p-3 text-zinc-400 text-xs">
                                    {new Date(invite.expires_at).toLocaleString()}
                                </td>
                                <td className="p-3 text-zinc-400 font-mono text-xs">
                                    {invite.used_by || '-'}
                                </td>
                                <td className="p-3 text-right">
                                    {invite.status === 'active' && new Date(invite.expires_at) > new Date() && (
                                        <button
                                            onClick={() => handleCopyLink(invite.token)}
                                            className="text-emerald-400 hover:text-emerald-300 p-1 rounded hover:bg-emerald-400/10 transition-colors"
                                            title="Copiar Link"
                                        >
                                            <Copy size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {invites.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-zinc-500">
                                    Nenhum convite criado até o momento.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
