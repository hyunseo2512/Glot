# Local AI Engine Integration

Gluon differentiates itself by running entirely locally, ensuring that your code, prompts, and architectures never leave your machine.

## Supported Models

Out of the box, Gluon recommends and supports:
- **DeepSeek (Llama-based derivatives)**
- **Llama 3 (8B Instruct)**
- **Phi-3 (Mini/Medium)**

## How Context Works

When you open the **AI Panel** and ask a question, the IDE doesn't just send your text. It implicitly attaches:
1. The entire content of the currently active editor tab.
2. Highlighted text (if any).
3. The file path and language type (e.g., `src/renderer/App.tsx`).

This allows the model to give highly tailored responses without needing manual copy-pasting.

## Performance Requirements

Running LLMs locally requires adequate hardware. We recommend:
- At least 16GB of system RAM.
- An Apple Silicon (M1/M2/M3) chip or a dedicated Nvidia GPU with 8GB+ VRAM for optimal inference speeds.

*This document is a work-in-progress draft.*
