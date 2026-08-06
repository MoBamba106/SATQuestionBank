# SAT Nexus Questions — Obsidian plugin

Embed an interactive SAT Nexus question in any note. The plugin makes requests only when an embedded question is rendered or refreshed; it has no telemetry, email, text-message, or background sync behavior.

## Install for development

Copy this folder into `<vault>/.obsidian/plugins/sat-nexus-questions/`. The included `main.js` is already built, so you can enable **SAT Nexus Questions** immediately in Obsidian's Community Plugins settings. Set **SAT Nexus API URL** to your deployed site (for example `https://your-site.vercel.app`) in the plugin settings.

If you change `main.ts`, then yes: run `npm install` once inside this folder to install the Obsidian TypeScript definitions and build tool, then run `npm run build`. This produces the `main.js` file Obsidian actually runs.

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
domain="Advanced Math"
skill="Nonlinear equations in one variable and systems of equations in two variables"
difficulty="Medium"
```
````

The plugin uses the labels from the study view: `section` is **Math** or **Reading & Writing**; `domain` is a broad content domain such as **Algebra** or **Advanced Math**; and `skill` is a precise topic such as **Nonlinear equations**. Supported filter keys are `section`, `domain`, `skill`, `difficulty`, and `search`. Any block without an `id` is a filtered/random question and includes a **Refresh question** button. The two commands added to the command palette can insert either block for you.

## Expected API

- `GET {baseUrl}/api/questions/{id}` returns one question.
- `GET {baseUrl}/api/questions?random=1&limit=1&domain=Math&skill=Advanced%20Math&subskill=...&difficulty=...` returns `{ questions: [question] }`.

See `main.ts` for the TypeScript schema. The existing SAT Nexus endpoints already match this contract.
