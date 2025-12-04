import React, { useState } from 'react';
import AdminLayout from './AdminLayout';
import Dashboard from './Dashboard';
import UsersList from './UsersList';
import { AgentManager } from './AgentManager';
import ModelManager from './ModelManager';

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState('dashboard');

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard />;
            case 'users':
                return <UsersList />;
            case 'agents':
                return <AgentManager />;
            case 'models':
                return <ModelManager />;
            case 'settings':
                return <div className="text-zinc-500">Configurações gerais (em breve)</div>;
            default:
                return <Dashboard />;
        }
    };

    return (
        <AdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
            {renderContent()}
        </AdminLayout>
    );
}
