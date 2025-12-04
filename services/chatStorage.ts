import { supabase } from '../lib/supabase';
import { ChatSession, Message } from '../types';

export const chatStorage = {
    async getUserChats(): Promise<ChatSession[]> {
        const { data: chats, error } = await supabase
            .from('chats')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching chats:', error);
            return [];
        }

        // For each chat, fetch its messages
        const chatsWithMessages = await Promise.all(chats.map(async (chat) => {
            const { data: messages, error: msgError } = await supabase
                .from('messages')
                .select('*')
                .eq('chat_id', chat.id)
                .order('created_at', { ascending: true });

            if (msgError) {
                console.error(`Error fetching messages for chat ${chat.id}:`, msgError);
                return { ...chat, messages: [] };
            }

            return {
                ...chat,
                modelId: chat.model_used, // Map snake_case to camelCase
                agentId: chat.agent_id,
                updatedAt: new Date(chat.updated_at).getTime(),
                messages: messages.map((msg: any) => ({
                    id: msg.id,
                    role: msg.role,
                    content: msg.content,
                    timestamp: new Date(msg.created_at).getTime(),
                    isStreaming: false
                }))
            };
        }));

        return chatsWithMessages as ChatSession[];
    },

    async createChat(chat: ChatSession) {
        const { error } = await supabase
            .from('chats')
            .insert({
                id: chat.id,
                user_id: (await supabase.auth.getUser()).data.user?.id,
                title: chat.title,
                model_used: chat.modelId,
                agent_id: chat.agentId,
                updated_at: new Date(chat.updatedAt).toISOString()
            });

        if (error) console.error('Error creating chat:', error);
    },

    async updateChat(chatId: string, updates: Partial<ChatSession>) {
        const dbUpdates: any = {
            updated_at: new Date().toISOString()
        };

        if (updates.title) dbUpdates.title = updates.title;
        if (updates.modelId) dbUpdates.model_used = updates.modelId;

        const { error } = await supabase
            .from('chats')
            .update(dbUpdates)
            .eq('id', chatId);

        if (error) console.error('Error updating chat:', error);
    },

    async addMessage(chatId: string, message: Message) {
        const { error } = await supabase
            .from('messages')
            .insert({
                id: message.id,
                chat_id: chatId,
                role: message.role,
                content: message.content,
                created_at: new Date(message.timestamp).toISOString()
            });

        if (error) console.error('Error adding message:', error);

        // Update chat timestamp
        await this.updateChat(chatId, {});
    },

    async deleteChat(chatId: string) {
        const { error } = await supabase
            .from('chats')
            .delete()
            .eq('id', chatId);

        if (error) console.error('Error deleting chat:', error);
    }
};
