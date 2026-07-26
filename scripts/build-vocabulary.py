#!/usr/bin/env python3
"""Build the checked-in SAT Nexus vocabulary deck from attributed open data.

Generation sources (not runtime dependencies):
- NAWL/word.lists (CC BY-SA 4.0) for academic headwords
- Open English WordNet (CC BY 4.0 + WordNet license) for definitions/examples
- open-dict-data/ipa-dict (MIT) for US IPA pronunciations

Expected local source paths can be overridden with environment variables.
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path

import pyreadr
import yaml
from wordfreq import zipf_frequency

WORDLISTS = Path(os.environ.get("WORDLISTS_DIR", "/tmp/wordlists"))
OEWN = Path(os.environ.get("OEWN_DIR", "/tmp/oewn"))
IPA = Path(os.environ.get("IPA_DIR", "/tmp/ipa-dict"))
OUTPUT = Path(__file__).resolve().parents[1] / "src" / "data" / "vocabulary.json"
TARGET = 600


def load_ipa() -> dict[str, str]:
    result: dict[str, str] = {}
    for line in (IPA / "data" / "en_US.txt").read_text(encoding="utf-8").splitlines():
        if "\t" not in line:
            continue
        word, value = line.split("\t", 1)
        word = word.lower()
        if word not in result:
            result[word] = value.split(", ")[0]
    return result


def load_synsets() -> dict[str, dict]:
    result: dict[str, dict] = {}
    for path in (OEWN / "src" / "yaml").glob("*.yaml"):
        if path.name.startswith("entries-"):
            continue
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        result.update(data)
    return result


def load_entries_for(letter: str) -> dict:
    path = OEWN / "src" / "yaml" / f"entries-{letter}.yaml"
    if not path.exists():
        return {}
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def first_sense(entry: dict) -> tuple[str | None, str | None]:
    for pos in ("v", "a", "n", "r", "s"):
        value = entry.get(pos)
        if not isinstance(value, dict):
            continue
        senses = value.get("sense") or []
        if senses:
            pronunciation = value.get("pronunciation") or []
            spoken = pronunciation[0].get("value") if pronunciation and isinstance(pronunciation[0], dict) else None
            return senses[0].get("synset"), spoken
    return None, None


def difficulty(word: str) -> str:
    frequency = zipf_frequency(word, "en")
    if frequency >= 4.15:
        return "Easy"
    if frequency >= 3.85:
        return "Medium"
    return "Hard"


def main() -> None:
    frame = pyreadr.read_r(str(WORDLISTS / "data" / "list_academic.rda"))["list_academic"]
    candidates = []
    seen = set()
    preferred = [
        "abate", "ambivalent", "bolster", "corroborate", "delineate", "empirical",
        "equivocal", "exacerbate", "infer", "mitigate", "nuance", "pragmatic",
        "refute", "substantiate", "ubiquitous",
    ]
    for word in preferred + frame.loc[frame["on_list"] == "academic", "lemma"].astype(str).tolist():
        word = word.strip().lower()
        if word in seen or not re.fullmatch(r"[a-z][a-z-]{3,18}", word):
            continue
        seen.add(word)
        candidates.append(word)

    ipa = load_ipa()
    synsets = load_synsets()
    entry_cache: dict[str, dict] = {}
    rows = []
    for word in candidates:
        letter = word[0]
        if letter not in entry_cache:
            entry_cache[letter] = load_entries_for(letter)
        entries = entry_cache[letter]
        entry = entries.get(word) or entries.get(word.capitalize())
        if not isinstance(entry, dict):
            continue
        synset_id, entry_pronunciation = first_sense(entry)
        synset = synsets.get(synset_id or "")
        if not isinstance(synset, dict):
            continue
        definitions = synset.get("definition") or []
        if not definitions:
            continue
        phonetic = ipa.get(word) or (f"/{entry_pronunciation}/" if entry_pronunciation else None)
        if not phonetic:
            continue
        examples = synset.get("example") or []
        rows.append({
            "id": f"v-{word}",
            "term": word,
            "phonetic": phonetic,
            "difficulty": difficulty(word),
            "definition": str(definitions[0]).strip(),
            **({"example": str(examples[0]).strip()} if examples else {}),
        })
        if len(rows) >= TARGET:
            break

    if len(rows) < 500:
        raise SystemExit(f"Only generated {len(rows)} usable words")
    OUTPUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    counts = {level: sum(row["difficulty"] == level for row in rows) for level in ("Easy", "Medium", "Hard")}
    print(f"Wrote {len(rows)} words to {OUTPUT} ({counts})")


if __name__ == "__main__":
    main()
