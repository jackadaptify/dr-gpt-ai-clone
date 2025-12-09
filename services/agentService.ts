import { supabase } from '../lib/supabase';
import { Agent } from '../types';

// Helper to map DB row to Agent type
const mapToAgent = (row: any): Agent => ({
    id: row.id,
    name: row.name,
    description: row.description,
    systemPrompt: row.system_prompt,
    modelId: row.model_id,
    icon: row.icon,
    color: row.color,
    is_active: row.is_active,
    created_at: row.created_at,
    role: 'Assistant', // Default role as it's not in DB yet
    iceBreakers: row.ice_breakers || [],
    capabilities: row.capabilities || [],
    knowledgeFiles: row.knowledge_files || [],
    avatarUrl: row.avatar_url,
    avatarPosition: row.avatar_position || 'center'
});

// Helper to map Agent type to DB row
const mapToDb = (agent: Partial<Agent>) => {
    const dbObj: any = { ...agent };
    if (agent.systemPrompt) {
        dbObj.system_prompt = agent.systemPrompt;
        delete dbObj.systemPrompt;
    }
    if (agent.modelId) {
        dbObj.model_id = agent.modelId;
        delete dbObj.modelId;
    }
    if (agent.iceBreakers) {
        dbObj.ice_breakers = agent.iceBreakers;
        delete dbObj.iceBreakers;
    }
    if (agent.capabilities) {
        dbObj.capabilities = agent.capabilities;
        delete dbObj.capabilities;
    }
    if (agent.knowledgeFiles) {
        dbObj.knowledge_files = agent.knowledgeFiles;
        delete dbObj.knowledgeFiles;
    }
    if (agent.avatarUrl) {
        dbObj.avatar_url = agent.avatarUrl;
        delete dbObj.avatarUrl;
    }
    if (agent.avatarPosition) {
        dbObj.avatar_position = agent.avatarPosition;
        delete dbObj.avatarPosition;
    }
    // Remove fields not in DB
    delete dbObj.role;
    delete dbObj.id; // ID is handled by Supabase or URL param
    delete dbObj.created_at; // Managed by DB

    return dbObj;
};

export const agentService = {
    // Fetch all agents (Admin only)
    async getAllAgents() {
        const { data, error } = await supabase
            .from('agents')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(mapToAgent);
    },

    // Fetch only active agents (For users)
    async getActiveAgents() {
        const { data, error } = await supabase
            .from('agents')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (error) throw error;
        return (data || []).map(mapToAgent);
    },

    // Create a new agent (Admin only)
    async createAgent(agent: Omit<Agent, 'id'>) {
        const dbPayload = mapToDb(agent);

        const { data, error } = await supabase
            .from('agents')
            .insert([dbPayload])
            .select()
            .single();

        if (error) throw error;
        return mapToAgent(data);
    },

    // Update an agent (Admin only)
    async updateAgent(id: string, updates: Partial<Agent>) {
        const dbPayload = mapToDb(updates);

        const { data, error } = await supabase
            .from('agents')
            .update(dbPayload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return mapToAgent(data);
    },

    // Delete an agent (Admin only)
    async deleteAgent(id: string) {
        const { error } = await supabase
            .from('agents')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
