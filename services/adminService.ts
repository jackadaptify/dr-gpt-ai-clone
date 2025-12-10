import { supabase } from '../lib/supabase';
import { User } from '../types';

export const adminService = {
    async getStats() {
        const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        const { count: chatsCount } = await supabase.from('chats').select('*', { count: 'exact', head: true });

        // Calculate total tokens (approximate sum)
        const { data: usage } = await supabase.from('usage_logs').select('tokens_input, tokens_output');
        const totalTokens = usage?.reduce((acc, curr) => acc + (curr.tokens_input || 0) + (curr.tokens_output || 0), 0) || 0;

        return {
            usersCount: usersCount || 0,
            chatsCount: chatsCount || 0,
            totalTokens
        };
    },

    async getUsers(): Promise<User[]> {
        // Use the secure RPC function that enforces Admin role check on the server
        const { data, error } = await supabase.rpc('get_all_users');

        if (error) throw error;
        return data as User[];
    },

    async getAppSettings() {
        const { data, error } = await supabase
            .from('app_settings')
            .select('*');

        if (error) throw error;

        const settings: Record<string, any> = {};
        data.forEach(item => {
            settings[item.key] = item.value;
        });
        return settings;
    },

    async updateModelStatus(modelId: string, enabled: boolean) {
        console.log(`AdminService: Updating model ${modelId} to ${enabled}`);
        // Fetch current settings
        const { data, error: fetchError } = await supabase.from('app_settings').select('value').eq('key', 'enabled_models').single();

        if (fetchError && fetchError.code !== 'PGRST116') { // Ignore not found error
            console.error('AdminService: Error fetching settings:', fetchError);
            throw fetchError;
        }

        let models: string[] = data?.value || [];
        console.log('AdminService: Current enabled models:', models);

        if (enabled) {
            if (!models.includes(modelId)) models.push(modelId);
        } else {
            models = models.filter(id => id !== modelId);
        }

        console.log('AdminService: New enabled models list:', models);

        const { error: updateError } = await supabase
            .from('app_settings')
            .upsert({ key: 'enabled_models', value: models }, { onConflict: 'key' });

        if (updateError) {
            console.error('AdminService: Error updating settings:', updateError);
            throw updateError;
        }
        console.log('AdminService: Update successful');
    },

    async logUsage(modelId: string, tokensInput: number, tokensOutput: number) {
        const { error } = await supabase.from('usage_logs').insert({
            user_id: (await supabase.auth.getUser()).data.user?.id,
            model_id: modelId,
            tokens_input: tokensInput,
            tokens_output: tokensOutput
        });
        if (error) console.error('Failed to log usage:', error);
    },

    async updateModelStatusBatch(enabledModels: string[]) {
        const { error } = await supabase
            .from('app_settings')
            .upsert({ key: 'enabled_models', value: enabledModels }, { onConflict: 'key' });

        return { error };
    },

    async getModelCategories() {
        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'model_categories')
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('AdminService: Error fetching model categories:', error);
            return { text: [], image: [], expert: [] };
        }

        return data?.value || { text: [], image: [], expert: [] };
    },

    async updateModelCategories(categories: { text: string[], image: string[], expert: string[] }) {
        const { error } = await supabase
            .from('app_settings')
            .upsert({ key: 'model_categories', value: categories }, { onConflict: 'key' });

        if (error) {
            console.error('AdminService: Error updating model categories:', error);
            throw error;
        }
    }
};
