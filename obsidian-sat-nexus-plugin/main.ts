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

/** Parse `key="value"`, `key=value`, and one-per-line code-block options. */
function parseOptions(source: string): BlockOptions {
  const options: BlockOptions = {};
  const matcher = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s\n]+))/g;
  for (const match of source.matchAll(matcher)) {
    options[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return options;
}

function escapeHtml(value: string): string {
  const box = document.createElement("div");
  box.textContent = value;
  return box.innerHTML;
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

    this.registerMarkdownCodeBlockProcessor("sat-question", (source, el) => {
      void this.renderQuestionBlock(parseOptions(source), el);
    });

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
    const filterKeys: Record<string, string> = { section: "domain", domain: "domain", skill: "skill", subskill: "subskill", difficulty: "difficulty", search: "search" };
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

    // SAT Nexus supplies question HTML (including figures/math) from its trusted question bank.
    if (question.passageHtml) body.createDiv({ cls: "sat-nexus-passage" }).innerHTML = question.passageHtml;
    body.createDiv({ cls: "sat-nexus-prompt" }).innerHTML = question.questionHtml || escapeHtml(question.questionText);

    const feedback = body.createDiv({ cls: "sat-nexus-feedback" });
    const explanation = body.createDiv({ cls: "sat-nexus-explanation" });
    explanation.hide();
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
        button.createSpan({ cls: "sat-nexus-choice-text" }).innerHTML = choice.html || escapeHtml(choice.text);
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
    [["section", "Math or Reading & Writing"], ["skill", "e.g. Expression of Ideas"], ["subskill", "Optional"], ["difficulty", "Easy, Medium, or Hard"], ["search", "Keyword, e.g. dangling modifier"]].forEach(([key, placeholder]) => {
      new Setting(this.contentEl).setName(key.charAt(0).toUpperCase() + key.slice(1)).addText((text) => text.setPlaceholder(placeholder).onChange((value) => filters[key] = value));
    });
    new Setting(this.contentEl).addButton((button) => button.setButtonText("Insert random-question block").setCta().onClick(() => {
      this.onSubmit(filters); this.close();
    }));
  }
}
