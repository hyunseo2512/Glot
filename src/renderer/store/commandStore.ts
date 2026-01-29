import { create } from 'zustand';

export interface Command {
    id: string;
    title: string;
    handler: () => void;
    shortcut?: string;
}

interface CommandState {
    isOpen: boolean;
    mode: 'command' | 'file';
    searchQuery: string;
    commands: Command[];
    actions: {
        setIsOpen: (isOpen: boolean) => void;
        setMode: (mode: 'command' | 'file') => void;
        setSearchQuery: (query: string) => void;
        registerCommand: (command: Command) => void;
        unregisterCommand: (commandId: string) => void;
        openPalette: (mode?: 'command' | 'file') => void;
        closePalette: () => void;
    };
}

export const useCommandStore = create<CommandState>((set) => ({
    isOpen: false,
    mode: 'command',
    searchQuery: '',
    commands: [],
    actions: {
        setIsOpen: (isOpen) => set({ isOpen }),
        setMode: (mode) => set({ mode }),
        setSearchQuery: (searchQuery) => set({ searchQuery }),
        registerCommand: (command) =>
            set((state) => {
                if (state.commands.some((c) => c.id === command.id)) return state;
                return { commands: [...state.commands, command] };
            }),
        unregisterCommand: (commandId) =>
            set((state) => ({
                commands: state.commands.filter((c) => c.id !== commandId),
            })),
        openPalette: (mode = 'command') => set({ isOpen: true, searchQuery: mode === 'command' ? '>' : '', mode }),
        closePalette: () => set({ isOpen: false, searchQuery: '' }),
    },
}));
