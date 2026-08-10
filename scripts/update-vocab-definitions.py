import json, os, runpy

os.chdir(os.path.dirname(os.path.abspath(__file__)))

ns = runpy.run_path("mw_definitions_part1.py")
MW = ns["MW"]
runpy.run_path("mw_definitions_part2.py", init_globals={"MW": MW})
runpy.run_path("mw_definitions_part3.py", init_globals={"MW": MW})

path = "../src/data/vocabulary.json"
data = json.load(open(path))
updated = multi = 0
for entry in data:
    senses = MW.get(entry["term"])
    if not senses:
        continue
    entry["definition"] = senses[0]
    if len(senses) > 1:
        entry["definitions"] = senses
        multi += 1
    else:
        entry.pop("definitions", None)
    updated += 1

ordered = []
for entry in data:
    keys = ["id", "term", "phonetic", "difficulty", "definition", "definitions", "example"]
    ordered.append({k: entry[k] for k in keys if k in entry})

with open(path, "w") as f:
    json.dump(ordered, f, indent=2, ensure_ascii=False)
    f.write("\n")

missing = [e["term"] for e in data if e["term"] not in MW]
print(f"updated {updated} entries ({multi} with multiple senses) of {len(data)}; missing: {missing}")
