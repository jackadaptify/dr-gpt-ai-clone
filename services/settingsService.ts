import { supabase } from '../lib/supabase';

export interface UserSettings {
    user_id?: string;
    custom_instructions: string;
    response_preferences: string;
    theme: 'dark' | 'light' | 'system';
    language: string;
}

export const settingsService = {
    async getUserSettings(userId: string): Promise<UserSettings | null> {
        const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            console.error('Error fetching settings:', error);
            return null;
        }

        return data as UserSettings;
    },

    async updateUserSettings(userId: string, settings: Partial<UserSettings>) {
        // Check if exists first
        const existing = await this.getUserSettings(userId);

        if (existing) {
            const { error } = await supabase
                .from('user_settings')
                .update({ ...settings, updated_at: new Date().toISOString() })
                .eq('user_id', userId);

            if (error) throw error;
        } else {
            const { error } = await supabase
                .from('user_settings')
                .insert({
                    user_id: userId,
                    custom_instructions: settings.custom_instructions || '',
                    response_preferences: settings.response_preferences || '',
                    theme: settings.theme || 'dark',
                    language: settings.language || 'pt-BR'
                });

            if (error) throw error;
        }
    }
};
