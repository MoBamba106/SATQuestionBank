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
  default: () => SatNexusQuestionsPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = { apiBaseUrl: "" };
function parseOptions(source) {
  var _a, _b, _c;
  const options = {};
  const matcher = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s\n]+))/g;
  for (const match of source.matchAll(matcher)) {
    options[match[1].toLowerCase()] = (_c = (_b = (_a = match[2]) != null ? _a : match[3]) != null ? _b : match[4]) != null ? _c : "";
  }
  return options;
}
function escapeHtml(value) {
  const box = document.createElement("div");
  box.textContent = value;
  return box.innerHTML;
}
function answerMatches(answer, accepted) {
  const normalize = (value) => value.trim().toLowerCase().replace(/\s+/g, " ");
  return accepted.split("|").some((item) => normalize(item) === normalize(answer));
}
var SatNexusQuestionsPlugin = class extends import_obsidian.Plugin {
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SatNexusSettingsTab(this.app, this));
    this.registerMarkdownCodeBlockProcessor("sat-question", (source, el) => {
      void this.renderQuestionBlock(parseOptions(source), el);
    });
    this.addCommand({
      id: "insert-question-by-id",
      name: "Insert SAT question by ID",
      editorCallback: (editor) => new InsertQuestionModal(this.app, (id) => {
        editor.replaceSelection(`\`\`\`sat-question
id="${id}"
\`\`\``);
      }).open()
    });
    this.addCommand({
      id: "insert-filtered-question",
      name: "Insert filtered SAT question",
      editorCallback: (editor) => new InsertFilterModal(this.app, (filters) => {
        const lines = Object.entries(filters).filter(([, value]) => value.trim()).map(([key, value]) => `${key}="${value.replaceAll('"', "'")}"`);
        editor.replaceSelection(`\`\`\`sat-question
${lines.join("\n")}
\`\`\``);
      }).open()
    });
  }
  async loadSettings() {
    this.settings = { ...DEFAULT_SETTINGS, ...await this.loadData() };
  }
  async saveSettings() {
    await this.saveData(this.settings);
  }
  apiUrl(path, params) {
    const base = this.settings.apiBaseUrl.trim().replace(/\/$/, "");
    if (!base) throw new Error("Set your SAT Nexus API URL in Obsidian plugin settings first.");
    return `${base}${path}${(params == null ? void 0 : params.size) ? `?${params.toString()}` : ""}`;
  }
  async getQuestion(options) {
    var _a;
    if (options.id) {
      return (await (0, import_obsidian.requestUrl)({ url: this.apiUrl(`/api/questions/${encodeURIComponent(options.id)}`) })).json;
    }
    const params = new URLSearchParams({ random: "1", limit: "1" });
    const filterKeys = { section: "domain", domain: "domain", skill: "skill", subskill: "subskill", difficulty: "difficulty", search: "search" };
    for (const [blockKey, apiKey] of Object.entries(filterKeys)) {
      if (options[blockKey]) params.set(apiKey, options[blockKey]);
    }
    const response = (await (0, import_obsidian.requestUrl)({ url: this.apiUrl("/api/questions", params) })).json;
    if (!((_a = response.questions) == null ? void 0 : _a[0])) throw new Error("No questions match this filter.");
    return response.questions[0];
  }
  async renderQuestionBlock(options, el) {
    el.empty();
    el.addClass("sat-nexus-question");
    try {
      const question = await this.getQuestion(options);
      this.drawQuestion(question, options, el);
    } catch (error) {
      el.createDiv({ cls: "sat-nexus-error", text: error instanceof Error ? error.message : "Could not load this question." });
    }
  }
  /** The DOM implementation deliberately uses Obsidian variables, so every vault theme is respected. */
  drawQuestion(question, options, el) {
    el.empty();
    const header = el.createDiv({ cls: "sat-nexus-header" });
    header.createEl("strong", { text: "SAT Nexus question" });
    header.createSpan({ cls: "sat-nexus-chip", text: question.domain });
    header.createSpan({ cls: "sat-nexus-chip", text: question.difficulty });
    header.createSpan({ cls: "sat-nexus-chip", text: question.skill });
    const body = el.createDiv({ cls: "sat-nexus-body" });
    if (question.passageHtml) body.createDiv({ cls: "sat-nexus-passage" }).innerHTML = question.passageHtml;
    body.createDiv({ cls: "sat-nexus-prompt" }).innerHTML = question.questionHtml || escapeHtml(question.questionText);
    const feedback = body.createDiv({ cls: "sat-nexus-feedback" });
    const explanation = body.createDiv({ cls: "sat-nexus-explanation" });
    explanation.hide();
    const revealFeedback = (isCorrect) => {
      feedback.setText(isCorrect ? "Correct!" : "Not quite.");
      feedback.addClass(isCorrect ? "correct" : "wrong");
      if (question.explanation) {
        explanation.innerHTML = `<strong>Explanation</strong><br>${question.explanation}`;
        explanation.show();
      }
    };
    if (question.type === "multiple_choice" && question.choices) {
      const choices = body.createDiv({ cls: "sat-nexus-choices" });
      const buttons = [];
      question.choices.forEach((choice) => {
        const button = choices.createEl("button", { cls: "sat-nexus-choice", attr: { type: "button" } });
        button.createSpan({ cls: "sat-nexus-letter", text: choice.key });
        button.createSpan({ cls: "sat-nexus-choice-text" }).innerHTML = choice.html || escapeHtml(choice.text);
        button.addEventListener("click", () => {
          var _a;
          const correct = answerMatches(choice.key, question.correctAnswer);
          buttons.forEach((item) => item.disabled = true);
          button.addClass(correct ? "is-correct" : "is-wrong");
          if (!correct) (_a = buttons.find((item) => item.dataset.answer === question.correctAnswer)) == null ? void 0 : _a.addClass("is-correct");
          revealFeedback(correct);
        });
        button.dataset.answer = choice.key;
        buttons.push(button);
      });
    } else {
      const input = body.createEl("input", { attr: { type: "text", placeholder: "Type your answer" }, cls: "sat-nexus-input" });
      const check = body.createEl("button", { text: "Check answer", cls: "mod-cta" });
      check.addEventListener("click", () => revealFeedback(answerMatches(input.value, question.correctAnswer)));
    }
    if (!options.id) {
      const actions = el.createDiv({ cls: "sat-nexus-actions" });
      const refresh = actions.createEl("button", { text: "Refresh question" });
      refresh.addEventListener("click", () => void this.renderQuestionBlock(options, el));
    }
  }
};
var SatNexusSettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    this.containerEl.empty();
    this.containerEl.createEl("h2", { text: "SAT Nexus Questions" });
    new import_obsidian.Setting(this.containerEl).setName("SAT Nexus API URL").setDesc("The base URL of your deployed SAT Nexus app. Questions are fetched only when an embed is displayed or refreshed.").addText((text) => text.setPlaceholder("https://your-site.vercel.app").setValue(this.plugin.settings.apiBaseUrl).onChange(async (value) => {
      this.plugin.settings.apiBaseUrl = value;
      await this.plugin.saveSettings();
    }));
  }
};
var InsertQuestionModal = class extends import_obsidian.Modal {
  constructor(app, onSubmit) {
    super(app);
    this.onSubmit = onSubmit;
  }
  onOpen() {
    this.titleEl.setText("Insert SAT question");
    let id = "";
    new import_obsidian.Setting(this.contentEl).setName("Question ID").addText((text) => text.setPlaceholder("Question ID").onChange((value) => id = value));
    new import_obsidian.Setting(this.contentEl).addButton((button) => button.setButtonText("Insert").setCta().onClick(() => {
      if (!id.trim()) return new import_obsidian.Notice("Enter a question ID.");
      this.onSubmit(id.trim());
      this.close();
    }));
  }
};
var InsertFilterModal = class extends import_obsidian.Modal {
  constructor(app, onSubmit) {
    super(app);
    this.onSubmit = onSubmit;
  }
  onOpen() {
    this.titleEl.setText("Insert filtered SAT question");
    const filters = {};
    [["section", "Math or Reading & Writing"], ["skill", "e.g. Expression of Ideas"], ["subskill", "Optional"], ["difficulty", "Easy, Medium, or Hard"], ["search", "Keyword, e.g. dangling modifier"]].forEach(([key, placeholder]) => {
      new import_obsidian.Setting(this.contentEl).setName(key.charAt(0).toUpperCase() + key.slice(1)).addText((text) => text.setPlaceholder(placeholder).onChange((value) => filters[key] = value));
    });
    new import_obsidian.Setting(this.contentEl).addButton((button) => button.setButtonText("Insert random-question block").setCta().onClick(() => {
      this.onSubmit(filters);
      this.close();
    }));
  }
};
