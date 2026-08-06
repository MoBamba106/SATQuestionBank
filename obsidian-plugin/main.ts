import { App, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, requestUrl } from "obsidian";

interface Settings { apiUrl: string; defaultDomain: string; }
const DEFAULT: Settings = { apiUrl: "https://sat-nexus.vercel.app", defaultDomain: "" };
type Question = { id:string; questionText:string; questionHtml?:string|null; passage?:string|null; choices?:{key:string;text:string}[]|null; correctAnswer:string; explanation?:string|null; difficulty:string; domain:string; skill:string; subskill?:string|null };

export default class SatNexusPlugin extends Plugin {
  settings!: Settings;
  async onload() {
    await this.loadSettings();
    this.addCommand({ id:"insert-question", name:"Insert SAT question", editorCallback:(_e, editor) => new QuestionModal(this.app, this.settings, q => editor.replaceSelection(formatQuestion(q))).open() });
    this.addCommand({ id:"study-question", name:"Study a random SAT question", callback:() => new QuestionModal(this.app, this.settings, q => new Notice(`Answer: ${q.correctAnswer}\n${q.explanation ?? ""}`)).open() });
    this.addRibbonIcon("book-open", "Insert SAT question", () => this.app.workspace.activeEditor?.editor && new QuestionModal(this.app, this.settings, q => this.app.workspace.activeEditor?.editor?.replaceSelection(formatQuestion(q))).open());
    this.addSettingTab(new SatSettingsTab(this.app, this));
  }
  async loadSettings(){ this.settings = Object.assign({}, DEFAULT, await this.loadData()); }
  async saveSettings(){ await this.saveData(this.settings); }
}

class QuestionModal extends Modal {
  constructor(app:App, private settings:Settings, private done:(q:Question)=>void){ super(app); }
  async onOpen(){
    const {contentEl}=this; contentEl.empty(); contentEl.createEl("h2",{text:"Insert from SAT Nexus"});
    contentEl.createEl("p",{text:"Choose a question type, or leave it random."});
    const domain = contentEl.createEl("select"); ["Any type","Math","Reading & Writing"].forEach(x=>domain.createEl("option",{text:x,value:x==="Any type"?"":x}));
    const skill = contentEl.createEl("input",{type:"text",placeholder:"Optional skill (e.g. Linear equations)"});
    const results = contentEl.createDiv({cls:"sat-nexus-results"});
    const button=contentEl.createEl("button",{text:"Find questions"}); button.addEventListener("click",async()=>{
      button.disabled=true; results.setText("Loading questions…");
      try { const p=new URLSearchParams({random:"1",limit:"5"}); if(domain.value)p.set("domain",domain.value); if(skill.value)p.set("search",skill.value); const response=await requestUrl({url:`${this.settings.apiUrl.replace(/\/$/,"")}/api/questions?${p}`}); const questions=(response.json.questions??[]) as Question[]; results.empty(); if(!questions.length){results.setText("No matching questions found.");return;} questions.forEach(q=>{const row=results.createDiv({cls:"sat-nexus-result"}); row.createEl("strong",{text:`${q.domain} · ${q.skill} · ${q.difficulty}`}); row.createEl("p",{text:q.questionText.replace(/<[^>]*>/g,"").slice(0,220)}); const insert=row.createEl("button",{text:"Insert this question"}); insert.addEventListener("click",()=>{this.done(q);this.close();});}); }
      catch(e){results.setText(`Could not connect to SAT Nexus. Check the API URL in settings. ${e}`);} finally {button.disabled=false;}
    });
  }
}
function formatQuestion(q:Question){ const choices=q.choices?.map(c=>`- **${c.key}.** ${c.text}`).join("\n")??""; return `\n> [!question]- SAT Nexus · ${q.domain} · ${q.skill}\n> **${q.difficulty}** · ID: ${q.id}\n>\n> ${q.questionText.replace(/\n/g,"\n> ")}\n${choices}\n>\n> **Answer:** ${q.correctAnswer}\n> **Explanation:** ${q.explanation??"Open SAT Nexus to work through this question."}\n`; }
class SatSettingsTab extends PluginSettingTab { constructor(app:App,private plugin:SatNexusPlugin){super(app,plugin);} display(){const e=this.containerEl;e.empty();e.createEl("h2",{text:"SAT Nexus connection"});new Setting(e).setName("SAT Nexus URL").setDesc("Your deployed SAT Nexus URL").addText(t=>t.setValue(this.plugin.settings.apiUrl).onChange(async v=>{this.plugin.settings.apiUrl=v;await this.plugin.saveSettings();}));} }
