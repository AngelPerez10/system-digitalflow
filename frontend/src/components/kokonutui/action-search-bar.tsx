"use client";

/**
 * @author: @kokonutui
 * @description: A modern search bar component with action buttons and suggestions
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "motion/react";
import {
    Search,
    Send,
    BarChart2,
    Video,
    PlaneTakeoff,
    AudioLines,
    LayoutGrid,
} from "lucide-react";
import useDebounce from "@/hooks/use-debounce";

interface Action {
    id: string;
    label: string;
    icon: React.ReactNode;
    description?: string;
    short?: string;
    end?: string;
}



const ANIMATION_VARIANTS = {
    container: {
        hidden: { opacity: 0, height: 0 },
        show: {
            opacity: 1,
            height: "auto",
            transition: {
                height: { duration: 0.4 },
                staggerChildren: 0.1,
            },
        },
        exit: {
            opacity: 0,
            height: 0,
            transition: {
                height: { duration: 0.3 },
                opacity: { duration: 0.2 },
            },
        },
    },
    item: {
        hidden: { opacity: 0, y: 20 },
        show: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.3 },
        },
        exit: {
            opacity: 0,
            y: -10,
            transition: { duration: 0.2 },
        },
    },
} as const;

const allActionsSample = [
    {
        id: "1",
        label: "Reservar boletos",
        icon: <PlaneTakeoff className="h-4 w-4 text-blue-500" />,
        description: "Operador",
        short: "⌘K",
        end: "Agente",
    },
    {
        id: "2",
        label: "Resumir",
        icon: <BarChart2 className="h-4 w-4 text-orange-500" />,
        description: "gpt-5",
        short: "⌘cmd+p",
        end: "Comando",
    },
    {
        id: "3",
        label: "Estudio de pantalla",
        icon: <Video className="h-4 w-4 text-purple-500" />,
        description: "Claude 4.1",
        short: "",
        end: "Aplicación",
    },
    {
        id: "4",
        label: "Hablar con Jarvis",
        icon: <AudioLines className="h-4 w-4 text-green-500" />,
        description: "gpt-5 voz",
        short: "",
        end: "Activo",
    },
    {
        id: "5",
        label: "Kokonut UI - Pro",
        icon: <LayoutGrid className="h-4 w-4 text-blue-500" />,
        description: "Componentes",
        short: "",
        end: "Enlace",
    },
];

function ActionSearchBar({
    actions = allActionsSample,
    defaultOpen = false,
    label = "Buscar",
    placeholder = "Buscar...",
    value,
    onQueryChange,
    onSelectAction,
    showAllActions = false,
}: {
    actions?: Action[];
    defaultOpen?: boolean;
    label?: string;
    placeholder?: string;
    value?: string;
    onQueryChange?: (query: string) => void;
    onSelectAction?: (action: Action) => void;
    showAllActions?: boolean;
}) {
    const [query, setQuery] = useState("");
    const [isFocused, setIsFocused] = useState(defaultOpen);
    const [selectedAction, setSelectedAction] = useState<Action | null>(null);
    const [activeIndex, setActiveIndex] = useState(-1);
    const debouncedQuery = useDebounce(query, 200);

    useEffect(() => {
        if (typeof value !== "string") return;
        if (value === query) return;
        setQuery(value);
        setSelectedAction(null);
        setActiveIndex(-1);
    }, [value, query]);

    const filteredActions = useMemo(() => {
        if (showAllActions) return actions;
        if (!debouncedQuery) return actions;

        const normalizedQuery = debouncedQuery.toLowerCase().trim();
        return actions.filter((action) => {
            const searchableText =
                `${action.label} ${action.description || ""}`.toLowerCase();
            return searchableText.includes(normalizedQuery);
        });
    }, [debouncedQuery, actions, showAllActions]);

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const next = e.target.value;
            setQuery(next);
            onQueryChange?.(next);
            setSelectedAction(null);
            setActiveIndex(-1);
        },
        [onQueryChange]
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (!filteredActions.length) return;

            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setActiveIndex((prev) =>
                        prev < filteredActions.length - 1 ? prev + 1 : 0
                    );
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setActiveIndex((prev) =>
                        prev > 0 ? prev - 1 : filteredActions.length - 1
                    );
                    break;
                case "Enter":
                    e.preventDefault();
                    if (activeIndex >= 0 && filteredActions[activeIndex]) {
                        const action = filteredActions[activeIndex];
                        setSelectedAction(action);
                        onSelectAction?.(action);
                    }
                    break;
                case "Escape":
                    setIsFocused(false);
                    setActiveIndex(-1);
                    break;
            }
        },
        [filteredActions, activeIndex, onSelectAction]
    );

    const handleActionClick = useCallback((action: Action) => {
        setSelectedAction(action);
        onSelectAction?.(action);
    }, [onSelectAction]);

    const handleFocus = useCallback(() => {
        setSelectedAction(null);
        setIsFocused(true);
        setActiveIndex(-1);
    }, []);

    const handleBlur = useCallback(() => {
        setTimeout(() => {
            setIsFocused(false);
            setActiveIndex(-1);
        }, 200);
    }, []);

    const displayQuery = typeof value === "string" ? value : query;

    return (
        <div className="w-full">
            <div className="relative">
                <div className="w-full">
                    <label
                        className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block"
                        htmlFor="search"
                    >
                        {label}
                    </label>
                    <div className="relative">
                        <Input
                            type="text"
                            placeholder={placeholder}
                            value={displayQuery}
                            onChange={handleInputChange}
                            onFocus={handleFocus}
                            onClick={() => {
                                setSelectedAction(null);
                                setIsFocused(true);
                            }}
                            onBlur={handleBlur}
                            onKeyDown={handleKeyDown}
                            role="combobox"
                            aria-expanded={isFocused}
                            aria-autocomplete="list"
                            aria-activedescendant={
                                activeIndex >= 0
                                    ? `action-${filteredActions[activeIndex]?.id}`
                                    : undefined
                            }
                            id="search"
                            autoComplete="off"
                            className="pl-3 pr-9 py-1.5 h-9 text-sm rounded-lg focus-visible:ring-offset-0"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4">
                            <AnimatePresence mode="popLayout">
                                {displayQuery.length > 0 ? (
                                    <motion.div
                                        key="send"
                                        initial={{ y: -20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: 20, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <Send className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="search"
                                        initial={{ y: -20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: 20, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <Search className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                <div className="w-full">
                    <AnimatePresence>
                        {isFocused && filteredActions.length > 0 && !selectedAction && (
                            <motion.div
                                className="w-full border rounded-md shadow-xs overflow-hidden dark:border-gray-800 bg-white dark:bg-black mt-1"
                                variants={ANIMATION_VARIANTS.container}
                                role="listbox"
                                aria-label="Resultados de búsqueda"
                                initial="hidden"
                                animate="show"
                                exit="exit"
                            >
                                <motion.ul
                                    role="none"
                                    className="max-h-60 overflow-y-auto"
                                >
                                    {filteredActions.map((action, index) => (
                                        <motion.li
                                            key={action.id}
                                            id={`action-${action.id}`}
                                            className={`px-3 py-2 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-zinc-900 cursor-pointer rounded-md ${activeIndex === index
                                                ? "bg-gray-100 dark:bg-zinc-800"
                                                : ""
                                                }`}
                                            variants={ANIMATION_VARIANTS.item}
                                            layout
                                            onClick={() =>
                                                handleActionClick(action)
                                            }
                                            role="option"
                                            aria-selected={activeIndex === index}
                                        >
                                            <div className="flex items-center gap-2 justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className="text-gray-500"
                                                        aria-hidden="true"
                                                    >
                                                        {action.icon}
                                                    </span>
                                                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {action.label}
                                                    </span>
                                                    {action.description && (
                                                        <span className="text-xs text-gray-400">
                                                            {action.description}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {action.short && (
                                                    <span
                                                        className="text-xs text-gray-400"
                                                        aria-label={`Keyboard shortcut: ${action.short}`}
                                                    >
                                                        {action.short}
                                                    </span>
                                                )}
                                                {action.end && (
                                                    <span className="text-xs text-gray-400 text-right">
                                                        {action.end}
                                                    </span>
                                                )}
                                            </div>
                                        </motion.li>
                                    ))}
                                </motion.ul>
                                <div className="mt-2 px-3 py-2 border-t border-gray-100 dark:border-gray-800">
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>Presiona Ctrl+K para abrir comandos</span>
                                        <span>ESC para cancelar</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

export default ActionSearchBar;
