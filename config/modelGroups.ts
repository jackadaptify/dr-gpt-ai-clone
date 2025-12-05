import { MessageSquare, Image as ImageIcon, Zap, Brain, Crown, Eye } from 'lucide-react';

// 1. Definição das Abas
export const MODEL_TABS = [
    { id: 'text', label: 'Raciocínio & Texto', icon: MessageSquare },
    { id: 'image', label: 'Visual & Design', icon: ImageIcon }
];

// 2. DEPRECATED: Estas listas eram usadas para filtro manual de modelos
// Agora o filtro é DINÂMICO baseado em capabilities.imageGeneration (inferido via architecture.modality da API)
// Mantidas apenas para referência histórica
export const IMAGE_GEN_MODELS = [
    'google/gemini-3-pro-image-preview',
    'black-forest-labs/flux-1-dev',
    'stabilityai/stable-diffusion-xl-base-1.0'
];

export const ALLOWED_IMAGE_GENERATORS = [
    // Flux (Black Forest Labs)
    'black-forest-labs/flux-1-dev',
    'black-forest-labs/flux-1-schnell',
    'black-forest-labs/flux-pro',

    // Stability AI
    'stabilityai/stable-diffusion-xl-base-1.0',
    'stabilityai/sdxl-turbo',
    'stabilityai/stable-diffusion-3-medium',
    'stabilityai/stable-diffusion-3.5-large',

    // Google Imagen (Se houver)
    'google/imagen-3',

    // Recraft / Outros
    'recraft-ai/recraft-v3',
    'midjourney/midjourney',

    // O modelo "Nano Banana" do relatório
    'google/gemini-3-pro-image-preview'
];

// 3. Grupos da Aba TEXTO (Baseado no Relatório Dez/2025)
export const TEXT_GROUPS = [
    {
        id: 'tier-s',
        title: '🏆 Tier S: A Tríade Soberana (Elite)',
        models: [
            {
                id: 'google/gemini-3-pro-preview',
                name: 'Gemini 3 Pro',
                badge: 'Top #1 (Elo 1492)',
                badgeColor: 'bg-blue-600',
                description: 'O Cérebro Multimodal. Contexto de 2M+. Ideal para Antigravity.'
            },
            {
                id: 'anthropic/claude-opus-4-5',
                name: 'Claude Opus 4.5',
                badge: 'Arquiteto',
                badgeColor: 'bg-orange-700',
                description: 'Código perfeito e prosa humana. A opção de luxo ($15/1M).'
            },
            {
                id: 'openai/gpt-5.1',
                name: 'GPT-5.1',
                badge: 'Padrão',
                badgeColor: 'bg-green-600',
                description: 'Robustez corporativa e consistência.'
            }
        ]
    },
    {
        id: 'tier-a',
        title: '⚡ Tier A: Velocidade & Ferramentas',
        models: [
            {
                id: 'x-ai/grok-4-fast',
                name: 'Grok 4.1 Fast',
                badge: 'Agente Rápido',
                badgeColor: 'bg-gray-700'
            },
            {
                id: 'deepseek/deepseek-v3.2',
                name: 'DeepSeek V3.2',
                badge: 'Custo-Benefício',
                badgeColor: 'bg-cyan-600',
                description: 'Inteligência de elite por fração do preço ($0.27).'
            }
        ]
    },
    {
        id: 'legacy',
        title: 'Outros Modelos (Legado)',
        models: [
            { id: 'openai/gpt-4o', name: 'GPT-4o (Legacy)' },
            { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (Legacy)' }
        ]
    }
];

// 4. Grupos da Aba IMAGEM (Vanguarda Visual)
export const IMAGE_GROUPS = [
    {
        id: 'sota-visual',
        title: '🎨 Vanguarda Visual (Design)',
        models: [
            {
                id: 'google/gemini-3-pro-image-preview',
                name: 'Nano Banana Pro',
                badge: 'SOTA UI',
                badgeColor: 'bg-yellow-500',
                description: 'Geração de UI e Assets com texto perfeito.'
            },
            {
                id: 'black-forest-labs/flux-1-dev',
                name: 'Flux 1.0 Dev',
                badge: 'Realismo'
            }
        ]
    }
];

// Helper to get display name quickly
export const getModelDisplayName = (modelId: string): string => {
    const allGroups = [...TEXT_GROUPS, ...IMAGE_GROUPS];
    for (const group of allGroups) {
        const found = group.models.find(m => m.id === modelId);
        if (found) return found.name;
    }
    return modelId; // Fallback
};
