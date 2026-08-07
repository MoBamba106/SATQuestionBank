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
  for (const line of source.split(/\r?\n/)) {
    const match = line.trim().match(/^([\w-]+)\s*(?::|=)\s*(?:"([^"]*)"|'([^']*)'|(.*?))\s*$/);
    if (match) options[match[1].toLowerCase()] = ((_c = (_b = (_a = match[2]) != null ? _a : match[3]) != null ? _b : match[4]) != null ? _c : "").trim();
  }
  return options;
}
function cleanQuestionHtml(source) {
  var _a;
  const doc = new DOMParser().parseFromString(source || "", "text/html");
  doc.querySelectorAll("script, style, iframe, object, embed").forEach((node) => node.remove());
  doc.querySelectorAll("math").forEach((node) => {
    const latex = node.getAttribute("alttext") || node.textContent || "";
    node.replaceWith(doc.createTextNode(`\\(${latex}\\)`));
  });
  doc.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      if (attribute.name !== "src" && attribute.name !== "alt" && attribute.name !== "href" && attribute.name !== "colspan" && attribute.name !== "rowspan") node.removeAttribute(attribute.name);
    });
  });
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  let text;
  while (text = walker.nextNode()) text.textContent = ((_a = text.textContent) == null ? void 0 : _a.replace(/\bBlank\s*(?=_{2,}|—|–)/gi, "")) || "";
  return doc.body.innerHTML;
}
function typesetMath(element) {
  const mathJax = window.MathJax;
  if (mathJax == null ? void 0 : mathJax.typesetPromise) void mathJax.typesetPromise([element]);
}
function answerMatches(answer, accepted) {
  const normalize = (value) => value.trim().toLowerCase().replace(/\s+/g, " ");
  return accepted.split("|").some((item) => normalize(item) === normalize(answer));
}
var SatNexusQuestionsPlugin = class extends import_obsidian.Plugin {
  async onload() {
    await this.loadSettings();
    this.addSettingTab(new SatNexusSettingsTab(this.app, this));
    const processor = (source, el) => void this.renderQuestionBlock(parseOptions(source), el);
    this.registerMarkdownCodeBlockProcessor("sat-question", processor);
    this.registerMarkdownCodeBlockProcessor("quiz-question", processor);
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
    const filterKeys = {
      section: "domain",
      satdomain: "domain",
      category: "skill",
      domain: "skill",
      skill: "subskill",
      subskill: "subskill",
      difficulty: "difficulty",
      search: "search"
    };
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
    if (question.passageHtml) body.createDiv({ cls: "sat-nexus-passage" }).innerHTML = cleanQuestionHtml(question.passageHtml);
    body.createDiv({ cls: "sat-nexus-prompt" }).innerHTML = cleanQuestionHtml(question.questionHtml || question.questionText);
    let feedback;
    let explanation;
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
        button.createSpan({ cls: "sat-nexus-choice-text" }).innerHTML = cleanQuestionHtml(choice.html || choice.text);
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
    feedback = body.createDiv({ cls: "sat-nexus-feedback" });
    explanation = body.createDiv({ cls: "sat-nexus-explanation" });
    explanation.hide();
    typesetMath(body);
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
    new import_obsidian.Setting(this.contentEl).setName("Section").setDesc("The SAT section.").addDropdown((drop) => {
      drop.addOption("", "Any section").addOption("Math", "Math").addOption("Reading & Writing", "Reading & Writing");
      drop.onChange((value) => filters.section = value);
    });
    new import_obsidian.Setting(this.contentEl).setName("Domain").setDesc("For example, Algebra or Advanced Math.").addDropdown((drop) => {
      drop.addOption("", "Any domain");
      ["Algebra", "Advanced Math", "Problem-Solving and Data Analysis", "Geometry and Trigonometry", "Information and Ideas", "Craft and Structure", "Expression of Ideas", "Standard English Conventions"].forEach((value) => drop.addOption(value, value));
      drop.onChange((value) => filters.domain = value);
    });
    new import_obsidian.Setting(this.contentEl).setName("Skill").setDesc("A specific topic, such as nonlinear equations. You may also type a keyword below.").addText((text) => text.setPlaceholder("e.g. Nonlinear equations in one variable").onChange((value) => filters.skill = value));
    new import_obsidian.Setting(this.contentEl).setName("Difficulty").addDropdown((drop) => {
      drop.addOption("", "Any difficulty").addOption("Easy", "Easy").addOption("Medium", "Medium").addOption("Hard", "Hard");
      drop.onChange((value) => filters.difficulty = value);
    });
    new import_obsidian.Setting(this.contentEl).setName("Search text").setDesc("Optional extra keyword search.").addText((text) => text.setPlaceholder("e.g. dangling modifier").onChange((value) => filters.search = value));
    new import_obsidian.Setting(this.contentEl).addButton((button) => button.setButtonText("Insert random-question block").setCta().onClick(() => {
      this.onSubmit(filters);
      this.close();
    }));
  }
};
