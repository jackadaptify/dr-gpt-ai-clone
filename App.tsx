import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useOutletContext } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './components/Auth/AuthPage';
import InviteSignupPage from './components/Auth/InviteSignupPage';
import SignupPaymentPage from './components/Auth/SignupPaymentPage';
import UpdatePasswordPage from './components/Auth/UpdatePasswordPage';
import PaywallPage from './components/Auth/PaywallPage';
import AdminPage from './components/Admin/AdminPage';
import { ChatProvider } from './src/contexts/ChatContext';
import { Toaster } from 'react-hot-toast';
import DashboardLayout from './src/layouts/DashboardLayout';
import InstallPWA from './components/InstallPWA';

// Pages
import ChatPage from './src/pages/ChatPage';
import ResearchPage from './src/pages/research/ResearchPage';
import ScribePage from './src/pages/ScribePage';
import { SettingsContent } from './components/SettingsContent';

// Wrapper Components to Bridge Context
const ChatPageWrapper = () => {
    const ctx = useOutletContext<any>();
    return (
        <ChatPage
            isDarkMode={ctx.isDarkMode}
            sidebarOpen={ctx.sidebarOpen}
            setSidebarOpen={ctx.setSidebarOpen}
            activeMode="chat"
            user={ctx.user}
            handleMicClick={ctx.handleMicClick}
            isListening={ctx.isListening}
            hasMicSupport={ctx.hasMicSupport}
        />
    );
};

const ResearchPageWrapper = () => {
    const ctx = useOutletContext<any>();
    return (
        <ResearchPage
            isDarkMode={ctx.isDarkMode}
            user={ctx.user}
            toggleSidebar={() => ctx.setSidebarOpen(!ctx.sidebarOpen)}
        />
    );
};

const ScribePageWrapper = () => {
    const ctx = useOutletContext<any>();
    return (
        <ScribePage
            isDarkMode={ctx.isDarkMode}
            activeMode={ctx.isScribeReview ? 'scribe-review' : 'scribe'}
            onGenerate={ctx.handleScribeGenerate}
            onSave={ctx.handleScribeSave}
            onClose={ctx.handleNewChat}
            toggleSidebar={() => ctx.setSidebarOpen(!ctx.sidebarOpen)}
            onOpenSettings={() => ctx.navigate('/settings')}
            scribeContent={ctx.scribeContent}
            setScribeContent={ctx.setScribeContent}
            typewriterTrigger={ctx.typewriterTrigger}
            reviewTitle={ctx.reviewTitle}
        >
            {ctx.isScribeReview && (
                <ChatPage
                    isDarkMode={ctx.isDarkMode}
                    sidebarOpen={false}
                    setSidebarOpen={ctx.setSidebarOpen}
                    activeMode="scribe-review"
                    user={ctx.user}
                    handleMicClick={ctx.handleMicClick}
                    isListening={ctx.isListening}
                    hasMicSupport={ctx.hasMicSupport}
                    scribeContent={ctx.scribeContent}
                    setScribeContent={ctx.setScribeContent}
                    handleScribeUpdate={ctx.handleScribeUpdate}
                />
            )}
        </ScribePage>
    );
};

const SettingsPageWrapper = () => {
    const ctx = useOutletContext<any>();
    // Map internal tab to SettingsContent tab
    const mapTab = (t: string) => {
        switch (t) {
            case 'profile': return 'personalization';
            case 'subscription': return 'subscription';
            case 'appearance': return 'general';
            case 'security': return 'data';
            default: return 'personalization';
        }
    };

    return (
        <SettingsContent
            isDarkMode={ctx.isDarkMode}
            activeTab={mapTab(ctx.settingsTab)}
            toggleTheme={ctx.toggleTheme}
        />
    );
};

// Auth Guard
function RequireAuth({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const navigate = React.useRef(useOutletContext<any>()?.navigate); // Won't work here, use Navigate component or window
    // We can use a forceUpdate or just let the effect trigger a state change that causes re-render?
    const [now, setNow] = React.useState(new Date());

    React.useEffect(() => {
        const timer = setInterval(() => {
            setNow(new Date());
        }, 60000); // Check every minute
        return () => clearInterval(timer);
    }, []);

    if (loading) return <div className="flex items-center justify-center h-screen bg-background"><div className="animate-spin h-8 w-8 border-4 border-emerald-500 rounded-full border-t-transparent"></div></div>;
    if (!user) return <Navigate to="/login" replace />;

    const isSubscribed = !!user.subscription_status;
    const isTrialActive = user.trial_status === 'active';
    // Check if trial is expired
    // We use 'now' to ensure it updates even without parent re-renders
    const isTrialExpired = user.trial_ends_at ? new Date(user.trial_ends_at) < now : true;

    // Strict check: If not subscribed, and (trial is not active OR trial is expired), redirect.
    // This covers normal users (no trial) and trial users (expired).
    if (!isSubscribed) {
        if (!isTrialActive || isTrialExpired) {
            return <Navigate to="/paywall" replace />;
        }
    }

    return children;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (user) return <Navigate to="/copilot" replace />;
    return children;
}

function SmartEntry() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-background">
                <div className="animate-spin h-8 w-8 border-4 border-emerald-500 rounded-full border-t-transparent"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const isSubscribed = !!user.subscription_status;
    const isTrialActive = user.trial_status === 'active';
    const isTrialExpired = user.trial_ends_at ? new Date(user.trial_ends_at) < new Date() : true;

    if (!isSubscribed) {
        if (!isTrialActive || isTrialExpired) {
            return <Navigate to="/paywall" replace />;
        }
    }

    return <Navigate to="/copilot" replace />;
}

export default function App() {
    return (
        <AuthProvider>
            <ChatProvider>
                <Toaster />
                <InstallPWA />
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<SmartEntry />} />
                        <Route path="/login" element={<PublicRoute><AuthPage initialMode="login" /></PublicRoute>} />
                        <Route path="/signup/invite" element={<PublicRoute><InviteSignupPage /></PublicRoute>} />
                        <Route path="/signup/payment" element={<PublicRoute><SignupPaymentPage /></PublicRoute>} />
                        <Route path="/reset-password" element={<UpdatePasswordPage />} />
                        <Route path="/paywall" element={<PaywallPage />} />

                        {/* Dashboard Routes with Layout */}
                        <Route element={
                            <RequireAuth>
                                <DashboardLayout />
                            </RequireAuth>
                        }>
                            <Route path="copilot" element={<ChatPageWrapper />} />
                            <Route path="research" element={<ResearchPageWrapper />} />
                            <Route path="transcribe" element={<ScribePageWrapper />} />
                            <Route path="settings" element={<SettingsPageWrapper />} />
                            <Route path="admin" element={<AdminPage />} />
                        </Route>

                        {/* Fallback */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </BrowserRouter>
            </ChatProvider>
        </AuthProvider>
    );
}