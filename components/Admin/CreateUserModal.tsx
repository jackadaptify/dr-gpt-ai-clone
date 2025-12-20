import React, { useState } from 'react';
import { adminService } from '../../services/adminService';
import { IconX, IconCheck, IconCopy } from '../Icons';

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isTrial, setIsTrial] = useState(false);
    const [trialDays, setTrialDays] = useState(3);
    const [generateMagicLink, setGenerateMagicLink] = useState(false);

    // UI States
    const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form');
    const [magicLink, setMagicLink] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const resetForm = () => {
        setEmail('');
        setPassword('');
        setFullName('');
        setIsTrial(false);
        setTrialDays(3);
        setGenerateMagicLink(false);
        setStep('form');
        setMagicLink(null);
        setError(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handlePreSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // If creating a new user with Magic Link, force confirmation
        if (generateMagicLink) {
            setStep('confirm');
        } else {
            handleSubmit();
        }
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const result = await adminService.createUser({
                email,
                password,
                fullName,
                isTest: isTrial,
                trialDays: isTrial ? trialDays : undefined,
                generateMagicLink
            });

            if (result.magicLink) {
                setMagicLink(result.magicLink);
                setStep('success');
            } else {
                // No magic link, just success
                onSuccess();
                handleClose();
            }
        } catch (err: any) {
            console.error('Failed to create user:', err);
            setError(err.message || 'Erro ao criar usuário');
            setStep('form'); // Go back to form on error
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (magicLink) {
            navigator.clipboard.writeText(magicLink);
            // Could add small toast here if available, but icon change is handled by UI ideally
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-surface border border-borderLight rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-textMuted hover:text-textMain transition-colors"
                >
                    <IconX className="w-6 h-6" />
                </button>

                <h2 className="text-2xl font-bold mb-1">
                    {step === 'success' ? 'Usuário Criado!' : 'Criar Usuário'}
                </h2>
                <p className="text-textMuted text-sm mb-6">
                    {step === 'success'
                        ? 'O usuário foi criado com sucesso.'
                        : 'Preencha os dados para criar um novo usuário.'}
                </p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-sm mb-4">
                        {error}
                    </div>
                )}

                {step === 'form' && (
                    <form onSubmit={handlePreSubmit} className="space-y-4">
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

                        {!generateMagicLink && (
                            <div>
                                <label className="block text-sm font-medium text-textMuted mb-1">Senha</label>
                                <input
                                    type="password"
                                    required={!generateMagicLink}
                                    minLength={6}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-surfaceHighlight border border-borderLight rounded-xl px-4 py-3 text-textMain focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>
                        )}

                        {/* Trial Toggle */}
                        <div className="flex items-center justify-between p-3 bg-surfaceHighlight rounded-xl border border-borderLight">
                            <span className="text-sm font-medium">Conta de Teste (Trial)</span>
                            <button
                                type="button"
                                onClick={() => setIsTrial(!isTrial)}
                                className={`w-12 h-6 rounded-full transition-colors relative ${isTrial ? 'bg-primary' : 'bg-zinc-600'}`}
                            >
                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isTrial ? 'translate-x-6' : ''}`} />
                            </button>
                        </div>

                        {isTrial && (
                            <div>
                                <label className="block text-sm font-medium text-textMuted mb-1">Duração do Teste</label>
                                <select
                                    value={trialDays}
                                    onChange={(e) => setTrialDays(Number(e.target.value))}
                                    className="w-full bg-surfaceHighlight border border-borderLight rounded-xl px-4 py-3 text-textMain focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value={3}>3 Dias</option>
                                    <option value={7}>7 Dias</option>
                                    <option value={14}>14 Dias</option>
                                </select>
                            </div>
                        )}

                        {/* Magic Link Checkbox */}
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="magicLink"
                                checked={generateMagicLink}
                                onChange={(e) => setGenerateMagicLink(e.target.checked)}
                                className="w-5 h-5 rounded border-borderLight bg-surfaceHighlight text-primary focus:ring-primary"
                            />
                            <label htmlFor="magicLink" className="text-sm text-textMain cursor-pointer select-none">
                                Gerar Magic Link (Login Automático)
                            </label>
                        </div>

                        <div className="pt-2 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-4 py-2 text-textMuted hover:text-textMain transition-colors text-sm font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="bg-primary hover:bg-primaryHover text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors"
                            >
                                {generateMagicLink ? 'Continuar' : 'Criar Usuário'}
                            </button>
                        </div>
                    </form>
                )}

                {step === 'confirm' && (
                    <div className="space-y-6">
                        <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl">
                            <h3 className="text-yellow-500 font-bold mb-2">Confirme os dados</h3>
                            <p className="text-xs text-yellow-500/80 mb-4">
                                Você está prestes a gerar um Magic Link de acesso direto. Verifique o email com atenção.
                            </p>
                            <div className="space-y-2 text-sm">
                                <p><span className="text-textMuted">Nome:</span> <span className="font-semibold text-textMain">{fullName}</span></p>
                                <p><span className="text-textMuted">Email:</span> <span className="font-semibold text-textMain">{email}</span></p>
                                <p><span className="text-textMuted">Tipo:</span> <span className="font-semibold text-textMain">{isTrial ? `Trial (${trialDays} dias)` : 'Usuário Padrão'}</span></p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setStep('form')}
                                className="px-4 py-2 text-textMuted hover:text-textMain transition-colors text-sm font-medium"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="bg-primary hover:bg-primaryHover text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {isLoading ? 'Criando...' : 'Confirmar e Gerar'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 'success' && magicLink && (
                    <div className="space-y-6">
                        <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl text-center">
                            <IconCheck className="w-10 h-10 text-green-500 mx-auto mb-2" />
                            <h3 className="text-green-500 font-bold">Magic Link Gerado!</h3>
                            <p className="text-xs text-green-500/80 mt-1">
                                Copie o link abaixo e envie para o usuário. Ele expira em breve e não será mostrado novamente.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-textMuted mb-1 uppercase">Link de Acesso</label>
                            <div className="flex gap-2">
                                <input
                                    readOnly
                                    value={magicLink}
                                    className="w-full bg-surfaceHighlight border border-borderLight rounded-xl px-4 py-3 text-xs font-mono text-textMain focus:outline-none"
                                />
                                <button
                                    onClick={copyToClipboard}
                                    className="bg-surfaceHighlight border border-borderLight hover:bg-surfaceHover text-textMain px-4 rounded-xl transition-colors shrink-0"
                                    title="Copiar"
                                >
                                    <IconCopy className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <button
                                onClick={onSuccess}
                                className="text-primary hover:text-primaryHover text-sm font-medium"
                            >
                                Fechar e Atualizar Lista
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
