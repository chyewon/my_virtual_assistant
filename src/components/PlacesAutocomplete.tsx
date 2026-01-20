"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface PlacesAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

interface Prediction {
    place_id: string;
    description: string;
    structured_formatting?: {
        main_text: string;
        secondary_text?: string;
    };
}

export default function PlacesAutocomplete({
    value,
    onChange,
    placeholder = "Add location",
    className = "",
}: PlacesAutocompleteProps) {
    const [inputValue, setInputValue] = useState(value);
    const [predictions, setPredictions] = useState<Prediction[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchPredictions = useCallback(async (query: string) => {
        if (!query || query.length < 2) {
            setPredictions([]);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`/api/places/autocomplete?query=${encodeURIComponent(query)}`);
            if (response.ok) {
                const data = await response.json();
                setPredictions(data.predictions || []);
                setIsOpen(true);
            }
        } catch (err) {
            console.error("Places autocomplete error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        onChange(newValue);

        // Debounce API calls
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
            fetchPredictions(newValue);
        }, 300);
    };

    const handleSelect = (prediction: Prediction) => {
        setInputValue(prediction.description);
        onChange(prediction.description);
        setPredictions([]);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} className="relative">
            <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={() => predictions.length > 0 && setIsOpen(true)}
                placeholder={placeholder}
                className={className}
            />

            {/* Loading indicator */}
            {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-slate-600 border-t-indigo-500 rounded-full animate-spin"></div>
                </div>
            )}

            {/* Predictions dropdown */}
            {isOpen && predictions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {predictions.map((prediction) => (
                        <button
                            key={prediction.place_id}
                            type="button"
                            onClick={() => handleSelect(prediction)}
                            className="w-full px-3 py-2 text-left hover:bg-slate-700 transition-colors flex items-start gap-2"
                        >
                            <span className="text-slate-400 mt-0.5">📍</span>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm text-white truncate">
                                    {prediction.structured_formatting?.main_text || prediction.description}
                                </div>
                                {prediction.structured_formatting?.secondary_text && (
                                    <div className="text-xs text-slate-400 truncate">
                                        {prediction.structured_formatting.secondary_text}
                                    </div>
                                )}
                            </div>
                        </button>
                    ))}
                    <div className="px-3 py-1.5 text-xs text-slate-500 border-t border-slate-700 flex items-center gap-1">
                        Powered by Google
                    </div>
                </div>
            )}
        </div>
    );
}
