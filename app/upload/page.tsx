"use client";
import { useCallback, useRef, useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { UploadCloud, FileScan, CheckCircle2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { tesseractEngine } from "@/lib/ocr/tesseract-adapter";
import { parseSATFromText } from "@/lib/ocr/engine";
import { OCRResult, SATQuestion } from "@/lib/types";
import { useBank } from "@/lib/store";
import { toast } from "sonner";

async function pdfToImages(file: File): Promise<Blob[]> {
  try {
    const pdfjs: any = await import("pdfjs-dist/build/pdf");
    // @ts-ignore
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.min.js`;
    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    const pages: Blob[] = [];
    for (let p = 1; p <= Math.min(pdf.numPages, 60); p++) {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), "image/png", 0.92)!);
      pages.push(blob);
    }
    return pages;
  } catch (e) {
    console.warn("PDF split failed, falling back", e);
    return [];
  }
}

export default function UploadPage() {
  const [queue, setQueue] = useState<{file:string, status:string, progress:number}[]>([]);
  const [results, setResults] = useState<OCRResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const upsert = useBank(s=>s.upsert);

  // better structured OCR handler
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files);
    // expand PDFs into page images
    let expanded: {name:string, blob: Blob}[] = [];
    for (const f of list) {
      if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
        toast.info(`Splitting PDF ${f.name} …`);
        const pages = await pdfToImages(f);
        if (pages.length) {
          pages.forEach((pg,i)=> expanded.push({name: `${f.name} · p${i+1}`, blob: pg}));
        } else {
          expanded.push({name: f.name, blob: f});
        }
      } else {
        expanded.push({name: f.name, blob: f});
      }
    }

    setQueue(expanded.map(e=>({file:e.name, status:"queued", progress:0})));
    const out: OCRResult[] = [];
    for (let i=0;i<expanded.length;i++){
      setQueue(q=> q.map((x,idx)=> idx===i? {...x, status:"OCR…", progress:25}:x));
      try {
        const rec = await tesseractEngine.recognize(expanded[i].blob);
        setQueue(q=> q.map((x,idx)=> idx===i? {...x, progress:72, status:"parsing"}:x));
        // College Board pages often contain 1-2 questions — try split
        const chunks = rec.text.split(/Question ID|ID:\s*[a-z0-9]{6,}/i);
        // re-attach ID prefix
        const texts = chunks.length > 1 ? chunks.map((c,idx)=> idx===0?c:`Question ID ${c}`) .filter(t=>t.trim().length>40) : [rec.text];
        for (const t of texts) {
          const parsed = await parseSATFromText(t, rec.confidence);
          out.push(parsed);
        }
        setQueue(q=> q.map((x,idx)=> idx===i? {...x, status:"parsed", progress:100}:x));
      } catch(e:any){
        setQueue(q=> q.map((x,idx)=> idx===i? {...x, status:"error"}:x));
      }
    }
    setResults(out);
    toast.success(`OCR finished: ${out.length} question(s) extracted`);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="px-6 lg:px-10 py-8 max-w-6xl mx-auto">
      <h1 className="text-[32px] font-display font-[680] tracking-tight">Import Questions</h1>
      <p className="text-ink-soft mt-1">College Board direct scraper • manual add • legacy OCR removed. Structured extraction → answer boxes.</p>

      <div className="grid lg:grid-cols-3 gap-6 mt-7">
        <GlassCard className="lg:col-span-2 p-7">
          <div
            onDragOver={e=>e.preventDefault()}
            onDrop={onDrop}
            onClick={()=>inputRef.current?.click()}
            className="border border-dashed border-neon-cyan/35 rounded-[20px] p-10 text-center cursor-pointer bg-[#0a1014]/50 hover:bg-[#0a141a]/80 transition-all"
          >
            <UploadCloud className="mx-auto text-neon-cyan mb-3" />
            <div className="font-[600]">Drop SAT screenshots, images, or PDFs</div>
            <div className="text-sm text-ink-soft mt-1">Bulk PDF supported • auto page split • 10 / 50 / 100+ files</div>
            <div className="text-[11px] text-ink-soft mt-3">Extracts → question stem • A/B/C/D • correct answer • difficulty • domain/skill • math</div>
            <input ref={inputRef} type="file" multiple accept="image/*,.pdf,application/pdf" className="hidden"
              onChange={e=> e.target.files && handleFiles(e.target.files)} />
          </div>

          <AnimatePresence>
            {queue.length>0 && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} className="mt-6 space-y-2">
                {queue.map((q,i)=>(
                  <div key={i} className="flex items-center gap-3 text-sm glass-subtle rounded-xl px-3 py-2">
                    <FileScan size={15} className="text-neon-cyan"/>
                    <div className="flex-1 truncate">{q.file}</div>
                    <div className="text-ink-soft text-xs w-28 text-right">{q.status}</div>
                    <div className="w-32 h-[5px] bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-neon-cyan" style={{width: `${q.progress}%`}} />
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="text-[12px] uppercase tracking-wider text-ink-soft">OCR Engine</div>
          <div className="text-lg font-[600] mt-1">tesseract.js v5 • CB tuned</div>
          <ul className="text-[13px] text-ink-soft mt-3 space-y-1">
            <li>• Knows CB layout: ID, Domain, Skill</li>
            <li>• Extracts A/B/C/D → answer boxes</li>
            <li>• Free-response numeric detect</li>
            <li>• PDF.js page-by-page</li>
            <li>• Multi-question per page split</li>
            <li>• Manual correction always allowed</li>
          </ul>
          <div className="mt-4 text-[12px] text-neon-green">Ready • 3 verified CB Qs in bank</div>
        </GlassCard>
      </div>

      {results.length>0 && (
        <div className="mt-10">
          <h2 className="text-xl font-[600] mb-4">OCR Review • {results.length} extracted</h2>
          <div className="space-y-5">
            {results.map((r,idx)=> <OCRReviewCard key={idx} r={r} onAccept={(qq)=>{ upsert(qq as SATQuestion); toast.success("Saved to bank"); }} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function OCRReviewCard({ r, onAccept }: { r: OCRResult; onAccept: (q:any)=>void }) {
  const [edit, setEdit] = useState<any>({
    ...r.fields,
    choices: r.fields.choices || [
      {key:"A", text:""},
      {key:"B", text:""},
      {key:"C", text:""},
      {key:"D", text:""},
    ]
  });

  const setChoice = (key:string, val:string) => {
    const choices = [...(edit.choices||[])];
    const idx = choices.findIndex((c:any)=>c.key===key);
    if (idx>=0) choices[idx] = {...choices[idx], text: val};
    else choices.push({key, text: val});
    setEdit({...edit, choices});
  };

  const isMCQ = (edit.choices||[]).some((c:any)=>c.text?.trim());

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-mono text-ink-soft">{edit.id}</div>
        <div className={`text-xs px-2 py-1 rounded-full ${r.confidence>80 ? "text-neon-green" : "text-neon-amber"} bg-white/[.05]`}>
          {r.confidence.toFixed(0)}% confidence
        </div>
      </div>
      {r.warnings.length>0 && (
        <div className="text-[12px] text-amber-300 flex gap-2 mb-3"><AlertTriangle size={14}/>{r.warnings.join(" • ")}</div>
      )}

      <label className="block text-[11px] text-ink-soft mb-1 uppercase tracking-wider">Question Stem</label>
      <textarea
        value={edit.questionText||""}
        onChange={e=>setEdit({...edit, questionText:e.target.value})}
        className="w-full h-28 bg-[#0a1014] border border-paper-300 rounded-xl p-3 text-sm"
      />

      {/* Answer Choices → explicit boxes */}
      <div className="mt-4">
        <div className="text-[11px] uppercase tracking-wider text-ink-soft mb-2">Answer Choices</div>
        <div className="grid md:grid-cols-2 gap-3">
          {(["A","B","C","D"] as const).map(k=>(
            <div key={k} className="flex gap-2 items-center">
              <span className="text-neon-cyan font-mono text-[12px] w-5">{k}</span>
              <input
                value={(edit.choices?.find((c:any)=>c.key===k)?.text) || ""}
                onChange={e=>setChoice(k, e.target.value)}
                placeholder={`${k} text…`}
                className="flex-1 bg-[#0a1014] border border-paper-300 rounded-xl px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
        <div className="text-[11px] text-ink-soft mt-2">Leave choices blank for free-response SPR.</div>
      </div>

      <div className="grid sm:grid-cols-4 gap-3 mt-4 text-sm">
        <div>
          <div className="text-[11px] text-ink-soft mb-1">Correct Answer</div>
          <input className="w-full bg-[#0a1014] border border-neon-cyan/30 rounded-xl px-3 py-2"
            value={edit.correctAnswer||""}
            onChange={e=>setEdit({...edit, correctAnswer:e.target.value})}
            placeholder="D or 403"
          />
        </div>
        <div>
          <div className="text-[11px] text-ink-soft mb-1">Domain</div>
          <select className="w-full bg-[#0a1014] border border-paper-300 rounded-xl px-3 py-2"
            value={edit.domain||"Math"}
            onChange={e=>setEdit({...edit, domain:e.target.value})}>
            <option>Math</option>
            <option>Reading & Writing</option>
          </select>
        </div>
        <div>
          <div className="text-[11px] text-ink-soft mb-1">Skill</div>
          <input className="w-full bg-[#0a1014] border border-paper-300 rounded-xl px-3 py-2"
            value={edit.skill||""}
            onChange={e=>setEdit({...edit, skill:e.target.value})}
          />
        </div>
        <div>
          <div className="text-[11px] text-ink-soft mb-1">Difficulty</div>
          <select className="w-full bg-[#0a1014] border border-paper-300 rounded-xl px-3 py-2"
            value={edit.difficulty||"Medium"}
            onChange={e=>setEdit({...edit, difficulty:e.target.value})}>
            <option>Easy</option><option>Medium</option><option>Hard</option><option>Very Hard</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 justify-end mt-5">
        <button className="px-3 py-2 rounded-xl glass-subtle text-sm">Discard</button>
        <button
          onClick={()=>onAccept({
            ...edit,
            choices: (edit.choices||[]).filter((c:any)=>c.text?.trim()),
            explanation: edit.explanation || "",
            tags: [],
            timesAnswered:0, timesCorrect:0, mastery:0,
            createdAt: new Date().toISOString(),
            type: (edit.choices||[]).some((c:any)=>c.text?.trim()) ? "multiple_choice":"free_response",
            subskill: edit.subskill || "Imported",
            skill: edit.skill || "Algebra",
            domain: edit.domain || "Math",
          })}
          className="px-4 py-2 rounded-xl bg-neon-green text-black font-[600] text-sm flex items-center gap-1.5">
          <CheckCircle2 size={15}/> Accept → Bank
        </button>
      </div>

      <details className="mt-4">
        <summary className="text-[11px] text-ink-soft cursor-pointer">Show raw OCR</summary>
        <pre className="text-[10px] text-ink-soft whitespace-pre-wrap mt-2 max-h-40 overflow-auto">{r.rawText.slice(0,2000)}</pre>
      </details>
    </GlassCard>
  );
}
