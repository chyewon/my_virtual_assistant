import React, { useState, useRef } from 'react';
import { useToast } from './Toast';

interface EmailCardProps {
    id: string;
    subject: string;
    sender?: string;
    recipient?: string;
    snippet: string;
    date: string;
    isPersonal?: boolean;
    onDoubleClick?: () => void;
    isSelected?: boolean;
    onSelect?: (selected: boolean) => void;
    onDelete?: () => void;
    onTag?: () => void;
    onAIDraft?: (userPrompt?: string) => void;
}

export default function EmailCard({
    id, subject, sender, recipient, snippet, date, isPersonal,
    onDoubleClick, isSelected, onSelect, onDelete, onTag, onAIDraft
}: EmailCardProps) {
    const { showConfirm } = useToast();
    // Format date string to a more readable format
    const formattedDate = new Date(date).toLocaleString([], {
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        day: 'numeric'
    });

    return (
        <div
            onDoubleClick={onDoubleClick}
            draggable
            onDragStart={(e) => {
                const dragData = {
                    type: "email",
                    title: `Reply to: ${subject}`,
                    date: new Date().toISOString().split("T")[0],
                    id: id,
                };
                e.dataTransfer.setData("application/json", JSON.stringify(dragData));
                e.dataTransfer.effectAllowed = "copy";
            }}
            className={`p-4 border-b border-white/5 hover:bg-white/5 transition-all group cursor-pointer relative flex items-start gap-3 ${isPersonal ? 'bg-indigo-500/5 border-l-2 border-l-indigo-500 shadow-[inset_1px_0_0_0_rgba(99,102,241,0.2)]' : ''
                } ${isSelected ? 'bg-indigo-500/10' : ''}`}
        >
            {/* Checkbox for selection */}
            <div
                className="pt-1"
                onClick={(e) => e.stopPropagation()}
            >
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => onSelect?.(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/50 cursor-pointer"
                />
            </div>

            <div className="flex-1 min-w-0">
                {isPersonal && (
                    <div className="absolute top-2 right-2">
                        <span className="flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                    </div>
                )}
                <div className="flex justify-between items-start mb-1">
                    <h4 className={`text-sm font-semibold truncate mr-4 ${isPersonal ? 'text-indigo-200' : 'text-white/90'}`}>
                        {subject}
                    </h4>
                    <span className="text-[10px] text-white/40 whitespace-nowrap pt-1">
                        {formattedDate}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-medium ${isPersonal ? 'text-indigo-300/80' : 'text-white/60'}`}>
                            {sender ? `From: ${sender}` : `To: ${recipient}`}
                        </span>
                        {isPersonal && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider font-bold">
                                Personal
                            </span>
                        )}
                    </div>

                    {/* Individual Actions on Hover */}
                    <div className="hidden group-hover:flex items-center gap-2 transition-opacity">
                        <button
                            onClick={(e) => { e.stopPropagation(); onAIDraft?.(); }}
                            className="p-1 px-1.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 hover:from-purple-500/30 hover:to-blue-500/30 rounded border border-purple-500/30 text-xs text-purple-300 hover:text-purple-200 transition-colors"
                            title="AI Draft Reply"
                        >
                            ✨ AI
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onTag?.(); }}
                            className="p-1 px-1.5 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-xs text-white/60 hover:text-indigo-400 transition-colors"
                            title="Add Tag"
                        >
                            🏷️
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                showConfirm({
                                    title: 'Delete Email',
                                    message: `Are you sure you want to delete "${subject}"? This action cannot be undone.`,
                                    confirmText: 'Delete',
                                    cancelText: 'Cancel',
                                    variant: 'danger',
                                    onConfirm: () => onDelete?.(),
                                });
                            }}
                            className="p-1 px-1.5 bg-white/5 hover:bg-red-500/10 rounded border border-white/10 text-xs text-white/60 hover:text-red-400 transition-colors"
                            title="Delete"
                        >
                            🗑️
                        </button>
                    </div>
                </div>
                <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">
                    {snippet}
                </p>
            </div>
        </div>
    );
}
