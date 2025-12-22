import React from 'react';
import ScribeView from '../../components/ScribeView';
import ScribeReview from '../../components/Scribe/ScribeReview';

interface ScribePageProps {
    isDarkMode: boolean;
    activeMode: string;
    // Record Mode Props
    onGenerate: (consultation: string, thoughts: string, patientName: string, patientGender: string, audioBlob?: Blob, scenario?: string) => void;
    toggleSidebar: () => void;
    onOpenSettings: () => void;
    // Review Mode Props
    scribeContent?: string;
    setScribeContent?: (content: string) => void;
    typewriterTrigger?: { content: string; timestamp: number } | null;
    reviewTitle?: string;
    onSave?: () => void;
    onClose?: () => void;
    children?: React.ReactNode;
}

export default function ScribePage({
    isDarkMode,
    activeMode,
    onGenerate,
    toggleSidebar,
    onOpenSettings,
    scribeContent,
    setScribeContent,
    typewriterTrigger,
    reviewTitle,
    onSave,
    onClose,
    children
}: ScribePageProps) {
    if (activeMode === 'scribe-review' && scribeContent !== undefined && setScribeContent) {
        return (
            <ScribeReview
                isDarkMode={isDarkMode}
                content={scribeContent}
                onChange={setScribeContent}
                typewriterTrigger={typewriterTrigger}
                title={reviewTitle}
                onSave={onSave}
                onClose={onClose}
            >
                {children}
            </ScribeReview>
        );
    }

    return (
        <ScribeView
            isDarkMode={isDarkMode}
            onGenerate={onGenerate}
            toggleSidebar={toggleSidebar}
            onOpenSettings={onOpenSettings}
        />
    );
}
