---
name: discovery-process
description: Run a full product discovery cycle from problem hypothesis to validated solution. Use when framing a new problem space, investigating churn/retention, validating a strategic bet before roadmap commitment, or setting up continuous discovery. Triggers on mentions of discovery, customer interviews, problem validation, opportunity solution tree, or continuous discovery.
---

# Discovery Process Skill

Guide a Senior Technical PM through a complete discovery cycle — from initial problem hypothesis to a GO/PIVOT/KILL decision — by orchestrating framing, research, synthesis, and experimentation into a structured process.

This is not a one-time research project. It is a continuous practice that runs in parallel with delivery (Teresa Torres: ~1 customer touchpoint per week, 1-2 full cycles per quarter).

## Core Principles

1. **Problem before solution** — Do not generate solutions until the problem is validated with real customers
2. **Past behavior over hypotheticals** — "Tell me about the last time..." beats "Would you use...?" (Mom Test)
3. **Saturation over sample size** — Stop when the same pains emerge across 3+ interviews (usually 5-7 minimum)
4. **Assumption tests, not feature builds** — The goal of Phase 5 is the smallest test that invalidates the riskiest assumption
5. **Time-box aggressively** — If discovery stretches past 4 weeks without a decision, something is wrong

## When to Use

- Exploring a new product or feature area
- Investigating a retention, activation, or churn problem
- Validating a strategic bet before committing to roadmap
- Standing up continuous discovery as an ongoing practice

## When NOT to Use

- The problem is well-understood → move to `pm:prd-writing` and execution
- Stakeholders have already picked a solution → fix alignment first, discovery won't unstick it
- Tactical bug fixes or tech debt → no discovery needed

---

## Workflow

The full fill-in structure lives at `references/template.md`. Use it to capture outputs as you go.

### Phase 1: Frame the Problem (Day 1-2)

**Goal:** Define what you are investigating, who is affected, and what would validate/invalidate the hypothesis.

Ask the user:
- Who do you believe is struggling? (persona, segment, role)
- What do you believe they are struggling with? (job/outcome, not feature)
- How do you know? (analytics, support tickets, NPS, anecdotes)
- What would prove you wrong?

Produce:
- **Problem hypothesis:** "We believe [persona] struggles with [problem] because [root cause], leading to [consequence]."
- **3-5 research questions** — the things the research must answer
- **Invalidation criteria** — what evidence would kill this

**Decision Point 1:** Do we have enough context to start interviews?
- **YES:** → Phase 2
- **NO:** Review support tickets, churn surveys, NPS, analytics drop-offs first (+2-3 days)

### Phase 2: Research Planning (Day 3)

**Goal:** Design the research approach, recruit, prepare the interview guide.

- **Interview guide:** 5-7 open-ended questions focused on past behavior (Mom Test)
- **Recruit 5-10 customers** per cycle. Channels: existing users, churned users, cold outreach, communities. Incentive: $50-100 gift card
- **Format:** 45-60 min sessions. Record with consent
- **Parallel track:** pull support tickets by theme, pull analytics for funnel/cohort behavior

### Phase 3: Conduct Research (Week 1-2)

**Goal:** Gather qualitative evidence.

Focus areas for every interview:
- **Past behavior:** "Tell me about the last time you [experienced this]"
- **Workarounds:** "How do you handle this today?"
- **Alternatives tried:** "What have you used? Why did you stop?"
- **Pain intensity:** "What does this cost you — time, money, frustration?"

Capture per interview: participant, context, actions, pains, workarounds, verbatim quotes, surprises.

**Decision Point 2:** Have we reached saturation (same pains across 3+ customers, no new insights)?
- **YES:** → Phase 4
- **NO:** 3-5 more interviews (+1 week)

### Phase 4: Synthesize Insights (End of Week 2)

**Goal:** Identify patterns, prioritize pains, map opportunities.

1. **Affinity mapping:** one insight per sticky, group by theme, count frequency
2. **Prioritize pains** by Frequency × Intensity × Strategic fit (1-5 each)
3. **Update the problem statement** — did the hypothesis hold? Refine it
4. **Optional:** customer journey map if pains span multiple phases

Outputs: ranked top 3-5 pains, 3-5 verbatim quotes per pain, validated problem statement.

### Phase 5: Generate & Validate Solutions (Week 3)

**Goal:** Explore solutions, test the riskiest assumption as cheaply as possible.

- **Opportunity Solution Tree:** Top 3 pains → 3 opportunities → ~3 solutions each
- For each candidate solution, pick **the smallest experiment** that tests the riskiest assumption:
  - **Concierge test** — manually deliver the outcome to 10 customers, observe
  - **Prototype test** — clickable mock, usability test with ~10 users
  - **Landing page / fake door** — measure intent via signup or click-through
  - **A/B test** — minimal build against 50% of users
- Define success criteria per experiment before running it

**Decision Point 3:** Did the experiment validate the assumption?
- **YES:** → Phase 6
- **NO:** pivot to the next solution or reframe the opportunity (+1-2 weeks)

### Phase 6: Decide & Document (End of Week 3-4)

**Goal:** Commit to build, pivot, or kill — and communicate the decision.

Decision criteria: problem validated? solution validated? strategic fit? feasible?

- **GO:** hand off to `pm:prd-writing` to draft the PRD; write epic hypotheses with success metrics
- **PIVOT:** return to Phase 5 with the next solution
- **KILL:** document why and de-prioritize

Close with a 30-minute readout to execs / product leadership: problem validation, solution validation, recommendation, next steps.

---

## Timeline Summary

| Track | Interviews | Experiments | Duration |
|---|---|---|---|
| Fast | 5 | 1 | 3 weeks |
| Typical | 7-10 | 1-2 | 4 weeks |
| Thorough | 10+ | Multiple rounds | 6-8 weeks |

---

## Anti-Patterns

- **Leading questions** — "Would you use X?" gets polite lies. Ask about past behavior instead.
- **Skipping interviews** — Analytics tell you *what*, interviews tell you *why*. You need both.
- **Declaring victory at N=3** — Keep going until patterns repeat.
- **Analysis paralysis** — A 6-week synthesis phase is a signal to ship an experiment instead.
- **One-time discovery** — Discovery is continuous. Schedule a weekly customer touchpoint.
- **Discovery theater** — Running the process to justify a solution leadership already picked. Fix alignment first.

---

## Handoffs to Other PM Skills

- **Phase 1 framing → [`pm:prd-writing`](../prd-writing/SKILL.md)** if the problem is already well-understood and framing is the only gap
- **Phase 6 GO decision → `/pm:prd`** to draft the formal PRD
- **Phase 6 GO decision → `/pm:stories`** once the PRD is approved
- **Phase 6 readout → `/pm:notion-format`** to share the summary cleanly

Pressure-test synthesis or experiment design with `@pm:prd-critic`. Stress-test feasibility of proposed solutions with `@pm:eng-reader`.

---

## References

- Teresa Torres, *Continuous Discovery Habits* (2021) — weekly touchpoints, Opportunity Solution Tree
- Rob Fitzpatrick, *The Mom Test* (2013) — interview questions that resist bias
- Marty Cagan, *Inspired* / *Empowered* — product discovery principles
