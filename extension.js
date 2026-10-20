const vscode = require("vscode");

function getConfig() {
  const cfg = vscode.workspace.getConfiguration("ollamaHelper");
  return { model: cfg.get("model"), url: cfg.get("url") };
}

// Calls Ollama's /api/chat. If onToken is given, streams tokens to it.
async function chat(messages, onToken) {
  const { model, url } = getConfig();
  const res = await fetch(`${url}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: Boolean(onToken) })
  });
  if (!res.ok) {
    throw new Error(`Ollama returned ${res.status}: ${await res.text()}`);
  }

  if (!onToken) {
    const data = await res.json();
    return data.message.content;
  }

  // Streaming: Ollama sends one JSON object per line.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.trim()) continue;
      const chunk = JSON.parse(line);
      const token = chunk.message?.content || "";
      full += token;
      onToken(token);
    }
  }
  return full;
}

function stripCodeFences(text) {
  const match = text.match(/```[\w-]*\n([\s\S]*?)```/);
  return match ? match[1] : text.trim();
}

function activate(context) {
  const output = vscode.window.createOutputChannel("Ollama");

  const ask = vscode.commands.registerCommand("ollamaHelper.ask", async () => {
    const editor = vscode.window.activeTextEditor;
    const code = editor ? editor.document.getText(editor.selection) : "";
    const question = await vscode.window.showInputBox({
      prompt: code ? "Ask about the selected code" : "Ask the local model"
    });
    if (!question) return;

    const prompt = code
      ? `${question}\n\nCode (${editor.document.languageId}):\n\`\`\`\n${code}\n\`\`\``
      : question;

    output.clear();
    output.show(true);
    output.appendLine(`> ${question}\n`);
    try {
      await chat([{ role: "user", content: prompt }], (t) => output.append(t));
      output.appendLine("\n");
    } catch (err) {
      vscode.window.showErrorMessage(`Ollama error: ${err.message}`);
    }
  });

  const edit = vscode.commands.registerCommand("ollamaHelper.edit", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.selection.isEmpty) {
      vscode.window.showWarningMessage("Select some code first.");
      return;
    }
    const instruction = await vscode.window.showInputBox({
      prompt: "How should the selected code change?"
    });
    if (!instruction) return;

    const code = editor.document.getText(editor.selection);
    const messages = [
      {
        role: "system",
        content:
          "You rewrite code. Reply with ONLY the full rewritten code in one code block, no explanation."
      },
      {
        role: "user",
        content: `Instruction: ${instruction}\n\nCode (${editor.document.languageId}):\n\`\`\`\n${code}\n\`\`\``
      }
    ];

    try {
      const result = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: "Ollama is editing..." },
        () => chat(messages)
      );
      await editor.edit((e) => e.replace(editor.selection, stripCodeFences(result)));
    } catch (err) {
      vscode.window.showErrorMessage(`Ollama error: ${err.message}`);
    }
  });

  context.subscriptions.push(ask, edit, output);
}

function deactivate() {}

module.exports = { activate, deactivate };
