"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => SatNexusPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT = { apiUrl: "https://sat-nexus.vercel.app", defaultDomain: "" };
var SatNexusPlugin = class extends import_obsidian.Plugin {
  async onload() {
    await this.loadSettings();
    this.addCommand({ id: "insert-question", name: "Insert SAT question", editorCallback: (_e, editor) => new QuestionModal(this.app, this.settings, (q) => editor.replaceSelection(formatQuestion(q))).open() });
    this.addCommand({ id: "study-question", name: "Study a random SAT question", callback: () => new QuestionModal(this.app, this.settings, (q) => {
      var _a;
      return new import_obsidian.Notice(`Answer: ${q.correctAnswer}
${(_a = q.explanation) != null ? _a : ""}`);
    }).open() });
    this.addRibbonIcon("book-open", "Insert SAT question", () => {
      var _a;
      return ((_a = this.app.workspace.activeEditor) == null ? void 0 : _a.editor) && new QuestionModal(this.app, this.settings, (q) => {
        var _a2, _b;
        return (_b = (_a2 = this.app.workspace.activeEditor) == null ? void 0 : _a2.editor) == null ? void 0 : _b.replaceSelection(formatQuestion(q));
      }).open();
    });
    this.addSettingTab(new SatSettingsTab(this.app, this));
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
var QuestionModal = class extends import_obsidian.Modal {
  constructor(app, settings, done) {
    super(app);
    this.settings = settings;
    this.done = done;
  }
  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "Insert from SAT Nexus" });
    contentEl.createEl("p", { text: "Choose a question type, or leave it random." });
    const domain = contentEl.createEl("select");
    ["Any type", "Math", "Reading & Writing"].forEach((x) => domain.createEl("option", { text: x, value: x === "Any type" ? "" : x }));
    const skill = contentEl.createEl("input", { type: "text", placeholder: "Optional skill (e.g. Linear equations)" });
    const results = contentEl.createDiv({ cls: "sat-nexus-results" });
    const button = contentEl.createEl("button", { text: "Find questions" });
    button.addEventListener("click", async () => {
      var _a;
      button.disabled = true;
      results.setText("Loading questions\u2026");
      try {
        const p = new URLSearchParams({ random: "1", limit: "5" });
        if (domain.value) p.set("domain", domain.value);
        if (skill.value) p.set("search", skill.value);
        const response = await (0, import_obsidian.requestUrl)({ url: `${this.settings.apiUrl.replace(/\/$/, "")}/api/questions?${p}` });
        const questions = (_a = response.json.questions) != null ? _a : [];
        results.empty();
        if (!questions.length) {
          results.setText("No matching questions found.");
          return;
        }
        questions.forEach((q) => {
          const row = results.createDiv({ cls: "sat-nexus-result" });
          row.createEl("strong", { text: `${q.domain} \xB7 ${q.skill} \xB7 ${q.difficulty}` });
          row.createEl("p", { text: q.questionText.replace(/<[^>]*>/g, "").slice(0, 220) });
          const insert = row.createEl("button", { text: "Insert this question" });
          insert.addEventListener("click", () => {
            this.done(q);
            this.close();
          });
        });
      } catch (e) {
        results.setText(`Could not connect to SAT Nexus. Check the API URL in settings. ${e}`);
      } finally {
        button.disabled = false;
      }
    });
  }
};
function formatQuestion(q) {
  var _a, _b, _c;
  const choices = (_b = (_a = q.choices) == null ? void 0 : _a.map((c) => `- **${c.key}.** ${c.text}`).join("\n")) != null ? _b : "";
  return `
> [!question]- SAT Nexus \xB7 ${q.domain} \xB7 ${q.skill}
> **${q.difficulty}** \xB7 ID: ${q.id}
>
> ${q.questionText.replace(/\n/g, "\n> ")}
${choices}
>
> **Answer:** ${q.correctAnswer}
> **Explanation:** ${(_c = q.explanation) != null ? _c : "Open SAT Nexus to work through this question."}
`;
}
var SatSettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const e = this.containerEl;
    e.empty();
    e.createEl("h2", { text: "SAT Nexus connection" });
    new import_obsidian.Setting(e).setName("SAT Nexus URL").setDesc("Your deployed SAT Nexus URL").addText((t) => t.setValue(this.plugin.settings.apiUrl).onChange(async (v) => {
      this.plugin.settings.apiUrl = v;
      await this.plugin.saveSettings();
    }));
  }
};
