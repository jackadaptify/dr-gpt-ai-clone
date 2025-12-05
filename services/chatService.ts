import { Message, ChatSession, Role } from '../types';
import { createOpenRouterChatStream, generateOpenRouterImage, generateOpenRouterMedia } from './openRouterService';
import { supabase } from '../lib/supabase';

export const loadChatHistory = async (userId: string): Promise<ChatSession[]> => {
    console.log('Loading chats for user:', userId);
    const { data: chats, error } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading chats:', error);
        return [];
    }

    console.log('Found chats:', chats?.length);

    return chats.map(chat => ({
        id: chat.id,
        title: chat.title,
        modelId: chat.model_id || 'gpt-4o',
        messages: [], // 🚀 Lazy Load: Start empty
        updatedAt: new Date(chat.created_at).getTime()
    }));
};

export const loadMessagesForChat = async (chatId: string): Promise<Message[]> => {
    console.log(`Loading messages for chat ${chatId}...`);
    const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: false }) // Get latest first
        .limit(50); // Load last 50 messages

    if (error) {
        console.error(`Error loading messages for chat ${chatId}:`, error);
        return [];
    }

    return messages.reverse().map((m: any) => ({
        id: m.id,
        role: m.role as Role,
        content: m.content,
        timestamp: new Date(m.created_at).getTime(),
        isStreaming: false,
        modelId: m.model_id
    }));
};

export const createChat = async (chat: ChatSession) => {
    console.log('Creating chat:', chat.id);
    const { error } = await supabase
        .from('chats')
        .insert({
            id: chat.id,
            user_id: (await supabase.auth.getUser()).data.user?.id,
            title: chat.title,
            model_id: chat.modelId,
            created_at: new Date(chat.updatedAt).toISOString()
        });

    if (error) {
        console.error('Error creating chat:', error);
        throw error;
    }
};

export const updateChat = async (chatId: string, updates: Partial<ChatSession>) => {
    const dbUpdates: any = {};
    if (updates.title) dbUpdates.title = updates.title;
    if (updates.modelId) dbUpdates.model_id = updates.modelId;
    if (updates.updatedAt) dbUpdates.updated_at = new Date(updates.updatedAt).toISOString();

    if (Object.keys(dbUpdates).length === 0) return;

    const { error } = await supabase
        .from('chats')
        .update(dbUpdates)
        .eq('id', chatId);

    if (error) {
        console.error('Error updating chat:', error);
    }
};

export const saveMessage = async (chatId: string, message: Message) => {
    console.log('Saving message to chat:', chatId, message.id);
    const { error } = await supabase
        .from('messages')
        .insert({
            id: message.id,
            chat_id: chatId,
            role: message.role,
            content: message.content,
            created_at: new Date(message.timestamp).toISOString(),
            model_id: message.modelId // Save model_id
        });

    if (error) {
        console.error('Error saving message:', error);
    }
};

export const streamChatResponse = async (
    modelId: string,
    history: Message[],
    newMessage: string,
    onChunk: (text: string) => void,
    systemPrompt?: string,
    tools?: { webSearch?: boolean; imageGeneration?: boolean },
    chatId?: string,
    userProfile?: {
        nickname?: string;
        specialty?: string;
        goal?: string;
        customInstructions?: string;
    }
): Promise<string> => {
    // Check for media generation models
    const isImageModel = modelId.includes('image') || modelId.includes('flux') || modelId.includes('dall-e');
    const isVideoModel = modelId.includes('video') || modelId.includes('luma') || modelId.includes('kling') || modelId.includes('veo') || modelId.includes('sora');

    // Override detection if imageGeneration tool is explicitly enabled
    const shouldGenerateImage = tools?.imageGeneration || isImageModel;

    let fullResponse = '';

    // Fetch User Settings for Personalization
    // Priority: Passed userProfile (from LS) > DB Settings > Defaults
    let finalSystemPrompt = systemPrompt || '';

    // Default values
    let userNickname = userProfile?.nickname || 'Dr.';
    let userSpecialty = userProfile?.specialty || 'General Medicine';
    let userGoal = userProfile?.goal || 'Clinical Assistance';
    let customInstructions = userProfile?.customInstructions || '';

    // If profile is missing, try to fetch from DB as fallback
    if (!userProfile) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: settings } = await supabase
                    .from('user_settings')
                    .select('custom_instructions, response_preferences')
                    .eq('user_id', user.id)
                    .single();

                if (settings) {
                    // Parse Custom Instructions
                    const instructions = settings.custom_instructions || '';
                    const nameMatch = instructions.match(/Name: (.*?)(\n|$)/);
                    const specialtyMatch = instructions.match(/Specialty: (.*?)(\n|$)/);

                    if (nameMatch) userNickname = nameMatch[1];
                    if (specialtyMatch) userSpecialty = specialtyMatch[1];

                    // Parse Response Preferences
                    const preferences = settings.response_preferences || '';
                    const focusMatch = preferences.match(/Focus: (.*?)(\n|$)/);
                    const specificMatch = preferences.match(/Preferences: (.*?)(\n|$)/);

                    if (focusMatch) userGoal = focusMatch[1];
                    if (specificMatch) customInstructions = specificMatch[1];
                }
            }
        } catch (err) {
            console.warn('Failed to load user settings for personalization:', err);
        }
    }

    // Construct Dynamic System Prompt
    const personalizationPrompt = `
Você é o Dr. GPT, um assistente de IA avançado para profissionais de saúde.

PERFIL DO USUÁRIO:
- Nome: ${userNickname}
- Especialidade: ${userSpecialty}
- Objetivo Atual: ${userGoal}

INSTRUÇÕES:
- Dirija-se ao usuário pelo nome/título frequentemente.
- Adapte todas as respostas especificamente para um especialista em ${userSpecialty}.
- Se o objetivo for ${userGoal}, priorize funcionalidades relacionadas a isso (ex: se 'Marketing', use tom persuasivo; se 'Clínico', use tom médico formal).
${customInstructions}
`;
    finalSystemPrompt = personalizationPrompt + (finalSystemPrompt ? `\n\n${finalSystemPrompt}` : '');

    let contentToSave = '';

    if (shouldGenerateImage) {
        const result = await generateOpenRouterImage(modelId, newMessage, onChunk);
        fullResponse = result.display;
        contentToSave = result.save;
    } else if (isVideoModel) {
        fullResponse = await generateOpenRouterMedia(modelId, newMessage, onChunk);
        contentToSave = fullResponse;
    } else {
        // Default to Chat/Text
        fullResponse = await createOpenRouterChatStream(modelId, history, newMessage, onChunk, finalSystemPrompt);
        contentToSave = fullResponse;
    }

    // Save to Supabase if chatId is provided
    if (chatId) {
        await saveMessage(chatId, {
            id: crypto.randomUUID(),
            role: Role.MODEL,
            content: contentToSave, // Save the Base64 version to DB
            timestamp: Date.now(),
            modelId: modelId // Save the model that generated this response
        });
    }

    return fullResponse; // Return the Blob URL version to UI
};
