# SAT Nexus Obsidian plugin

Connects an Obsidian vault to a deployed SAT Nexus instance. Use the command palette (`SAT Nexus: Insert SAT question`) or the book icon to search by section/skill and insert a clean callout containing the question, choices, answer, explanation, and metadata. `SAT Nexus: Study a random SAT question` is a quick review mode that keeps the note untouched.

## Install for development

1. Run `npm install && npm run build` in this folder.
2. Copy `main.js` and `manifest.json` into `<vault>/.obsidian/plugins/sat-nexus/`.
3. Enable SAT Nexus in Obsidian's Community plugins settings.
4. Open plugin settings and set the URL of your deployed SAT Nexus app (for example `https://your-app.vercel.app`).

The plugin uses the existing `GET /api/questions?random=1&limit=5` endpoint, so it works with the question bank already in this repository. It does not store note contents or require a second database.

## Natural next step

A future version can add an Obsidian side pane with a full SAT Nexus study session. For now, open the web app in Obsidian's browser/sidebar and use the plugin beside it: the inserted callouts are intentionally portable Markdown.
