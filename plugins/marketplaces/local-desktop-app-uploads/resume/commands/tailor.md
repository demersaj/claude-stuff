---
description: Tailor Andrew's resume to a specific job description
argument-hint: "[job-description or URL or company/role name]"
allowed-tools: Read, Write, WebFetch
---

# Resume Tailor

You are tailoring **Andrew Demers'** resume to a specific role. Follow the `resume:resume-writer` skill for detailed instructions.

## Steps

1. **Get the job description.** If an argument was provided, use it — it may be a raw JD, a URL, or a company/role name.
   - If it's a URL, fetch the page and extract the JD.
   - If it's a company/role name only, ask the user to paste the JD.
   - If no argument was provided, ask: "Paste the job description (or give me a URL)."

2. **Analyze the JD.** Before writing anything, briefly tell the user:
   - The top 3 things this role cares about
   - How well Andrew's background maps to it (honest fit assessment)

3. **Tailor the resume.** Follow the tailoring instructions in the `resume:resume-writer` skill.

4. **Output:**
   - The full tailored resume in clean markdown
   - A brief "What I changed" section at the end (3–5 bullets)

5. **Optionally offer** to save the tailored resume as a file (e.g., `resume-[company]-[role].md`).
