import React from 'react';

export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Attachment {
  id: string;
  type: 'image' | 'file';
  url: string;
  mimeType: string;
  name: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  attachments?: Attachment[];
  modelId?: string; // Track which model generated this message
}

export interface ChatSession {
  id: string;
  title: string;
  modelId: string;
  agentId?: string; // Optional, as legacy chats might not have one
  messages: Message[];
  updatedAt: number;
  folderId?: string;
}

export interface Folder {
  id: string;
  name: string;
  icon?: React.ReactNode;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role?: 'user' | 'admin';
}

export interface Agent {
  id: string;
  name: string;
  role: string;
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
  provider: 'Google' | 'OpenAI' | 'Anthropic' | 'xAI' | 'DeepSeek' | 'DrPro' | 'Meta';
  modelId: string;
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
    id: 'high-ticket-planner',
    name: 'Construtor de Planos',
    role: 'High-Ticket Strategist',
    description: 'Especialista em criar ofertas de alto valor e estruturar planos de tratamento premium.',
    icon: 'IconDiamond',
    color: 'from-amber-400 to-orange-500',
    systemPrompt: 'Você é um estrategista de negócios focado em medicina de alto ticket. Sua especialidade é ajudar médicos a estruturar, precificar e vender planos de tratamento premium. Foco em valor percebido, experiência do paciente e ancoragem de preço.',
    modelId: 'gemini-2.0-flash'
  },
  {
    id: 'pricing-agent',
    name: 'Agente Precificador',
    role: 'Financial Analyst',
    description: 'Calcula custos, margens e define o preço ideal para maximizar lucros.',
    icon: 'IconCalculator',
    color: 'from-emerald-400 to-green-600',
    systemPrompt: 'Você é um especialista em precificação médica. Ajude a calcular custos de procedimentos, hora clínica, margens de lucro e a definir tabelas de preços estratégicas. Seja analítico e focado em rentabilidade.',
    modelId: 'gemini-2.0-flash'
  },
  {
    id: 'sales-doctor',
    name: 'Médico Vendedor',
    role: 'Sales Expert',
    description: 'Treina scripts de vendas, quebra de objeções e fechamento de consultas.',
    icon: 'IconStethoscope',
    color: 'from-blue-400 to-indigo-600',
    systemPrompt: 'Você é um mentor de vendas para médicos. Ensine técnicas de persuasão ética, scripts para apresentar planos de tratamento, como contornar objeções de preço ("tá caro") e técnicas de fechamento. Use linguagem adequada para o ambiente médico.',
    modelId: 'gemini-2.0-flash'
  },
  {
    id: 'viral-reels',
    name: 'Criador de Reels',
    role: 'Social Media Manager',
    description: 'Gera roteiros de vídeos curtos com ganchos virais e CTAs poderosos.',
    icon: 'IconVideo',
    color: 'from-pink-500 to-rose-600',
    systemPrompt: 'Você é um especialista em marketing viral para redes sociais (Instagram/TikTok) focado na área da saúde. Crie roteiros de Reels com ganchos (hooks) fortes nos primeiros 3 segundos, conteúdo educativo rápido e Call to Actions (CTAs) claros. Mantenha a ética médica.',
    modelId: 'gemini-2.0-flash'
  }
];

export const AVAILABLE_MODELS: AIModel[] = [
  // --- Gemini Series (Google) ---
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Multimodal equilibrado (Geração 2)',
    provider: 'Google',
    modelId: 'google/gemini-2.0-flash-exp:free',
    capabilities: { vision: true, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: true, reasoning: true, upload: true },
    details: {
      function: 'Modelo multimodal equilibrado de segunda geração.',
      inputTypes: ['Áudio', 'Imagens', 'Vídeo', 'Texto'],
      outputTypes: ['Texto'],
      features: ['Free Preview'],
      pricing: { input: 'Grátis', output: 'Grátis' }
    }
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Excelência em raciocínio complexo',
    provider: 'Google',
    modelId: 'google/gemini-pro-1.5',
    capabilities: { vision: true, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: true, reasoning: true, upload: true },
    details: {
      function: 'Modelo de raciocínio avançado.',
      inputTypes: ['Texto', 'Imagens', 'PDF'],
      outputTypes: ['Texto'],
      features: ['1M Context'],
      pricing: { input: '$2.50', output: '$7.50' }
    }
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: 'Rápido e eficiente',
    provider: 'Google',
    modelId: 'google/gemini-flash-1.5',
    capabilities: { vision: true, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: true, reasoning: false, upload: true },
    details: {
      function: 'Modelo rápido e custo-eficiente.',
      inputTypes: ['Texto', 'Imagens'],
      outputTypes: ['Texto'],
      features: ['High Speed'],
      pricing: { input: '$0.075', output: '$0.30' }
    }
  },

  // --- OpenAI Series ---
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Multimodal versátil',
    provider: 'OpenAI',
    modelId: 'openai/gpt-4o',
    capabilities: { vision: true, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: false, reasoning: false, upload: true },
    details: {
      function: 'Modelo flagship da OpenAI.',
      inputTypes: ['Texto', 'Imagem'],
      outputTypes: ['Texto'],
      features: ['Multimodal'],
      pricing: { input: '$2.50', output: '$10.00' }
    }
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Pequeno e eficiente',
    provider: 'OpenAI',
    modelId: 'openai/gpt-4o-mini',
    capabilities: { vision: true, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: false, reasoning: false, upload: true },
    details: {
      function: 'Modelo econômico da OpenAI.',
      inputTypes: ['Texto', 'Imagem'],
      outputTypes: ['Texto'],
      features: ['Efficiency'],
      pricing: { input: '$0.15', output: '$0.60' }
    }
  },
  {
    id: 'o1-preview',
    name: 'OpenAI o1 Preview',
    description: 'Raciocínio profundo',
    provider: 'OpenAI',
    modelId: 'openai/o1-preview',
    capabilities: { vision: false, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: false, reasoning: true, upload: false },
    details: {
      function: 'Modelo focado em raciocínio complexo (STEM).',
      inputTypes: ['Texto'],
      outputTypes: ['Texto'],
      features: ['Reasoning'],
      pricing: { input: '$15', output: '$60' }
    }
  },

  // --- Anthropic Claude Series ---
  {
    id: 'claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    description: 'Alta performance e código',
    provider: 'Anthropic',
    modelId: 'anthropic/claude-3.5-sonnet',
    capabilities: { vision: true, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: false, reasoning: true, upload: true },
    details: {
      function: 'Excelente para codificação e raciocínio.',
      inputTypes: ['Texto', 'Imagem'],
      outputTypes: ['Texto'],
      features: ['Coding'],
      pricing: { input: '$3.00', output: '$15.00' }
    }
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    description: 'Rápido e econômico',
    provider: 'Anthropic',
    modelId: 'anthropic/claude-3-haiku',
    capabilities: { vision: true, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: false, reasoning: false, upload: true },
    details: {
      function: 'Modelo mais rápido da Anthropic.',
      inputTypes: ['Texto', 'Imagem'],
      outputTypes: ['Texto'],
      features: ['Speed'],
      pricing: { input: '$0.25', output: '$1.25' }
    }
  },

  // --- Open Source / Others ---
  {
    id: 'llama-3.1-405b',
    name: 'Llama 3.1 405B',
    description: 'Open Source Frontier',
    provider: 'Meta',
    modelId: 'meta-llama/llama-3.1-405b-instruct',
    capabilities: { vision: false, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: false, reasoning: true, upload: false },
    details: {
      function: 'Modelo open source mais poderoso.',
      inputTypes: ['Texto'],
      outputTypes: ['Texto'],
      features: ['Open Source'],
      pricing: { input: '$2.00', output: '$2.00' }
    }
  },
  {
    id: 'deepseek-coder',
    name: 'DeepSeek Coder V2',
    description: 'Especialista em código',
    provider: 'DeepSeek',
    modelId: 'deepseek/deepseek-coder',
    capabilities: { vision: false, imageGeneration: false, videoGeneration: false, audioGeneration: false, webSearch: false, reasoning: true, upload: false },
    details: {
      function: 'Modelo especializado em programação.',
      inputTypes: ['Texto'],
      outputTypes: ['Texto'],
      features: ['Coding'],
      pricing: { input: '$0.14', output: '$0.28' }
    }
  }
];