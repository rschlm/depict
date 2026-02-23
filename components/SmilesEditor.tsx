"use client";

import { useState, useMemo } from "react";
import { useTheme } from "next-themes";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView, Decoration, DecorationSet } from "@codemirror/view";
import { StreamLanguage } from "@codemirror/language";
import { StateField, RangeSetBuilder } from "@codemirror/state";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { tags, Tag } from "@lezer/highlight";

interface SmilesEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    minHeight?: string;
    maxHeight?: string;
    invalidSmiles?: string[];
    onImagePaste?: (file: File) => void;
}

// Define custom tags for SMILES atoms (must be before language definition)
const customTags = {
    carbon: Tag.define(),
    nitrogen: Tag.define(),
    oxygen: Tag.define(),
    sulfur: Tag.define(),
    phosphorus: Tag.define(),
    halogen: Tag.define(),
    hydrogen: Tag.define(),
};

// SMILES syntax highlighting using StreamLanguage
const smilesLanguage = StreamLanguage.define({
    token(stream) {
        // Reaction separator (>)
        if (stream.match(/>/)) {
            return "operator";
        }

        // Ring numbers (%11, %12, etc. or single digits 1-9)
        if (stream.match(/%\d+/) || stream.match(/\d/)) {
            return "number";
        }

        // Bonds
        if (stream.match(/[-=#$:\/\\]/)) {
            return "keyword";
        }

        // Brackets []
        if (stream.match(/[\[\]]/)) {
            return "bracket";
        }

        // Nitrogen (N, n) - blue
        if (stream.match(/N|n/)) {
            return "nitrogen";
        }

        // Oxygen (O, o) - red
        if (stream.match(/O|o/)) {
            return "oxygen";
        }

        // Sulfur (S, s) - yellow
        if (stream.match(/S|s/)) {
            return "sulfur";
        }

        // Phosphorus (P, p) - orange
        if (stream.match(/P|p/)) {
            return "phosphorus";
        }

        // Halogens - green/cyan
        if (stream.match(/Br|Cl|F|I/)) {
            return "halogen";
        }

        // Carbon (C, c) - gray (most common)
        if (stream.match(/C|c/)) {
            return "carbon";
        }

        // Hydrogen - light
        if (stream.match(/H/)) {
            return "hydrogen";
        }

        // Other elements (B, K, etc.) - default atom color
        if (stream.match(/Al|Si|As|Se|Sn|Te|Ba|Ca|Mg|Na|Li|He|Ne|Ar|Kr|Xe|Rn|B|K/)) {
            return "atom";
        }

        // Parentheses
        if (stream.match(/[()]/)) {
            return "paren";
        }

        // Move forward if no match
        stream.next();
        return null;
    },
    tokenTable: {
        carbon: customTags.carbon,
        nitrogen: customTags.nitrogen,
        oxygen: customTags.oxygen,
        sulfur: customTags.sulfur,
        phosphorus: customTags.phosphorus,
        halogen: customTags.halogen,
        hydrogen: customTags.hydrogen,
        number: tags.number,
        keyword: tags.keyword,
        operator: tags.operator,
        bracket: tags.squareBracket,
        paren: tags.paren,
        atom: tags.atom,
    }
});

function createSmilesTheme(isDark: boolean) {
    return EditorView.theme(
        {
            "&": {
                backgroundColor: "hsl(var(--background))",
                color: "hsl(var(--foreground))",
                fontSize: "12px",
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', monospace",
            },
            ".cm-content": {
                minHeight: "52px",
                padding: "10px 12px",
                caretColor: "#818cf8",
            },
            ".cm-line": {
                padding: "0",
            },
            "&.cm-focused .cm-cursor": {
                borderLeftColor: "#818cf8",
                borderLeftWidth: "2px",
            },
            "&.cm-focused .cm-selectionBackground, ::selection": {
                backgroundColor: isDark ? "#334155 !important" : "rgba(99, 102, 241, 0.2) !important",
            },
            ".cm-selectionBackground": {
                backgroundColor: isDark ? "#1e293b" : "rgba(99, 102, 241, 0.12)",
            },
            ".cm-gutters": {
                backgroundColor: "hsl(var(--muted) / 0.3)",
                borderRight: "1px solid hsl(var(--border))",
                color: "hsl(var(--muted-foreground) / 0.5)",
                paddingRight: "8px",
                paddingLeft: "4px",
            },
            ".cm-lineNumbers": {
                minWidth: "30px",
            },
            ".cm-lineNumbers .cm-gutterElement": {
                fontSize: "11px",
                padding: "0 4px",
                minWidth: "24px",
                textAlign: "right",
            },
            ".cm-activeLineGutter": {
                backgroundColor: "hsl(var(--muted) / 0.5)",
                color: "hsl(var(--muted-foreground))",
            },
            ".cm-scroller": {
                overflow: "visible !important",
            },
            "&.cm-focused": {
                outline: "none",
            },
            ".cm-placeholder": {
                color: "hsl(var(--muted-foreground))",
                fontStyle: "normal",
            },
            ".cm-invalid-smiles-line": {
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                borderLeft: "3px solid rgb(239, 68, 68)",
                paddingLeft: "8px",
            },
            ".cm-invalid-smiles-underline": {
                textDecoration: "wavy underline rgb(239, 68, 68)",
                textDecorationSkipInk: "none",
            },
        },
        { dark: isDark }
    );
}

// Highlight colors: light theme (darker for white bg) vs dark theme
const HIGHLIGHT_COLORS = {
    light: {
        carbon: "#475569",
        nitrogen: "#1d4ed8",
        oxygen: "#b91c1c",
        sulfur: "#ca8a04",
        phosphorus: "#ea580c",
        halogen: "#059669",
        hydrogen: "#64748b",
        atom: "#1d4ed8",
        number: "#db2777",
        keyword: "#475569",
        operator: "#4f46e5",
        squareBracket: "#d97706",
        paren: "#475569",
    },
    dark: {
        carbon: "#e2e8f0",
        nitrogen: "#3b82f6",
        oxygen: "#ef4444",
        sulfur: "#facc15",
        phosphorus: "#fb923c",
        halogen: "#34d399",
        hydrogen: "#e2e8f0",
        atom: "#3b82f6",
        number: "#f472b6",
        keyword: "#94a3b8",
        operator: "#a5b4fc",
        squareBracket: "#fcd34d",
        paren: "#94a3b8",
    },
} as const;

function getSmilesHighlighting(isDark: boolean) {
    const c = isDark ? HIGHLIGHT_COLORS.dark : HIGHLIGHT_COLORS.light;
    return HighlightStyle.define([
        { tag: customTags.carbon, color: c.carbon, fontWeight: "500" },
        { tag: customTags.nitrogen, color: c.nitrogen, fontWeight: "600" },
        { tag: customTags.oxygen, color: c.oxygen, fontWeight: "600" },
        { tag: customTags.sulfur, color: c.sulfur, fontWeight: "600" },
        { tag: customTags.phosphorus, color: c.phosphorus, fontWeight: "600" },
        { tag: customTags.halogen, color: c.halogen, fontWeight: "600" },
        { tag: customTags.hydrogen, color: c.hydrogen, fontWeight: "400" },
        { tag: tags.atom, color: c.atom, fontWeight: "500" },
        { tag: tags.number, color: c.number, fontWeight: "700" },
        { tag: tags.keyword, color: c.keyword },
        { tag: tags.operator, color: c.operator, fontWeight: "700", fontSize: "1.15em" },
        { tag: tags.squareBracket, color: c.squareBracket, fontWeight: "500" },
        { tag: tags.paren, color: c.paren },
    ]);
}

// Create validation decoration extension
const createValidationExtension = (invalidSmiles: string[]) => {
    return StateField.define<DecorationSet>({
        create(state) {
            if (invalidSmiles.length === 0) return Decoration.none;

            try {
                const text = state.doc.toString();
                const lines = text.split(/\n|,/);

                // Collect all decorations with their positions
                const decorations: Array<{ from: number; to: number; type: 'line' | 'mark' }> = [];
                let currentPos = 0;

                lines.forEach((line) => {
                    const trimmedLine = line.trim();

                    if (trimmedLine && invalidSmiles.includes(trimmedLine)) {
                        // Find the actual position in the document
                        const lineStart = text.indexOf(trimmedLine, currentPos);

                        if (lineStart !== -1 && lineStart >= currentPos) {
                            const lineEnd = lineStart + trimmedLine.length;

                            // Store decoration info
                            decorations.push({ from: lineStart, to: lineStart, type: 'line' });
                            decorations.push({ from: lineStart, to: lineEnd, type: 'mark' });
                        }
                    }

                    // Move position forward
                    const nextLinePos = text.indexOf(line, currentPos);
                    if (nextLinePos !== -1) {
                        currentPos = nextLinePos + line.length + 1;
                    }
                });

                // Sort decorations by 'from' position, then by type (line before mark)
                decorations.sort((a, b) => {
                    if (a.from !== b.from) return a.from - b.from;
                    // If same position, line decorations come before mark decorations
                    return a.type === 'line' ? -1 : 1;
                });

                // Build the decoration set in sorted order
                const builder = new RangeSetBuilder<Decoration>();

                for (const deco of decorations) {
                    if (deco.type === 'line') {
                        builder.add(
                            deco.from,
                            deco.to,
                            Decoration.line({ class: "cm-invalid-smiles-line" })
                        );
                    } else {
                        builder.add(
                            deco.from,
                            deco.to,
                            Decoration.mark({ class: "cm-invalid-smiles-underline" })
                        );
                    }
                }

                return builder.finish();
            } catch {
                return Decoration.none;
            }
        },
        update(decorations, tr) {
            if (tr.docChanged) {
                return decorations.map(tr.changes);
            }
            return decorations;
        },
        provide: f => EditorView.decorations.from(f),
    });
};

export function SmilesEditor({
    value,
    onChange,
    placeholder = "Paste SMILES here...",
    className = "",
    minHeight = "52px",
    maxHeight = "70vh",
    invalidSmiles = [],
    onImagePaste,
}: SmilesEditorProps) {
    const [isFocused, setIsFocused] = useState(false);
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    // Create validation extension when invalidSmiles changes
    const validationExtension = useMemo(
        () => createValidationExtension(invalidSmiles),
        [invalidSmiles]
    );

    const smilesTheme = useMemo(() => createSmilesTheme(isDark), [isDark]);

    const smilesHighlighting = useMemo(
        () => getSmilesHighlighting(isDark),
        [isDark]
    );

    const extensions = useMemo(
        () => [
            smilesLanguage,
            EditorView.lineWrapping,
            syntaxHighlighting(smilesHighlighting),
            validationExtension,
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    onChange(update.state.doc.toString());
                }
            }),
            ...(onImagePaste ? [EditorView.domEventHandlers({
                paste(event) {
                    const items = event.clipboardData?.items;
                    if (!items) return false;
                    for (const item of items) {
                        if (item.type.startsWith("image/")) {
                            event.preventDefault();
                            const file = item.getAsFile();
                            if (file) onImagePaste(file);
                            return true;
                        }
                    }
                    return false;
                },
            })] : []),
        ],
        [smilesHighlighting, validationExtension, onChange, onImagePaste]
    );

    return (
        <div
            className={`relative rounded-md border bg-background resize-y ${isFocused ? "ring-2 ring-ring/30 border-ring/50" : "hover:border-border"
                } ${className}`}
            style={{
                minHeight,
                maxHeight,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <div style={{ 
                flex: 1,
                overflow: "auto",
                minHeight: 0,
            }}>
                <CodeMirror
                    value={value}
                    placeholder={placeholder}
                    extensions={extensions}
                    theme={smilesTheme}
                    basicSetup={{
                        lineNumbers: true,
                        foldGutter: false,
                        highlightActiveLineGutter: true,
                        highlightActiveLine: false,
                        highlightSelectionMatches: false,
                        closeBrackets: true,
                        autocompletion: false,
                        rectangularSelection: false,
                        crosshairCursor: false,
                        highlightSpecialChars: true,
                        history: true,
                        drawSelection: true,
                        dropCursor: false,
                        allowMultipleSelections: true,
                        indentOnInput: false,
                        syntaxHighlighting: true,
                        bracketMatching: true,
                        closeBracketsKeymap: true,
                        defaultKeymap: true,
                        searchKeymap: true,
                        historyKeymap: true,
                        foldKeymap: false,
                        completionKeymap: false,
                        lintKeymap: false,
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                />
            </div>
        </div>
    );
}
