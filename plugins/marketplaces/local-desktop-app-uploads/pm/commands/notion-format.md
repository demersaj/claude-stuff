---
description: Format a PRD markdown file for clean paste into Notion
argument-hint: "<prd-file-path>"
allowed-tools: Bash, Read, Write
---

# Format for Notion

Read the specified PRD and output a Notion-optimized version.

## Transformations

1. **Tables** - Ensure all markdown tables are clean (Notion handles standard markdown tables well)
2. **Callouts** - Convert any `> **Note:**` or `> **Warning:**` blocks into Notion callout syntax:
   - Use `> 💡` for tips/notes
   - Use `> ⚠️` for warnings/risks
   - Use `> ❓` for open questions
3. **Toggle blocks** - Wrap lengthy sections (Appendix, detailed requirements) in toggle-friendly format:
   - Add a `<details><summary>Section Name</summary>` wrapper
4. **Headers** - Ensure hierarchy is clean (H1 for title, H2 for sections, H3 for subsections). Notion doesn't handle H4+ well.
5. **Checklists** - Convert any `- [ ]` items to Notion task format
6. **Remove** any HTML that Notion won't render, LaTeX, or code fence languages Notion doesn't support
7. **Status tags** - Format status indicators as inline text Notion can render: `🟢 On Track`, `🟡 At Risk`, `🔴 Blocked`

## Output

Write the Notion-ready version to `<original-name>-notion.md` in the same directory.

Print: "Ready to paste into Notion. Copy the contents of `<filename>` and paste directly into a Notion page."
