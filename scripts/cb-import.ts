/**
 * SAT Nexus – College Board bulk scraper v3
 * - Removes OCR completely
 * - Scrapes qbank-api.collegeboard.org directly
 * - Handles Math + R&W, external_id + ibn (disclosed)
 * - Preserves HTML for graphs / tables / math
 */
import fs from "fs";
import path from "path";

const DOMAINS = [
  { test: 2, domain: "H", name: "Algebra", cbDomain: "Math" },
  { test: 2, domain: "P", name: "Advanced Math", cbDomain: "Math" },
  { test: 2, domain: "Q", name: "Problem-Solving and Data Analysis", cbDomain: "Math" },
  { test: 2, domain: "S", name: "Geometry and Trigonometry", cbDomain: "Math" },
  { test: 1, domain: "INI", name: "Information and Ideas", cbDomain: "Reading & Writing" },
  { test: 1, domain: "CAS", name: "Craft and Structure", cbDomain: "Reading & Writing" },
  { test: 1, domain: "EOI", name: "Expression of Ideas", cbDomain: "Reading & Writing" },
  { test: 1, domain: "SEC", name: "Standard English Conventions", cbDomain: "Reading & Writing" },
];

const sleep = (ms:number)=>new Promise(r=>setTimeout(r,ms));

async function fetchList(test:number, domain:string){
  const res = await fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions", {
    method: "POST",
    headers: { "Content-Type":"application/json", "Accept":"application/json", "User-Agent":"SAT-Nexus/3.0" },
    body: JSON.stringify({ asmtEventId: 99, test, domain })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function fetchQuestionCB(external_id:string){
  const res = await fetch("https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-question", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Accept":"application/json"},
    body: JSON.stringify({ external_id })
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchDisclosed(ibn:string){
  try {
    const res = await fetch(`https://saic.collegeboard.org/disclosed/${ibn}.json`, { headers:{ "Accept":"application/json"}});
    if (!res.ok) return null;
    const arr = await res.json();
    return Array.isArray(arr) ? arr[0] : null;
  } catch { return null; }
}

function toText(html:string){ if(!html) return ""; return html.replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim(); }

async function main(){
  const allMeta:any[] = [];
  for (const d of DOMAINS){
    console.log(`→ ${d.name} (${d.domain}) test=${d.test}`);
    try{
      const list = await fetchList(d.test, d.domain);
      console.log(`   ${list.length} metas`);
      allMeta.push(...list.map((m:any)=>({...m, _d:d})));
      await sleep(500);
    }catch(e){ console.error("list failed", d.domain, e);}
  }
  // dedupe
  const uniq = new Map();
  for (const m of allMeta) uniq.set(m.questionId, m);
  const metas = [...uniq.values()];
  console.log(`\nUnique questionIds: ${metas.length}`);

  const out:any[] = [];
  let ok=0, fail=0, skip=0;
  for (let i=0;i<metas.length;i++){
    const meta = metas[i];
    const qid = meta.questionId;
    const ext = meta.external_id;
    const ibn = meta.ibn;
    process.stdout.write(`\r${i+1}/${metas.length} ${qid} ${ext ? "ext":""}${ibn?" ibn":""}   `);

    let qdata:any = null;
    let source: "cb"|"disclosed"|null = null;

    if (ext){
      qdata = await fetchQuestionCB(ext).catch(()=>null);
      if (qdata) source="cb";
    }
    if (!qdata && ibn){
      const d = await fetchDisclosed(ibn);
      if (d){
        // normalize disclosed shape to CB shape
        qdata = {
          type: d.answer?.style === "Multiple Choice" ? "mcq" : "spr",
          stem: d.prompt || "",
          stimulus: d.body || "",
          answerOptions: d.answer?.choices ? {
            A: d.answer.choices.a?.body || "",
            B: d.answer.choices.b?.body || "",
            C: d.answer.choices.c?.body || "",
            D: d.answer.choices.d?.body || "",
          } : undefined,
          correct_answer: d.answer?.correct_choice ? [d.answer.correct_choice.toUpperCase()] : [],
          rationale: d.answer?.rationale || ""
        };
        source="disclosed";
      }
    }

    if (!qdata){ fail++; await sleep(80); continue; }

    try{
      // Preserve HTML for rich media (graphs, tables)
      const stemHtml = qdata.stem || "";
      const stimulusHtml = qdata.stimulus || "";
      // choices may be object or array
      let choices;
      if (qdata.answerOptions){
        if (Array.isArray(qdata.answerOptions)){
          choices = qdata.answerOptions.map((opt:any, idx:number)=>({
            key: ["A","B","C","D"][idx],
            text: opt.content || opt,
            html: opt.content || ""
          }));
        } else {
          choices = Object.entries(qdata.answerOptions).map(([k,v]:any)=>({
            key: k.toUpperCase(),
            text: String(v), // keep HTML for rich media
            html: String(v)
          }));
        }
        choices = choices.filter((c:any)=>c.text || c.html);
      }

      const correctAns = Array.isArray(qdata.correct_answer) ? qdata.correct_answer[0] : qdata.correct_answer;
      const domainStr = meta._d.cbDomain as "Math" | "Reading & Writing";

      out.push({
        id: meta.questionId,
        questionText: toText(stemHtml) || toText(stimulusHtml).slice(0,400),
        questionHtml: stemHtml,
        passageHtml: stimulusHtml || null,
        passage: stimulusHtml ? toText(stimulusHtml) : null,
        imageUrl: null, // images stay inline in HTML
        mathExpression: null,
        choices: choices?.map((c:any)=>({key:c.key, text:c.text})),
        choicesHtml: choices,
        correctAnswer: String(correctAns || "").toUpperCase(),
        explanation: qdata.rationale || "",
        explanationHtml: qdata.rationale || "",
        difficulty: meta.difficulty==="E" ? "Easy" : meta.difficulty==="M" ? "Medium" : meta.difficulty==="H" ? "Hard" : "Medium",
        domain: domainStr,
        skill: meta.primary_class_cd_desc,
        subskill: meta.skill_desc,
        source: "College Board SAT Question Bank",
        tags: [meta.skill_cd, source||""].filter(Boolean),
        timesAnswered: 0,
        timesCorrect: 0,
        mastery: 0,
        createdAt: new Date().toISOString(),
        type: qdata.type === "mcq" ? "multiple_choice" : "free_response",
        favorite: false
      });
      ok++;
    }catch(e){ fail++; }
    await sleep(55);
  }

  console.log(`\n\nImported OK: ${ok}  Failed: ${fail}`);
  const byDomain = out.reduce((a:any,q)=>{a[q.domain]=(a[q.domain]||0)+1; return a;}, {});
  console.log("By domain:", byDomain);

  const outPath = path.join(process.cwd(), "prisma", "cb-full.json");
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("Wrote", outPath, `(${(fs.statSync(outPath).size/1024/1024).toFixed(2)} MB)`);
  console.log("\nNext:\n  npm run cb:seed\n  # then: npm run dev → Bank will auto-sync from /api/questions");
}

main();
