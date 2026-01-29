export default {
    "code[class*=\"language-\"]": {
        "color": "#D4D4D4",
        "background": "none",
        "textShadow": "none",
        "fontFamily": "'Fira Code', Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
        "fontSize": "1em",
        "textAlign": "left",
        "whiteSpace": "pre",
        "wordSpacing": "normal",
        "wordBreak": "normal",
        "lineHeight": "1.5",
        "MozTabSize": "4",
        "OTabSize": "4",
        "tabSize": "4",
        "WebkitHyphens": "none",
        "MozHyphens": "none",
        "msHyphens": "none",
        "hyphens": "none"
    },
    "pre[class*=\"language-\"]": {
        "color": "#D4D4D4",
        "background": "#0B0C15", // Deep Space Void
        "textShadow": "none",
        "fontFamily": "'Fira Code', Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
        "textAlign": "left",
        "whiteSpace": "pre",
        "wordSpacing": "normal",
        "wordBreak": "normal",
        "lineHeight": "1.5",
        "MozTabSize": "4",
        "OTabSize": "4",
        "tabSize": "4",
        "WebkitHyphens": "none",
        "MozHyphens": "none",
        "msHyphens": "none",
        "hyphens": "none",
        "padding": "1em",
        "margin": ".5em 0",
        "overflow": "auto"
    },
    ":not(pre) > code[class*=\"language-\"]": {
        "background": "#0B0C15",
        "padding": ".1em",
        "borderRadius": ".3em",
        "whiteSpace": "normal"
    },

    // Core Syntax (Global Gluon Neon Palette)
    "comment": { "color": "#546E7A", "fontStyle": "italic" },
    "prolog": { "color": "#546E7A" },
    "doctype": { "color": "#546E7A" },
    "cdata": { "color": "#546E7A" },

    // Punctuation & Delimiters
    "punctuation": { "color": "#89DDFF" }, // Cyan
    "namespace": { "Opacity": ".7" },

    // Properties & Types
    "property": { "color": "#80CBC4" }, // Teal
    "tag": { "color": "#FF5572" },      // Red-Pink
    "class-name": { "color": "#FFCB6B" }, // Yellow-Orange (Classes)
    "attr-name": { "color": "#C792EA" },  // Purple
    "selector": { "color": "#C792EA" },   // Purple

    // Primitives
    "boolean": { "color": "#ff9800" },  // Orange
    "number": { "color": "#F78C6C" },   // Orange-Red
    "symbol": { "color": "#F78C6C" },   // Orange-Red
    "constant": { "color": "#F78C6C" }, // Orange-Red (Constants)
    "string": { "color": "#C3E88D" },   // Green
    "char": { "color": "#C3E88D" },     // Green
    "url": { "color": "#C3E88D" },      // Green
    "attr-value": { "color": "#C3E88D" }, // Green

    // Logic & Functions
    "builtin": { "color": "#82AAFF" },  // Blue (console, window, etc.)
    "inserted": { "color": "#C3E88D" }, // Green
    "deleted": { "color": "#FF5572" },  // Red-Pink

    // Control Flow
    "keyword": { "color": "#C792EA", "fontStyle": "italic" }, // Purple Italic
    "operator": { "color": "#89DDFF" }, // Cyan
    "entity": { "color": "#f8f8f2", "cursor": "help" },

    // Variables & Functions
    "function": { "color": "#82AAFF" }, // Blue (Functions)
    "function-variable": { "color": "#82AAFF" }, // Blue (Function Variables)
    "variable": { "color": "#BEC5D4" }, // Light Grey-Blue (Variables)
    "regex": { "color": "#F78C6C" },    // Orange
    "important": { "color": "#d4d4d4", "fontWeight": "bold" },
    "bold": { "fontWeight": "bold" },
    "italic": { "fontStyle": "italic" },

    // Templating / Interpolation
    "template-string": { "color": "#C3E88D" }, // Green
    "interpolation": { "color": "#89DDFF" },    // Cyan
    "interpolation-punctuation": { "color": "#89DDFF" } // Cyan
} as any;
