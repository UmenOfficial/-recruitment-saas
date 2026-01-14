"use client";

import React, { useMemo } from 'react';

interface KeywordHighlighterProps {
    text: string;
    keywords: string[]; // e.g. ["Python", "React", "AWS"]
    className?: string;
}

export function KeywordHighlighter({ text, keywords, className = "" }: KeywordHighlighterProps) {
    const highlightedContent = useMemo(() => {
        if (!keywords || keywords.length === 0 || !text) {
            return text;
        }

        // Escape special regex characters in keywords
        const escapedKeywords = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

        // Create Regex: (Keyword1|Keyword2|...)
        const regex = new RegExp(`(${escapedKeywords.join('|')})`, 'gi');

        // Split text by regex
        const parts = text.split(regex);

        return parts.map((part, index) => {
            // Check if this part matches any keyword (case insensitive)
            const isMatch = keywords.some(k => k.toLowerCase() === part.toLowerCase());

            if (isMatch) {
                return (
                    <mark
                        key={index}
                        className="bg-yellow-200 text-slate-900 rounded-sm px-0.5 font-medium"
                    >
                        {part}
                    </mark>
                );
            }
            return <span key={index}>{part}</span>;
        });
    }, [text, keywords]);

    return (
        <div className={`whitespace-pre-wrap ${className}`}>
            {highlightedContent}
        </div>
    );
}
