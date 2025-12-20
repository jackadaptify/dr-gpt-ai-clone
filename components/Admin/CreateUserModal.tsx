import React, { useState } from 'react';
import { adminService } from '../../services/adminService';
import { IconX } from '../Icons';

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            await adminService.createUser({ email, password, fullName });
            onSuccess();
            onClose();
            // Reset form
            setEmail('');
            setPassword('');
            setFullName('');
        } catch (err: any) {
            console.error('Failed to create user:', err);
            setError(err.message || 'Erro ao criar usuário');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-surface border border-borderLight rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-textMuted hover:text-textMain transition-colors"
                >
                    <IconX className="w-6 h-6" />
                </button>

                <h2 className="text-2xl font-bold mb-1">Criar Usuário</h2>
                <p className="text-textMuted text-sm mb-6">Crie uma conta de teste com acesso Pro.</p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-textMuted mb-1">Nome Completo</label>
                        <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-surfaceHighlight border border-borderLight rounded-xl px-4 py-3 text-textMain focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="Ex: João Silva"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-textMuted mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-surfaceHighlight border border-borderLight rounded-xl px-4 py-3 text-textMain focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="usuario@exemplo.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-textMuted mb-1">Senha</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-surfaceHighlight border border-borderLight rounded-xl px-4 py-3 text-textMain focus:outline-none focus:ring-2 focus:ring-primary/50"
                            placeholder="Mínimo 6 caracteres"
                        />
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-textMuted hover:text-textMain transition-colors text-sm font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-primary hover:bg-primaryHover text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isLoading ? 'Criando...' : 'Criar Usuário'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
