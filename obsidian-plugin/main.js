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
  default: () => SatNexus
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var VIEW = "sat-nexus-sidebar";
var domains = ["Math", "Reading & Writing"];
var skills = { Math: ["Algebra", "Advanced Math", "Problem-Solving and Data Analysis", "Geometry and Trigonometry"], "Reading & Writing": ["Information and Ideas", "Craft and Structure", "Expression of Ideas", "Standard English Conventions"] };
var subs = { "Algebra": ["Linear equations in one variable", "Linear functions", "Linear equations in two variables", "Systems of two linear equations in two variables", "Linear inequalities in one or two variables"], "Advanced Math": ["Nonlinear functions", "Equivalent expressions"], "Problem-Solving and Data Analysis": ["Ratios, rates, proportional relationships, and units", "Percentages", "One-variable data: distributions and measures of center and spread", "Two-variable data: models and scatterplots", "Probability and conditional probability"], "Geometry and Trigonometry": ["Area and volume", "Lines, angles, and triangles", "Right triangles and trigonometry", "Circles"], "Information and Ideas": ["Central Ideas and Details", "Command of Evidence", "Inferences"], "Craft and Structure": ["Words in Context", "Text Structure and Purpose", "Cross-Text Connections"], "Expression of Ideas": ["Rhetorical Synthesis", "Transitions"], "Standard English Conventions": ["Boundaries", "Form, Structure, and Sense"] };
function clean(s) {
  return s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ");
}
function format(q) {
  var _a, _b, _c;
  return `
> [!question]- SAT Nexus \xB7 ${q.domain} \xB7 ${q.skill}
> **${q.difficulty}** \xB7 Question ID: ${q.id}
>
> ${clean(q.questionText).replace(/\n/g, "\n> ")}
${(_b = (_a = q.choices) == null ? void 0 : _a.map((c) => `> - **${c.key}.** ${clean(c.text)}`).join("\n")) != null ? _b : ""}
>
> <details><summary>Answer and explanation</summary>
>
> **Answer:** ${q.correctAnswer}
>
> ${clean((_c = q.explanation) != null ? _c : "No explanation available.")}
>
> </details>
`;
}
var SatNexus = class extends import_obsidian.Plugin {
  async onload() {
    this.settings = Object.assign({ apiUrl: "https://sat-nexus.vercel.app" }, await this.loadData());
    this.registerView(VIEW, (l) => new Sidebar(l, this.app, this.settings));
    this.addRibbonIcon("book-open", "SAT Nexus questions", () => this.open());
    this.addCommand({ id: "open-sidebar", name: "Open SAT Nexus sidebar", callback: () => this.open() });
    this.addCommand({ id: "insert-question-id", name: "Insert SAT question by ID", callback: () => new IdModal(this.app, this.settings, (q) => this.insert(q)).open() });
    this.addSettingTab(new Tab(this.app, this));
  }
  async open() {
    var _a;
    const l = (_a = this.app.workspace.getLeavesOfType(VIEW)[0]) != null ? _a : this.app.workspace.getRightLeaf(false);
    if (l) {
      await l.setViewState({ type: VIEW, active: true });
      this.app.workspace.revealLeaf(l);
    }
  }
  insert(q) {
    var _a;
    const e = (_a = this.app.workspace.activeEditor) == null ? void 0 : _a.editor;
    if (!e) {
      new import_obsidian.Notice("Open a note first");
      return;
    }
    e.replaceSelection(format(q));
    new import_obsidian.Notice("Question inserted into note");
  }
};
var IdModal = class extends import_obsidian.Modal {
  constructor(app, s, done) {
    super(app);
    this.s = s;
    this.done = done;
  }
  onOpen() {
    this.contentEl.createEl("h2", { text: "Insert SAT question" });
    const i = this.contentEl.createEl("input", { type: "text", placeholder: "Question ID" });
    i.addClass("sat-id-input");
    const b = this.contentEl.createEl("button", { text: "Find question" });
    b.addEventListener("click", async () => {
      try {
        const r = await (0, import_obsidian.requestUrl)({ url: `${this.s.apiUrl}/api/questions/${encodeURIComponent(i.value.trim())}` });
        this.done(r.json);
        this.close();
      } catch (e) {
        new import_obsidian.Notice("Question ID not found");
      }
    });
    i.focus();
  }
};
var Sidebar = class extends import_obsidian.ItemView {
  constructor(l, app, s) {
    super(l);
    this.app = app;
    this.s = s;
    this.q = null;
  }
  getViewType() {
    return VIEW;
  }
  getDisplayText() {
    return "SAT Nexus";
  }
  async onOpen() {
    this.root = this.containerEl;
    this.root.empty();
    this.root.addClass("sat-nexus-view");
    this.render();
  }
  async onClose() {
  }
  select(label, values, on) {
    const s = this.root.createEl("select");
    s.createEl("option", { text: label, value: "" });
    values.forEach((v) => s.createEl("option", { text: v, value: v }));
    s.addEventListener("change", () => on(s.value));
    return s;
  }
  render() {
    this.root.empty();
    const h = this.root.createDiv("sat-head");
    h.createEl("div", { text: "SAT NEXUS", cls: "sat-eyebrow" });
    h.createEl("h2", { text: "Question picker" });
    h.createEl("p", { text: "Find a question to study or insert into your note." });
    const id = this.root.createDiv("sat-id-row");
    const input = id.createEl("input", { type: "text", placeholder: "Enter question ID\u2026" });
    const go = id.createEl("button", { text: "Insert" });
    go.onclick = async () => {
      try {
        const r = await (0, import_obsidian.requestUrl)({ url: `${this.s.apiUrl}/api/questions/${encodeURIComponent(input.value.trim())}` });
        this.q = r.json;
        this.render();
      } catch (e) {
        new import_obsidian.Notice("Question ID not found");
      }
    };
    this.root.createEl("div", { text: "FILTER QUESTIONS", cls: "sat-label" });
    let domain = "", skill = "", sub = "", difficulty = "";
    this.select("Section", domains, (v) => {
      domain = v;
      this.renderFilter(domain, skill, sub, difficulty);
    });
    this.renderFilter(domain, skill, sub, difficulty);
    if (this.q) this.renderQuestion();
  }
  renderFilter(domain, skill, sub, difficulty) {
    var _a;
    const old = this.root.querySelector(".sat-filters");
    old == null ? void 0 : old.remove();
    const box = this.root.createDiv("sat-filters");
    const a = this.selectIn(box, "Category", domain ? skills[domain] : [], (v) => {
      skill = v;
      sub = "";
    });
    this.selectIn(box, "Subcategory", skill ? (_a = subs[skill]) != null ? _a : [] : [], (v) => sub = v);
    this.selectIn(box, "Difficulty", ["Easy", "Medium", "Hard"], (v) => difficulty = v);
    const b = box.createEl("button", { text: "\u21BB  Random question", cls: "sat-random" });
    b.onclick = async () => {
      var _a2;
      const p = new URLSearchParams({ random: "1", limit: "1" });
      if (domain) p.set("domain", domain);
      if (skill) p.set("skill", skill);
      if (sub) p.set("subskill", sub);
      if (difficulty) p.set("difficulty", difficulty);
      try {
        const r = await (0, import_obsidian.requestUrl)({ url: `${this.s.apiUrl}/api/questions?${p}` });
        this.q = (_a2 = r.json.questions) == null ? void 0 : _a2[0];
        this.render();
      } catch (e) {
        new import_obsidian.Notice("Could not load questions");
      }
    };
  }
  selectIn(box, label, values, on) {
    const s = box.createEl("select");
    s.createEl("option", { text: label });
    values.forEach((v) => s.createEl("option", { text: v, value: v }));
    s.onchange = () => on(s.value);
    return s;
  }
  renderQuestion() {
    var _a;
    if (!this.q) return;
    const q = this.q, card = this.root.createDiv("sat-question-card");
    card.createEl("div", { text: `${q.domain}  \xB7  ${q.skill}`, cls: "sat-question-meta" });
    card.createEl("div", { text: q.difficulty, cls: "sat-difficulty" });
    if (q.passage) card.createEl("div", { text: clean(q.passage), cls: "sat-passage" });
    card.createEl("div", { text: clean(q.questionText), cls: "sat-question-text" });
    (_a = q.choices) == null ? void 0 : _a.forEach((c) => {
      const row = card.createEl("button", { text: `${c.key}   ${clean(c.text)}`, cls: "sat-choice" });
      row.onclick = () => {
        row.addClass(c.key === q.correctAnswer ? "sat-correct" : "sat-wrong");
        new import_obsidian.Notice(c.key === q.correctAnswer ? "Correct" : "Try again");
      };
    });
    const actions = card.createDiv("sat-actions");
    const insert = actions.createEl("button", { text: "Insert into note", cls: "sat-insert" });
    insert.onclick = () => {
      var _a2;
      const e = (_a2 = this.app.workspace.activeEditor) == null ? void 0 : _a2.editor;
      if (e) {
        e.replaceSelection(format(q));
        new import_obsidian.Notice("Question inserted into note");
      }
    };
    const next = actions.createEl("button", { text: "\u21BB Another like this" });
    next.onclick = () => {
      const p = new URLSearchParams({ random: "1", limit: "1", domain: q.domain, skill: q.skill });
      (0, import_obsidian.requestUrl)({ url: `${this.s.apiUrl}/api/questions?${p}` }).then((r) => {
        var _a2;
        this.q = (_a2 = r.json.questions) == null ? void 0 : _a2[0];
        this.render();
      });
    };
  }
};
var Tab = class extends import_obsidian.PluginSettingTab {
  constructor(app, p) {
    super(app, p);
    this.p = p;
  }
  display() {
    this.containerEl.empty();
    new import_obsidian.Setting(this.containerEl).setName("SAT Nexus URL").setDesc("URL of your deployed website").addText((t) => t.setValue(this.p.settings.apiUrl).onChange(async (v) => {
      this.p.settings.apiUrl = v.replace(/\/$/, "");
      await this.p.saveData(this.p.settings);
    }));
  }
};
