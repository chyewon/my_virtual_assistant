"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// Toast types
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ConfirmDialog {
    id: string;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    variant?: 'danger' | 'warning' | 'info';
}

interface ToastContextType {
    toasts: Toast[];
    showToast: (message: string, type?: ToastType, duration?: number) => void;
    dismissToast: (id: string) => void;
    showConfirm: (options: Omit<ConfirmDialog, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// SVG Icons for toast types
const ToastIcons = {
    success: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    ),
    error: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
    ),
    warning: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
    info: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
    ),
};

const toastStyles: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
    success: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        icon: 'text-emerald-400',
        text: 'text-emerald-300',
    },
    error: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        icon: 'text-red-400',
        text: 'text-red-300',
    },
    warning: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        icon: 'text-amber-400',
        text: 'text-amber-300',
    },
    info: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        icon: 'text-blue-400',
        text: 'text-blue-300',
    },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    const [isExiting, setIsExiting] = useState(false);
    const style = toastStyles[toast.type];
    const Icon = ToastIcons[toast.type];

    useEffect(() => {
        const duration = toast.duration || 4000;
        const exitTimer = setTimeout(() => {
            setIsExiting(true);
        }, duration - 300);

        const dismissTimer = setTimeout(() => {
            onDismiss();
        }, duration);

        return () => {
            clearTimeout(exitTimer);
            clearTimeout(dismissTimer);
        };
    }, [toast.duration, onDismiss]);

    const handleDismiss = () => {
        setIsExiting(true);
        setTimeout(onDismiss, 300);
    };

    return (
        <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg transition-all duration-300 ${style.bg} ${style.border} ${
                isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
            }`}
            role="alert"
        >
            <span className={style.icon}>
                <Icon />
            </span>
            <p className={`text-sm font-medium flex-1 ${style.text}`}>{toast.message}</p>
            <button
                onClick={handleDismiss}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white/80"
                aria-label="Dismiss"
            >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
        </div>
    );
}

function ConfirmDialogComponent({ dialog, onClose }: { dialog: ConfirmDialog; onClose: () => void }) {
    const [isExiting, setIsExiting] = useState(false);

    const handleClose = useCallback(() => {
        setIsExiting(true);
        setTimeout(onClose, 200);
    }, [onClose]);

    const handleConfirm = () => {
        dialog.onConfirm();
        handleClose();
    };

    const handleCancel = () => {
        dialog.onCancel?.();
        handleClose();
    };

    // Handle ESC key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleCancel();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const variantStyles = {
        danger: {
            icon: 'text-red-400',
            iconBg: 'bg-red-500/10',
            confirmBtn: 'bg-red-500 hover:bg-red-600',
        },
        warning: {
            icon: 'text-amber-400',
            iconBg: 'bg-amber-500/10',
            confirmBtn: 'bg-amber-500 hover:bg-amber-600',
        },
        info: {
            icon: 'text-blue-400',
            iconBg: 'bg-blue-500/10',
            confirmBtn: 'bg-blue-500 hover:bg-blue-600',
        },
    };

    const style = variantStyles[dialog.variant || 'danger'];

    return (
        <div
            className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-all duration-200 ${
                isExiting ? 'opacity-0' : 'opacity-100'
            }`}
            onClick={handleCancel}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Dialog */}
            <div
                className={`relative bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden transition-all duration-200 ${
                    isExiting ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
                }`}
                onClick={e => e.stopPropagation()}
            >
                <div className="p-6">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-full ${style.iconBg} flex items-center justify-center mx-auto mb-4`}>
                        <svg className={`w-6 h-6 ${style.icon}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-white text-center mb-2">
                        {dialog.title}
                    </h3>

                    {/* Message */}
                    <p className="text-sm text-white/60 text-center mb-6">
                        {dialog.message}
                    </p>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleCancel}
                            className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-white/80 transition-colors"
                        >
                            {dialog.cancelText || 'Cancel'}
                        </button>
                        <button
                            onClick={handleConfirm}
                            className={`flex-1 px-4 py-2.5 ${style.confirmBtn} rounded-xl text-sm font-medium text-white transition-colors`}
                        >
                            {dialog.confirmText || 'Confirm'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog | null>(null);

    const showToast = useCallback((message: string, type: ToastType = 'info', duration?: number) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setToasts(prev => [...prev, { id, message, type, duration }]);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showConfirm = useCallback((options: Omit<ConfirmDialog, 'id'>) => {
        const id = `confirm-${Date.now()}`;
        setConfirmDialog({ ...options, id });
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, showToast, dismissToast, showConfirm }}>
            {children}
            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
                {toasts.map(toast => (
                    <div key={toast.id} className="pointer-events-auto">
                        <ToastItem
                            toast={toast}
                            onDismiss={() => dismissToast(toast.id)}
                        />
                    </div>
                ))}
            </div>
            {/* Confirm Dialog */}
            {confirmDialog && (
                <ConfirmDialogComponent
                    dialog={confirmDialog}
                    onClose={() => setConfirmDialog(null)}
                />
            )}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

// Helper functions for common toast types
export function useToastHelpers() {
    const { showToast } = useToast();

    return {
        success: (message: string, duration?: number) => showToast(message, 'success', duration),
        error: (message: string, duration?: number) => showToast(message, 'error', duration),
        warning: (message: string, duration?: number) => showToast(message, 'warning', duration),
        info: (message: string, duration?: number) => showToast(message, 'info', duration),
    };
}
