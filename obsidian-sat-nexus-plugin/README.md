# SAT Nexus Questions — Obsidian plugin

Embed an interactive SAT Nexus question in any note. The plugin makes requests only when an embedded question is rendered or refreshed; it has no telemetry, email, text-message, or background sync behavior.

## Install for development

Copy this folder into `<vault>/.obsidian/plugins/sat-nexus-questions/`, install the Obsidian `obsidian` typings to compile `main.ts`, and enable **SAT Nexus Questions** in Obsidian's Community Plugins settings. Set **SAT Nexus API URL** to your deployed site (for example `https://your-site.vercel.app`) in the plugin settings.

## Note syntax

Specific question by ID:

````markdown
```sat-question
id="cb-math-123"
```
````

A random question matching filters:

````markdown
```sat-question
section="Math"
skill="Algebra"
difficulty="Medium"
```
````

Supported filter keys are `section` (or `domain`), `skill`, `subskill`, `difficulty`, and `search`. Any block without an `id` is a filtered/random question, and includes a **Refresh question** button. The two commands added to the command palette can insert either block for you.

## Expected API

- `GET {baseUrl}/api/questions/{id}` returns one question.
- `GET {baseUrl}/api/questions?random=1&limit=1&domain=Math&skill=...&difficulty=...` returns `{ questions: [question] }`.

See `main.ts` for the TypeScript schema. The existing SAT Nexus endpoints already match this contract.
