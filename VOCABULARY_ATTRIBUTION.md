# Vocabulary Data Attribution

The checked-in `src/data/vocabulary.json` study deck was generated from these open resources:

- **New Academic Word List / `word.lists`** — academic headwords. The dataset documentation identifies the list as Creative Commons Attribution-ShareAlike 4.0. Source: https://github.com/antdurrant/word.lists
- **Open English WordNet 2025** — definitions and example sentences. Derived from Princeton WordNet and licensed under Creative Commons Attribution 4.0 with the underlying WordNet license. Source: https://github.com/globalwordnet/english-wordnet
- **ipa-dict** — United States English IPA pronunciations, MIT License. Source: https://github.com/open-dict-data/ipa-dict
- **wordfreq** — frequency estimates used only at generation time to assign relative Easy, Medium, and Hard labels. Source: https://github.com/rspeer/wordfreq

The generated deck contains 600 entries. Difficulty labels are relative study levels, not official College Board classifications.

To regenerate the deck, provide the source repositories locally and run `scripts/build-vocabulary.py` in a Python environment containing `pyreadr`, `pyyaml`, and `wordfreq`.
