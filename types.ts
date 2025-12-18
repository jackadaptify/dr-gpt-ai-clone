import React from 'react';

export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export type AppMode = 'chat' | 'scribe' | 'antiglosa' | 'justificativa' | 'settings' | 'scribe-review' | 'chat-research';

export interface Attachment {
  id: string;
  type: 'image' | 'file';
  url: string;
  mimeType: string;
  name: string;
  extractedText?: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  attachments?: Attachment[];
  modelId?: string; // Track which model generated this message
  displayContent?: string; // Optional: Show this in UI instead of content
}

export interface ChatSession {
  id: string;
  title: string;
  modelId: string;
  agentId?: string; // Optional, as legacy chats might not have one
  messages: Message[];
  updatedAt: number;
  folderId?: string;
  metadata?: {
    estimated_value?: number;
    patient_name?: string;
    patient_gender?: string;
    [key: string]: any;
  };
}

export interface Folder {
  id: string;
  name: string;
  icon?: React.ReactNode;
}

export interface SubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  currency: string;
  features: Record<string, any>;
  is_active: boolean;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role?: 'user' | 'admin';
  plan?: SubscriptionPlan; // Populated via join or separate fetch
  billing_current_period_end?: string;
  billing_plan_id?: string;
  billing_status?: string;
}

export interface Agent {
  id: string;
  name: string;
  role: string; // Restored role
  description: string;
  icon: string;
  systemPrompt: string;
  color: string;
  modelId: string; // Added modelId
  is_active?: boolean; // Added is_active
  created_at?: string; // Added timestamps
  iceBreakers?: string[]; // New: Conversation starters
  capabilities?: string[]; // New: Enabled capabilities
  knowledgeFiles?: { name: string; type: string; url: string }[]; // New: Uploaded files
  avatarUrl?: string; // New: Custom avatar URL
  avatarPosition?: string; // New: CSS object-position
}

export interface ModelCapabilities {
  vision: boolean;          // Can see images
  imageGeneration: boolean; // Can create images
  videoGeneration: boolean; // Can create videos
  audioGeneration: boolean; // Can create audio
  webSearch: boolean;       // Can search web
  reasoning: boolean;       // Has "Thinking" mode
  upload: boolean;          // Can accept files (PDFs etc)
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  provider: 'Google' | 'OpenAI' | 'Anthropic' | 'xAI' | 'DeepSeek' | 'DrPro' | 'Meta' | 'Mistral' | 'Amazon' | 'Qwen' | 'Prime' | 'Z-AI'; // Expanded providers
  modelId: string;
  category?: string; // New field for grouping
  badge?: string; // New field for badges
  logo?: string; // New field for custom logo URL
  capabilities: ModelCapabilities;
  details?: {
    function: string;
    inputTypes: string[];
    outputTypes: string[];
    features: string[];
    pricing: {
      input: string;
      output: string;
      batch?: string;
      other?: string;
    };
  };
}



export const AVAILABLE_AGENTS: Agent[] = [
  {
    id: 'general',
    name: 'Dr. GPT (Generalista)',
    role: 'Clínico Geral',
    description: 'Assistente médico versátil para diagnóstico, conduta e prescrição geral.',
    icon: 'IconStethoscope',
    color: 'from-emerald-500 to-teal-700',
    modelId: 'anthropic/claude-3.5-haiku',
    systemPrompt: 'Você é o Dr. GPT, um especialista em Medicina Interna e Clínica Geral...',
    is_active: true
  },
  {
    id: 'cardiologist',
    name: 'Cardiologista',
    role: 'Cardiologia',
    description: 'Especialista em saúde cardiovascular, ECG e hemodinâmica.',
    icon: 'IconActivity',
    color: 'from-red-500 to-rose-700',
    modelId: 'anthropic/claude-3.5-haiku',
    systemPrompt: 'Você é um Cardiologista Sênior. Foque em diretrizes da SBC/AHA...'
  },
  {
    id: 'pediatrician',
    name: 'Pediatra',
    role: 'Pediatria',
    description: 'Especialista em saúde infantil e desenvolvimento.',
    icon: 'IconBaby',
    color: 'from-blue-400 to-cyan-600',
    modelId: 'anthropic/claude-3.5-haiku',
    systemPrompt: 'Você é um Pediatra experiente. Ajuste doses por peso/idade...'
  },
  {
    id: 'dermatologist',
    name: 'Dermatologista',
    role: 'Dermatologia',
    description: 'Identificação de lesões de pele e tratamentos tópicos.',
    icon: 'IconSkin',
    color: 'from-pink-500 to-purple-600',
    modelId: 'anthropic/claude-3.5-haiku',
    systemPrompt: 'Você é um Dermatologista. Analise descrições de lesões...'
  },
  {
    id: 'psychiatrist',
    name: 'Psiquiatra',
    role: 'Psiquiatria',
    description: 'Saúde mental, psicofarmacologia e DSM-5.',
    icon: 'IconBrain',
    color: 'from-violet-500 to-indigo-700',
    modelId: 'anthropic/claude-3.5-haiku',
    systemPrompt: 'Você é um Psiquiatra. Foque em diagnósticos do DSM-5 e psicofármacos...'
  }
];

export const AVAILABLE_MODELS: AIModel[] = [
  // --- TIER 1: A ELITE (DESTAQUES) ---
  {
    id: "anthropic/claude-3.5-haiku",
    name: "Claude 3.5 Haiku",
    description: "O modelo mais rápido e inteligente da Anthropic.",
    category: "Elite 🏆",
    badge: "Novo",
    provider: 'Anthropic',
    modelId: 'anthropic/claude-3.5-haiku',
    capabilities: { vision: true, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: false, reasoning: true, upload: true }
  },
  {
    id: "openai/gpt-5.2-pro",
    name: "GPT-5.2 Pro",
    description: "Inteligência máxima. O estado da arte.",
    category: "Elite 🏆",
    badge: "Recomendado",
    provider: 'OpenAI',
    modelId: 'openai/gpt-5.2-pro',
    capabilities: { vision: true, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: true, reasoning: true, upload: true }
  },
  {
    id: "openai/gpt-5.2",
    name: "GPT-5.2",
    description: "Equilíbrio perfeito entre velocidade e IQ.",
    category: "Elite 🏆",
    provider: 'OpenAI',
    modelId: 'openai/gpt-5.2',
    capabilities: { vision: true, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: true, reasoning: true, upload: true }
  },
  {
    id: "google/gemini-3-pro-preview",
    name: "Gemini 3 Pro",
    description: "Contexto Infinito (1M+ tokens). Lê livros inteiros.",
    category: "Elite 🏆",
    badge: "Docs Heavy",
    provider: 'Google',
    modelId: 'google/gemini-3-pro-preview',
    capabilities: { vision: true, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: true, reasoning: true, upload: true }
  },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    description: "A melhor escrita humana e empatia do mercado.",
    category: "Elite 🏆",
    provider: 'Anthropic',
    modelId: 'anthropic/claude-3.5-sonnet',
    capabilities: { vision: true, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: false, reasoning: true, upload: true }
  },
  {
    id: "deepseek/deepseek-v3.2",
    name: "DeepSeek V3.2",
    description: "Raciocínio avançado com custo eficiente.",
    category: "Elite 🏆",
    provider: 'DeepSeek',
    modelId: 'deepseek/deepseek-v3.2',
    capabilities: { vision: false, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: false, reasoning: true, upload: true }
  },
  {
    id: "x-ai/grok-4.1",
    name: "Grok 4.1",
    description: "A IA da xAI. Acesso a dados em tempo real.",
    category: "Elite 🏆",
    provider: 'xAI',
    modelId: 'x-ai/grok-4.1',
    capabilities: { vision: true, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: true, reasoning: true, upload: false }
  },

  // --- TIER 2: RACIOCÍNIO (THINKING MODELS) ---
  {
    id: "deepseek/deepseek-v3.2-speciale",
    name: "DeepSeek Speciale",
    description: "Supera GPT-5 em lógica pura e diagnóstico.",
    category: "Raciocínio Clínico 🧠",
    provider: 'DeepSeek',
    modelId: 'deepseek/deepseek-v3.2-speciale',
    capabilities: { vision: false, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: false, reasoning: true, upload: true }
  },
  {
    id: "openai/o3",
    name: "OpenAI o3",
    description: "Pensa antes de responder. Para casos complexos.",
    category: "Raciocínio Clínico 🧠",
    provider: 'OpenAI',
    modelId: 'openai/o3',
    capabilities: { vision: true, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: false, reasoning: true, upload: true }
  },
  {
    id: "prime-intellect/intellect-3",
    name: "Intellect-3",
    description: "Otimizado para Matemática e Ciências.",
    category: "Raciocínio Clínico 🧠",
    provider: 'Prime',
    modelId: 'prime-intellect/intellect-3',
    capabilities: { vision: false, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: false, reasoning: true, upload: false }
  },

  // --- TIER 3: ESPECIALISTAS (CÓDIGO & VISÃO) ---
  {
    id: "openai/gpt-5.1-codex-max",
    name: "GPT-5.1 Codex",
    description: "Especialista em criar planilhas e scripts.",
    category: "Ferramentas 🛠️",
    provider: 'OpenAI',
    modelId: 'openai/gpt-5.1-codex-max',
    capabilities: { vision: false, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: false, reasoning: true, upload: true }
  },
  {
    id: "mistralai/devstral-2-2512",
    name: "Devstral 2",
    description: "O melhor para automação e código.",
    category: "Ferramentas 🛠️",
    provider: 'Mistral',
    modelId: 'mistralai/devstral-2-2512',
    capabilities: { vision: false, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: false, reasoning: true, upload: true }
  },
  {
    id: "z-ai/glm-4.6v",
    name: "GLM 4.6 Vision",
    description: "Visão computacional avançada para exames.",
    category: "Ferramentas 🛠️",
    provider: 'Z-AI',
    modelId: 'z-ai/glm-4.6v',
    capabilities: { vision: true, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: false, reasoning: true, upload: true }
  },

  // --- TIER 4: VOLUME & VELOCIDADE (SPEED) ---
  {
    id: "openai/gpt-5.2-chat",
    name: "GPT-5.2 Instant",
    description: "Respostas imediatas para o dia a dia.",
    category: "Velocidade ⚡",
    provider: 'OpenAI',
    modelId: 'openai/gpt-5.2-chat',
    capabilities: { vision: false, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: false, reasoning: false, upload: true }
  },
  {
    id: "mistralai/mistral-large-3-2512",
    name: "Mistral Large 3",
    description: "Potência europeia. Alta precisão.",
    category: "Velocidade ⚡",
    provider: 'Mistral',
    modelId: 'mistralai/mistral-large-3-2512',
    capabilities: { vision: false, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: false, reasoning: false, upload: true }
  },
  {
    id: "meta-llama/llama-3.1-405b-instruct",
    name: "Llama 3.1 405B",
    description: "O maior modelo Open Source do mundo.",
    category: "Open Source 🔓",
    provider: 'Meta',
    modelId: 'meta-llama/llama-3.1-405b-instruct',
    capabilities: { vision: false, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: false, reasoning: true, upload: false }
  },
  {
    id: "meta-llama/llama-3.1-70b-instruct",
    name: "Llama 3.1 70B",
    description: "Rápido e eficiente.",
    category: "Open Source 🔓",
    provider: 'Meta',
    modelId: 'meta-llama/llama-3.1-70b-instruct',
    capabilities: { vision: false, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: false, reasoning: true, upload: false }
  },
  {
    id: "mistralai/ministral-3-14b-2512",
    name: "Ministral 14B",
    description: "Ultrarrapido para notas simples.",
    category: "Velocidade ⚡",
    provider: 'Mistral',
    modelId: 'mistralai/ministral-3-14b-2512',
    capabilities: { vision: false, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: false, reasoning: false, upload: true }
  },
  {
    id: "amazon/nova-2-lite",
    name: "Nova 2 Lite",
    description: "Robustez AWS com baixo custo.",
    category: "Velocidade ⚡",
    provider: 'Amazon',
    modelId: 'amazon/nova-2-lite',
    capabilities: { vision: false, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: false, reasoning: false, upload: true }
  },
  {
    id: "google/gemini-flash-1.5",
    name: "Gemini Flash 1.5",
    description: "O melhor custo-benefício para volume.",
    category: "Velocidade ⚡",
    provider: 'Google',
    modelId: 'google/gemini-flash-1.5',
    capabilities: { vision: true, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: true, reasoning: false, upload: true }
  },
  {
    id: "qwen/qwen-2.5-72b-instruct",
    name: "Qwen 2.5 72B",
    description: "Performance surpreendente em lógica.",
    category: "Velocidade ⚡",
    provider: 'Qwen',
    modelId: 'qwen/qwen-2.5-72b-instruct',
    capabilities: { vision: false, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: false, reasoning: true, upload: true }
  }
];