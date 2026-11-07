# Scheduled task prompt changes: web publish

Applies to both web tasks:
- "VCT 보드 웹페이지 반영" (daily 09:35 KST)
- "VCT 보드 웹페이지 추가 반영 (11/2~11/16)" (15:35, 21:35 KST)

Precondition: PR 2 (`docs/instructions/PR2-data-rules.md`) is merged and deployed. Change this task BEFORE the sheet task starts writing year-only contracts or captions (`schedule-sheet-update.md` rollout step 3). If the order is reversed, the task's safety check or `scripts/validate.mjs` rejects the data and the site stops updating.

The user pastes or replaces these blocks in the task prompts.

## 1. New fields to export

```text
## New fields
Read the new "요약" column and export it as "caption" (string) on rows of:
- players.json (from "LFT 선수")
- coaches.json (from "코치·스태프")
- transfers.json players and coaches (from "성사된 이적")
Empty cell: omit the field (do not write "").
"계약 만료" / "새 계약 만료" (contractUntil):
- a date cell becomes the sheet serial integer, as today;
- a 4-digit year text cell becomes the string "2027";
- empty cell: omit the field.
Apply the same contractUntil rule to people.json.
```

## 2. Safety checks: replace the contractUntil rule and add caption rules

Replace the existing rule "contractUntil·signedDate가 숫자인지" with:

```text
## Safety checks (block the commit and report if any fails)
- signedDate is a number when present.
- contractUntil is a number OR a string matching ^\d{4}$ when present (rows and people.json).
- caption is a string when present.
- (warning only, still commit) caption longer than 120 characters: list the rows in the report.
Keep every other existing check unchanged (personId/team ID references, ID format and uniqueness,
no disappearing IDs, teamIds is an array, birth format, career format and order).
These checks must match scripts/validate.mjs on main. If GitHub Actions fails on "데이터 검증",
report the failing message from the run log in the PushNotification.
```

## 3. Report

```text
## Report
Add one line to the final report: "caption rows n / contractUntil year-only n / contractUntil dated n".
```

## Unchanged

- Single commit through the Git Trees API, with the per-file fallback.
- Do-not-touch list: css/, js/, scripts/, .github/, docs/, og.png, og-en.png, CLAUDE.md, and index.html except the header timestamp. `og-en.png` and `CLAUDE.md` are new on this list.
- The Actions result check after commit.
