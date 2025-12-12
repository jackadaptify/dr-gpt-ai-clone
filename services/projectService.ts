import { supabase } from '../lib/supabase';
import { Folder } from '../types';

export const projectService = {
    async getProjects(): Promise<Folder[]> {
        const { data, error } = await supabase
            .from('folders')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching projects:', error);
            return [];
        }
        return data || [];
    },

    async createProject(name: string): Promise<{ project: Folder | null, error: any }> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { project: null, error: 'User not authenticated' };

        const { data, error } = await supabase
            .from('folders')
            .insert({ name, user_id: user.id })
            .select()
            .single();

        if (error) {
            console.error('Error creating project:', error);
            return { project: null, error };
        }
        return { project: data, error: null };
    },

    async deleteProject(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('folders')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting project:', error);
            return false;
        }
        return true;
    },

    async assignChatToProject(chatId: string, projectId: string | null): Promise<boolean> {
        const { error } = await supabase
            .from('chats')
            .update({ folder_id: projectId })
            .eq('id', chatId);

        if (error) {
            console.error('Error adding chat to project:', error);
            return false;
        }
        return true;
    }
};
