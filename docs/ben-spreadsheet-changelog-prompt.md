# Prompt for Ben — Spreadsheet Update Changelog

**Instructions for Ben:**
When you send a new version of the spreadsheet, paste the prompt below into ChatGPT
and attach both the **old version** and the **new version** of the file.
ChatGPT will produce a structured changelog that the JobzOn developer can apply directly to the code.

---

## The Prompt (copy everything below this line)

---

I am providing two versions of my electrician quoting spreadsheet — an old version and a new version. I need you to produce a structured technical changelog so that a developer can update the code that ports this spreadsheet into a SaaS application.

Please compare the two files and produce a changelog in the following format. Be precise and include actual before/after numeric values wherever a number changed. Do not summarise — include every changed cell.

---

### SPREADSHEET CHANGELOG

**Old version:** [filename]
**New version:** [filename]
**Prepared by:** [your name]
**Date:** [today's date]

---

#### 1. Assumptions Sheet — Changed Values

List every cell in the Assumptions sheet whose value changed.
Format each row as:

| Cell | Description (from adjacent label) | Old Value | New Value | Notes |
|------|-----------------------------------|-----------|-----------|-------|
| B6   | GPO run setup hrs                 | 0.30      | 0.35      |       |

If no values changed, write: _No changes._

---

#### 2. Settings Sheet — Changed Values

List every cell in the Settings sheet whose value or formula changed.

| Cell | Description | Old Value | New Value | Notes |
|------|-------------|-----------|-----------|-------|

If no values changed, write: _No changes._

---

#### 3. Benchmark Suite — Changed Results

List every benchmark row (B01, B02 … S25-xx) whose reference labour hours or reference total (inc GST) changed, or whose status changed (e.g. LOCKED → REVERIFY).

| ID   | Description | Old Labour Hrs | New Labour Hrs | Old Total $ | New Total $ | Status Change | Notes |
|------|-------------|---------------|---------------|-------------|-------------|---------------|-------|

If no benchmarks changed, write: _No changes._

---

#### 4. Module Formula Changes

For each module sheet (GPO, Light Install, New Circuit, Switchboard, Underground, Data TV, Custom Job, Job Summary), describe any formula logic changes in plain English. Focus on:
- New conditions or branches added to IF formulas
- New input columns added or removed
- New Assumptions/Settings cell references introduced
- Any change to how labour or materials are calculated

Format:

**Module: [Sheet Name]**
- [Plain English description of what changed and why, referencing specific cells]

If a module had no formula changes, omit it.

---

#### 5. New Input Fields or Dropdowns

List any new user-input cells, dropdown options, or validation lists added to any module sheet.

| Sheet | Cell | Field Name | Options / Format | Notes |
|-------|------|-----------|-----------------|-------|

If none, write: _No changes._

---

#### 6. Stage / Version Label

What stage or version label appears in the new file (e.g. "Stage 25", "v10")? Where is it shown?

---

#### 7. Summary for Developer

In 3–5 bullet points, summarise the most important things the developer needs to update in the code:
- Which TypeScript constants need new values
- Which calculation branches need to change
- Which benchmarks need re-validating
- Any new UI inputs needed

---

End of prompt.
