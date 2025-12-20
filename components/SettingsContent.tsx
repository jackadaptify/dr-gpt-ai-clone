
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { settingsService, UserSettings } from '../services/settingsService';
import { IconCheck, IconStar, IconSettings, IconBrain } from './Icons';
import { SubscriptionPlansSection } from './SubscriptionPlansSection';

interface SettingsContentProps {
    activeTab: string;
    isDarkMode?: boolean;
    toggleTheme?: () => void;
}

export const SettingsContent: React.FC<SettingsContentProps> = ({ activeTab, isDarkMode, toggleTheme }) => {
    const { user } = useAuth();

    // Raw settings from DB
    const [settings, setSettings] = useState<UserSettings>({
        custom_instructions: '',
        response_preferences: '',
        theme: isDarkMode ? 'dark' : 'light',
        language: 'pt-BR'
    });

    // Form State for Personalization (Dr. GPT Pro)
    const [nickname, setNickname] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [otherSpecialty, setOtherSpecialty] = useState('');
    const [professionalFocus, setProfessionalFocus] = useState('');
    const [specificPreference, setSpecificPreference] = useState('');

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Hydrate from LocalStorage on mount
    useEffect(() => {
        const storedNickname = localStorage.getItem('drgpt_nickname');
        const storedSpecialty = localStorage.getItem('drgpt_specialty');
        const storedOtherSpecialty = localStorage.getItem('drgpt_other_specialty');
        const storedFocus = localStorage.getItem('drgpt_focus');
        const storedPreference = localStorage.getItem('drgpt_preference');

        if (storedNickname) setNickname(storedNickname);
        if (storedSpecialty) setSpecialty(storedSpecialty);
        if (storedOtherSpecialty) setOtherSpecialty(storedOtherSpecialty);
        if (storedFocus) setProfessionalFocus(storedFocus);
        if (storedPreference) setSpecificPreference(storedPreference);
    }, []);

    // Load settings and parse into form fields (Supabase sync)
    useEffect(() => {
        if (user) {
            setLoading(true);
            settingsService.getUserSettings(user.id)
                .then(data => {
                    if (data) {
                        setSettings(data);

                        // Parse Custom Instructions
                        const instructions = data.custom_instructions || '';
                        const nameMatch = instructions.match(/Name: (.*?)(\n|$)/);
                        const specialtyMatch = instructions.match(/Specialty: (.*?)(\n|$)/);

                        if (nameMatch) {
                            setNickname(nameMatch[1]);
                            localStorage.setItem('drgpt_nickname', nameMatch[1]);
                        }
                        if (specialtyMatch) {
                            const spec = specialtyMatch[1];
                            const knownSpecialties = ['Cardiologia', 'Dermatologia', 'Clínica Geral', 'Pediatria', 'Ortopedia', 'Neurologia', 'Ginecologia', 'Psiquiatria'];
                            if (knownSpecialties.includes(spec)) {
                                setSpecialty(spec);
                                localStorage.setItem('drgpt_specialty', spec);
                            } else {
                                setSpecialty('Outra');
                                setOtherSpecialty(spec);
                                localStorage.setItem('drgpt_specialty', 'Outra');
                                localStorage.setItem('drgpt_other_specialty', spec);
                            }
                        }

                        // Parse Preferences
                        const preferences = data.response_preferences || '';
                        const focusMatch = preferences.match(/Focus: (.*?)(\n|$)/);
                        const specificMatch = preferences.match(/Preferences: (.*?)(\n|$)/);

                        if (focusMatch) {
                            setProfessionalFocus(focusMatch[1]);
                            localStorage.setItem('drgpt_focus', focusMatch[1]);
                        }
                        if (specificMatch) {
                            setSpecificPreference(specificMatch[1]);
                            localStorage.setItem('drgpt_preference', specificMatch[1]);
                        }
                    }
                })
                .finally(() => setLoading(false));
        }
    }, [user]);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);

        // Save to LocalStorage
        localStorage.setItem('drgpt_nickname', nickname);
        localStorage.setItem('drgpt_specialty', specialty);
        localStorage.setItem('drgpt_other_specialty', otherSpecialty);
        localStorage.setItem('drgpt_focus', professionalFocus);
        localStorage.setItem('drgpt_preference', specificPreference);

        // Construct formatted strings for DB
        const finalSpecialty = specialty === 'Outra' ? otherSpecialty : specialty;
        const formattedInstructions = `Name: ${nickname}\nSpecialty: ${finalSpecialty}`;
        const formattedPreferences = `Focus: ${professionalFocus}\nPreferences: ${specificPreference}`;

        const newSettings = {
            ...settings,
            custom_instructions: formattedInstructions,
            response_preferences: formattedPreferences
        };

        try {
            await settingsService.updateUserSettings(user.id, newSettings);
            setSettings(newSettings);
            // Could add a toast here via prop or context
        } catch (error) {
            console.error('Error saving settings:', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-emerald-500 min-h-[50vh]">
                <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                {activeTab === 'personalization' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300 max-w-3xl mx-auto">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-textMain">Personalização</h2>
                            <p className="text-textMuted">Adapte o Dr. GPT ao seu estilo de prática médica.</p>
                        </div>

                        {/* Field 1: Nickname */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-textMain">Como o Dr. GPT deve te chamar?</label>
                            <input
                                type="text"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                className="w-full bg-surfaceHighlight border border-borderLight rounded-xl px-4 py-3 text-sm text-textMain focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-textMuted"
                                placeholder="Ex: Dr. Jack"
                            />
                        </div>

                        {/* Field 2: Specialty */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-textMain">Especialidade Médica</label>
                            <div className="relative">
                                <select
                                    value={specialty}
                                    onChange={(e) => setSpecialty(e.target.value)}
                                    className="w-full bg-surfaceHighlight border border-borderLight rounded-xl px-4 py-3 text-sm text-textMain focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="" disabled>Selecione sua área...</option>
                                    <option value="Cardiologia">Cardiologia</option>
                                    <option value="Dermatologia">Dermatologia</option>
                                    <option value="Clínica Geral">Clínica Geral</option>
                                    <option value="Pediatria">Pediatria</option>
                                    <option value="Ortopedia">Ortopedia</option>
                                    <option value="Neurologia">Neurologia</option>
                                    <option value="Ginecologia">Ginecologia</option>
                                    <option value="Psiquiatria">Psiquiatria</option>
                                    <option value="Outra">Outra Especialidade</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-textMuted">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>

                            {/* Conditional Input for 'Outra' */}
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${specialty === 'Outra' ? 'max-h-20 opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
                                <input
                                    type="text"
                                    value={otherSpecialty}
                                    onChange={(e) => setOtherSpecialty(e.target.value)}
                                    className="w-full bg-surfaceHighlight border border-borderLight rounded-xl px-4 py-3 text-sm text-textMain focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder-textMuted"
                                    placeholder="Digite sua especialidade..."
                                />
                            </div>
                        </div>

                        {/* Field 3: Professional Focus */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold text-textMain">Qual seu objetivo principal?</label>
                            <div className="relative">
                                <select
                                    value={professionalFocus}
                                    onChange={(e) => setProfessionalFocus(e.target.value)}
                                    className="w-full bg-surfaceHighlight border border-borderLight rounded-xl px-4 py-3 text-sm text-textMain focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="" disabled>Selecione o foco...</option>
                                    <option value="Auxílio Clínico & Segunda Opinião">Auxílio Clínico & Segunda Opinião</option>
                                    <option value="Burocracia & Documentação">Burocracia & Documentação (Laudos/Atestados)</option>
                                    <option value="Estudos & Atualização Científica">Estudos & Atualização Científica</option>
                                    <option value="Marketing Médico & Redes Sociais">Marketing Médico & Redes Sociais</option>
                                    <option value="Gestão de Clínica">Gestão de Clínica</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-textMuted">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Field 4: Specific Preference (Controlled) */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-baseline">
                                <label className="text-sm font-semibold text-textMain">Alguma preferência específica?</label>
                                <span className={`text-xs ${specificPreference.length > 180 ? 'text-red-400' : 'text-textMuted'}`}>
                                    {specificPreference.length}/200
                                </span>
                            </div>
                            <textarea
                                value={specificPreference}
                                onChange={(e) => {
                                    if (e.target.value.length <= 200) {
                                        setSpecificPreference(e.target.value);
                                    }
                                }}
                                className="w-full h-24 bg-surfaceHighlight border border-borderLight rounded-xl p-4 text-sm text-textMain focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all resize-none placeholder-textMuted"
                                placeholder="Ex: Cite sempre fontes da SBC; Prefiro respostas em tópicos..."
                            />
                        </div>

                        {/* Save Button for Personalization */}
                        <div className="pt-4 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={saving || loading}
                                className="px-6 py-2.5 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <IconCheck className="w-4 h-4" />
                                        Salvar Alterações
                                    </>
                                )}
                            </button>
                        </div>

                    </div>
                )}

                {activeTab === 'subscription' && (
                    <div className="max-w-6xl mx-auto w-full">
                        <div className="space-y-2 mb-8">
                            <h2 className="text-2xl font-bold text-textMain">Assinatura e Planos</h2>
                            <p className="text-textMuted">Gerencie seu plano e método de pagamento.</p>
                        </div>
                        <SubscriptionPlansSection />
                    </div>
                )}

                {activeTab === 'general' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300 max-w-3xl mx-auto">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-textMain">Configurações Gerais</h2>
                            <p className="text-textMuted">Preferências de aparência e sistema.</p>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-surfaceHighlight rounded-xl border border-borderLight shadow-sm">
                            <div>
                                <label className="block font-medium text-textMain mb-1">Tema</label>
                                <p className="text-sm text-textMuted">Escolha a aparência da interface</p>
                            </div>
                            {toggleTheme ? (
                                <select
                                    value={isDarkMode ? 'dark' : 'light'}
                                    onChange={(e) => {
                                        toggleTheme();
                                    }}
                                    className="bg-surface border border-borderLight rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none focus:border-emerald-500"
                                >
                                    <option value="dark">Escuro</option>
                                    <option value="light">Claro</option>
                                </select>
                            ) : (
                                <p className="text-sm text-textMuted">Controle pelo menu lateral</p>
                            )}
                        </div>

                        <div className="flex items-center justify-between p-4 bg-surfaceHighlight rounded-xl border border-borderLight shadow-sm">
                            <div>
                                <label className="block font-medium text-textMain mb-1">Idioma</label>
                                <p className="text-sm text-textMuted">Idioma da interface</p>
                            </div>
                            <select
                                value={settings.language}
                                onChange={(e) => {
                                    // For now just local state, implement global language later
                                    setSettings({ ...settings, language: e.target.value })
                                }}
                                className="bg-surface border border-borderLight rounded-lg px-3 py-2 text-sm text-textMain focus:outline-none focus:border-emerald-500"
                            >
                                <option value="pt-BR">Português (Brasil)</option>
                                <option value="en-US">English (US)</option>
                            </select>
                        </div>
                    </div>
                )}

                {activeTab === 'data' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300 max-w-3xl mx-auto">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-textMain">Controle de Dados</h2>
                            <p className="text-textMuted">Gerencie seus dados e privacidade.</p>
                        </div>

                        <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl">
                            <h4 className="font-bold text-red-400 mb-2">Zona de Perigo</h4>
                            <p className="text-sm text-textMuted mb-4">
                                Ações irreversíveis que afetam seus dados.
                            </p>
                            <div className="flex items-center justify-between">
                                <div>
                                    <label className="block font-medium text-textMain mb-1">Limpar todas as conversas</label>
                                    <p className="text-sm text-textMuted">Isso apagará todo o histórico permanentemente.</p>
                                </div>
                                <button className="px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm hover:bg-red-500/20 transition-colors font-medium">
                                    Limpar tudo
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
