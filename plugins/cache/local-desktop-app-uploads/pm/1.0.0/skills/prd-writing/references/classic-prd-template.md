# Classic PRD Template

Use this template when the solution direction is reasonably clear and you need to specify it for implementation.

---

## Section Guide

### Problem Statement (required)

Write 2-4 sentences max. Answer:
- What is the current state?
- What is the pain or gap?
- Who feels it?

Bad: "Users need a better experience."
Good: "New users abandon onboarding at step 3 (email verification) at a 40% rate because the verification email takes 2-5 minutes to arrive, and there's no indication it's been sent."

### Goals & Success Metrics (required)

Each goal must have a corresponding metric. Format:

| Goal | Metric | Target | Measurement Method |
|------|--------|--------|--------------------|
| Reduce onboarding drop-off | Step 3 completion rate | 80% (up from 60%) | Mixpanel funnel |
| Faster verification | Time to verify | < 30 seconds | Server logs |

Avoid vanity metrics. If you can't explain how you'd query it, it's not a metric.

### Target Users (required)

Be specific. Not "all users" but segments with different needs:

- **Primary**: [Who benefits most, what they're trying to do]
- **Secondary**: [Who else is affected, how]
- **Anti-target**: [Who this is explicitly NOT for]

### Requirements (required)

Use MoSCoW prioritization:

**P0 - Must Have**: Ship is blocked without these
- Requirement with clear acceptance criteria
- Another requirement with clear acceptance criteria

**P1 - Should Have**: Significantly reduces value if missing
- Requirement with acceptance criteria

**P2 - Nice to Have**: Adds polish, can be cut without impacting launch
- Requirement with acceptance criteria

Each requirement should be testable. "The page loads quickly" is not testable. "The page loads in under 2 seconds on 3G connections" is testable.

### Scope (required)

**In Scope**: What we are building in this iteration. Be specific.

**Out of Scope**: What we are NOT building. Be explicit to prevent scope creep. "We are not building X because Y."

**Future Considerations**: Things we want to do later. Mention them to show they're intentional deferrals, not oversights.

### Technical Approach (recommended)

High-level only in the PRD. Cover:
- Architecture direction (not implementation details)
- Key technical decisions and rationale
- Integration points
- Data model changes at a conceptual level

If a full technical spec is needed, reference it or use `/pm:tech-spec` to generate one.

### Dependencies (required)

| Dependency | Owner | Status | Risk if Delayed |
|-----------|-------|--------|----------------|
| Auth service migration | Platform team | In progress, ETA March | Blocks SSO requirement |

### Risks & Mitigations (required)

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Verification service rate limits | Medium | High - blocks launch | Pre-negotiate higher limits, implement queue |

### Open Questions (required)

Number them. Assign owners if known. Flag blocking vs. non-blocking.

1. **[BLOCKING]** Do we need GDPR consent before sending verification? - Owner: Legal
2. **[Non-blocking]** Should we support SMS as an alternative? - Owner: PM

### Timeline & Milestones (recommended)

Use milestones, not detailed sprint plans:

| Milestone | Target Date | Dependencies |
|-----------|------------|-------------|
| Technical design approved | Feb 28 | None |
| MVP ready for QA | March 15 | Auth migration complete |
| Launch | April 1 | QA sign-off |

### Appendix (optional)

- Links to user research
- Competitive analysis
- Mocks/wireframes
- Data analysis supporting the problem statement
