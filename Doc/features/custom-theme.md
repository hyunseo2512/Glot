# Customizing the IDE Theme

Glot supports dynamic theming using CSS variables, allowing users to customize their workspace instantly.

## Available Themes

1. **Glot (Tokyo Night)**: The default, deep purple/blue dark aesthetic.
2. **Modern Dark**: A high-contrast, deep black dark mode (`#0D0D0D` base).
3. **Modern White**: A clean, bright light mode with dark text for daytime development.

## How to Change

1. Press `Ctrl + ,` or click the gear icon to open **Settings**.
2. Under the **Editor** section, find the **Theme** dropdown.
3. Select your desired theme. The UI (including the sidebar, editor, and terminal) will instantly reflect the changes without requiring a restart.

## Adding Custom Themes

*(Advanced)* To add entirely new themes, administrators can define a new CSS class (`.theme-my-custom`) in `src/renderer/styles/index.css` and map out the required `--bg-primary`, `--text-primary`, and `--primary-color` variables.

*This document is a work-in-progress draft.*
