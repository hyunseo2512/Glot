export interface OpenFile {
    path: string;
    content: string;
    isDirty: boolean;
    // Diff Mode optional props
    isDiff?: boolean;
    originalContent?: string;
    modifiedContent?: string;
}
