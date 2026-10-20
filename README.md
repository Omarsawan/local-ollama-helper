# Local Ollama Helper

A minimal VS Code extension that uses a **local** [Ollama](https://ollama.com) model to answer questions about your code and edit it. Nothing leaves your machine.

## Features

- **Ollama: Ask about selection** – select code (or nothing), ask a question, and the answer streams into the "Ollama" output panel.
- **Ollama: Edit selection** – select code, describe a change, and the selection is replaced with the model's rewrite.

## Requirements

- [Ollama](https://ollama.com) running locally
- A model pulled, e.g.:

```bash
ollama pull qwen2.5-coder:7b
```

## Settings

| Setting | Default | Description |
|---|---|---|
| `ollamaHelper.model` | `qwen2.5-coder:7b` | Model name (see `ollama list`) |
| `ollamaHelper.url` | `http://localhost:11434` | Ollama server address |

## Development

1. Open this folder in VS Code.
2. Press **F5** to launch an Extension Development Host.
3. Run the commands from the Command Palette (**Cmd+Shift+P**).

## Packaging

```bash
npx @vscode/vsce package
```

Then in VS Code: Extensions → `…` → **Install from VSIX**.

## License

MIT
