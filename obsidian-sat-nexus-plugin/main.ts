import {
  App,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  requestUrl,
} from "obsidian";

interface Choice { key: string; text: string; html?: string | null; }
interface Question {
  id: string;
  questionText: string;
  questionHtml: string | null;
  passageHtml: string | null;
  choices: Choice[] | null;
  correctAnswer: string;
  explanation: string | null;
  difficulty: string;
  domain: string;
  skill: string;
  type: "multiple_choice" | "free_response";
}
interface QuestionResponse { questions: Question[]; }
interface PluginSettings { apiBaseUrl: string; }
const DEFAULT_SETTINGS: PluginSettings = { apiBaseUrl: "" };

type BlockOptions = Record<string, string>;

/** Parse both YAML-like `id: 123` and attribute-style `id="123"` block options. */
function parseOptions(source: string): BlockOptions {
  const options: BlockOptions = {};
  for (const line of source.split(/\r?\n/)) {
    const match = line.trim().match(/^([\w-]+)\s*(?::|=)\s*(?:"([^"]*)"|'([^']*)'|(.*?))\s*$/);
    if (match) options[match[1].toLowerCase()] = (match[2] ?? match[3] ?? match[4] ?? "").trim();
  }
  return options;
}

function escapeHtml(value: string): string {
  const box = document.createElement("div");
  box.textContent = value;
  return box.innerHTML;
}

/** Retain safe formatting, turn MathML alt-text into LaTex, and remove source-only labels. */
function cleanQuestionHtml(source: string | null | undefined): string {
  const doc = new DOMParser().parseFromString(source || "", "text/html");
  doc.querySelectorAll("script, style, iframe, object, embed").forEach((node) => node.remove());
  doc.querySelectorAll("math").forEach((node) => {
    const latex = node.getAttribute("alttext") || node.textContent || "";
    node.replaceWith(doc.createTextNode(`\\(${latex}\\)`));
  });
  doc.querySelectorAll<HTMLElement>("*").forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      if (attribute.name !== "src" && attribute.name !== "alt" && attribute.name !== "href" && attribute.name !== "colspan" && attribute.name !== "rowspan") node.removeAttribute(attribute.name);
    });
  });
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  let text: Text | null;
  while ((text = walker.nextNode() as Text | null)) text.textContent = text.textContent?.replace(/\bBlank\s*(?=_{2,}|—|–)/gi, "") || "";
  return doc.body.innerHTML;
}

function typesetMath(element: HTMLElement): void {
  const mathJax = (window as unknown as { MathJax?: { typesetPromise?: (nodes: HTMLElement[]) => Promise<void> } }).MathJax;
  if (mathJax?.typesetPromise) void mathJax.typesetPromise([element]);
}

function answerMatches(answer: string, accepted: string): boolean {
  const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
  return accepted.split("|").some((item) => normalize(item) === normalize(answer));
}

export default class SatNexusQuestionsPlugin extends Plugin {
  settings: PluginSettings;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new SatNexusSettingsTab(this.app, this));

    const processor = (source: string, el: HTMLElement) => void this.renderQuestionBlock(parseOptions(source), el);
    this.registerMarkdownCodeBlockProcessor("sat-question", processor);
    this.registerMarkdownCodeBlockProcessor("quiz-question", processor);

    this.addCommand({
      id: "insert-question-by-id",
      name: "Insert SAT question by ID",
      editorCallback: (editor) => new InsertQuestionModal(this.app, (id) => {
        editor.replaceSelection(`\`\`\`sat-question\nid="${id}"\n\`\`\``);
      }).open(),
    });
    this.addCommand({
      id: "insert-filtered-question",
      name: "Insert filtered SAT question",
      editorCallback: (editor) => new InsertFilterModal(this.app, (filters) => {
        const lines = Object.entries(filters)
          .filter(([, value]) => value.trim())
          .map(([key, value]) => `${key}="${value.replaceAll('"', "'")}"`);
        editor.replaceSelection(`\`\`\`sat-question\n${lines.join("\n")}\n\`\`\``);
      }).open(),
    });
  }

  async loadSettings(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
  }

  async saveSettings(): Promise<void> { await this.saveData(this.settings); }

  private apiUrl(path: string, params?: URLSearchParams): string {
    const base = this.settings.apiBaseUrl.trim().replace(/\/$/, "");
    if (!base) throw new Error("Set your SAT Nexus API URL in Obsidian plugin settings first.");
    return `${base}${path}${params?.size ? `?${params.toString()}` : ""}`;
  }

  private async getQuestion(options: BlockOptions): Promise<Question> {
    if (options.id) {
      return (await requestUrl({ url: this.apiUrl(`/api/questions/${encodeURIComponent(options.id)}`) })).json as Question;
    }
    const params = new URLSearchParams({ random: "1", limit: "1" });
    // Plugin terminology follows the study view: section → Math/R&W,
    // domain → Algebra/Advanced Math, and skill → a precise topic such as
    // nonlinear equations. The API calls the latter two skill/subskill.
    const filterKeys: Record<string, string> = {
      section: "domain", satdomain: "domain", category: "skill", domain: "skill",
      skill: "subskill", subskill: "subskill", difficulty: "difficulty", search: "search",
    };
    for (const [blockKey, apiKey] of Object.entries(filterKeys)) {
      if (options[blockKey]) params.set(apiKey, options[blockKey]);
    }
    const response = (await requestUrl({ url: this.apiUrl("/api/questions", params) })).json as QuestionResponse;
    if (!response.questions?.[0]) throw new Error("No questions match this filter.");
    return response.questions[0];
  }

  private async renderQuestionBlock(options: BlockOptions, el: HTMLElement): Promise<void> {
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
  private drawQuestion(question: Question, options: BlockOptions, el: HTMLElement): void {
    el.empty();
    const header = el.createDiv({ cls: "sat-nexus-header" });
    header.createEl("strong", { text: "SAT Nexus question" });
    header.createSpan({ cls: "sat-nexus-chip", text: question.domain });
    header.createSpan({ cls: "sat-nexus-chip", text: question.difficulty });
    header.createSpan({ cls: "sat-nexus-chip", text: question.skill });
    const body = el.createDiv({ cls: "sat-nexus-body" });

    // Clean exported question-bank HTML before mounting it in Obsidian.
    if (question.passageHtml) body.createDiv({ cls: "sat-nexus-passage" }).innerHTML = cleanQuestionHtml(question.passageHtml);
    body.createDiv({ cls: "sat-nexus-prompt" }).innerHTML = cleanQuestionHtml(question.questionHtml || question.questionText);

    let feedback: HTMLElement;
    let explanation: HTMLElement;
    const revealFeedback = (isCorrect: boolean) => {
      feedback.setText(isCorrect ? "Correct!" : "Not quite.");
      feedback.addClass(isCorrect ? "correct" : "wrong");
      if (question.explanation) {
        explanation.innerHTML = `<strong>Explanation</strong><br>${question.explanation}`;
        explanation.show();
      }
    };

    if (question.type === "multiple_choice" && question.choices) {
      const choices = body.createDiv({ cls: "sat-nexus-choices" });
      const buttons: HTMLButtonElement[] = [];
      question.choices.forEach((choice) => {
        const button = choices.createEl("button", { cls: "sat-nexus-choice", attr: { type: "button" } });
        button.createSpan({ cls: "sat-nexus-letter", text: choice.key });
        button.createSpan({ cls: "sat-nexus-choice-text" }).innerHTML = cleanQuestionHtml(choice.html || choice.text);
        button.addEventListener("click", () => {
          const correct = answerMatches(choice.key, question.correctAnswer);
          buttons.forEach((item) => item.disabled = true);
          button.addClass(correct ? "is-correct" : "is-wrong");
          if (!correct) buttons.find((item) => item.dataset.answer === question.correctAnswer)?.addClass("is-correct");
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

    // Feedback and explanation are intentionally mounted after every answer control.
    feedback = body.createDiv({ cls: "sat-nexus-feedback" });
    explanation = body.createDiv({ cls: "sat-nexus-explanation" });
    explanation.hide();
    typesetMath(body);

    // ID embeds remain stable. Filter embeds can request another matching question.
    if (!options.id) {
      const actions = el.createDiv({ cls: "sat-nexus-actions" });
      const refresh = actions.createEl("button", { text: "Refresh question" });
      refresh.addEventListener("click", () => void this.renderQuestionBlock(options, el));
    }
  }
}

class SatNexusSettingsTab extends PluginSettingTab {
  constructor(app: App, private plugin: SatNexusQuestionsPlugin) { super(app, plugin); }
  display(): void {
    this.containerEl.empty();
    this.containerEl.createEl("h2", { text: "SAT Nexus Questions" });
    new Setting(this.containerEl)
      .setName("SAT Nexus API URL")
      .setDesc("The base URL of your deployed SAT Nexus app. Questions are fetched only when an embed is displayed or refreshed.")
      .addText((text) => text.setPlaceholder("https://your-site.vercel.app").setValue(this.plugin.settings.apiBaseUrl).onChange(async (value) => {
        this.plugin.settings.apiBaseUrl = value;
        await this.plugin.saveSettings();
      }));
  }
}

class InsertQuestionModal extends Modal {
  constructor(app: App, private onSubmit: (id: string) => void) { super(app); }
  onOpen(): void {
    this.titleEl.setText("Insert SAT question");
    let id = "";
    new Setting(this.contentEl).setName("Question ID").addText((text) => text.setPlaceholder("Question ID").onChange((value) => id = value));
    new Setting(this.contentEl).addButton((button) => button.setButtonText("Insert").setCta().onClick(() => {
      if (!id.trim()) return new Notice("Enter a question ID.");
      this.onSubmit(id.trim()); this.close();
    }));
  }
}

class InsertFilterModal extends Modal {
  constructor(app: App, private onSubmit: (filters: Record<string, string>) => void) { super(app); }
  onOpen(): void {
    this.titleEl.setText("Insert filtered SAT question");
    const filters: Record<string, string> = {};
    new Setting(this.contentEl).setName("Section").setDesc("The SAT section.").addDropdown((drop) => {
      drop.addOption("", "Any section").addOption("Math", "Math").addOption("Reading & Writing", "Reading & Writing");
      drop.onChange((value) => filters.section = value);
    });
    new Setting(this.contentEl).setName("Domain").setDesc("For example, Algebra or Advanced Math.").addDropdown((drop) => {
      drop.addOption("", "Any domain");
      ["Algebra", "Advanced Math", "Problem-Solving and Data Analysis", "Geometry and Trigonometry", "Information and Ideas", "Craft and Structure", "Expression of Ideas", "Standard English Conventions"].forEach((value) => drop.addOption(value, value));
      drop.onChange((value) => filters.domain = value);
    });
    new Setting(this.contentEl).setName("Skill").setDesc("A specific topic, such as nonlinear equations. You may also type a keyword below.").addText((text) =>
      text.setPlaceholder("e.g. Nonlinear equations in one variable").onChange((value) => filters.skill = value));
    new Setting(this.contentEl).setName("Difficulty").addDropdown((drop) => {
      drop.addOption("", "Any difficulty").addOption("Easy", "Easy").addOption("Medium", "Medium").addOption("Hard", "Hard");
      drop.onChange((value) => filters.difficulty = value);
    });
    new Setting(this.contentEl).setName("Search text").setDesc("Optional extra keyword search.").addText((text) => text.setPlaceholder("e.g. dangling modifier").onChange((value) => filters.search = value));
    new Setting(this.contentEl).addButton((button) => button.setButtonText("Insert random-question block").setCta().onClick(() => {
      this.onSubmit(filters); this.close();
    }));
  }
}
