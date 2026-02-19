# Opportunity Solution Tree (OST) PRD Template

Use this template when exploring a problem space, evaluating multiple solutions, or when you need to show your reasoning about why one approach was chosen over others. Especially useful for exec review where "why this solution" matters as much as "what we're building."

---

## Section Guide

### Desired Outcome (required)

The business or product outcome you're trying to move. This is NOT a feature - it's a measurable change in user behavior or business metric.

Bad: "Build a notifications system"
Good: "Increase 7-day retention from 35% to 50% by ensuring users return to see updates relevant to them"

Format:
- **Outcome**: [What changes]
- **Current state**: [Where we are today, with data]
- **Target state**: [Where we want to be, with data]
- **Why now**: [What makes this urgent or timely]

### Opportunity Space (required)

What problems, needs, or desires exist in this space? These come from research, data, and observation - not from solution brainstorming.

Structure opportunities as a tree:

```
Desired Outcome: Increase 7-day retention to 50%
├── Users don't know when something relevant happens
│   ├── No notification when collaborator edits their doc
│   └── No digest of activity in their workspace
├── Users forget about the product between sessions
│   ├── No re-engagement trigger
│   └── No habit loop established
└── Users who return can't find what changed
    ├── No activity feed
    └── No "what's new" indicator
```

For each top-level opportunity, include:
- **Evidence**: What data, research, or signal supports this?
- **Size**: How many users are affected? What's the potential impact?

### Solutions Evaluated (required)

For each solution considered, document:

**Solution A: [Name]**
- **Description**: What we'd build (1-3 sentences)
- **Addresses opportunities**: [Which opportunities from the tree]
- **Effort estimate**: T-shirt size (S/M/L/XL) with brief justification
- **Risks**: What could go wrong
- **Trade-offs**: What we give up by choosing this

**Solution B: [Name]**
- (same structure)

**Solution C: [Name]**
- (same structure)

Use a comparison table to make the decision legible:

| Criteria | Solution A | Solution B | Solution C |
|----------|-----------|-----------|-----------|
| Opportunities addressed | 3/5 | 4/5 | 2/5 |
| Effort | M | XL | S |
| Risk level | Low | High | Low |
| Time to impact | 2 weeks | 8 weeks | 1 week |
| Confidence | High | Medium | Medium |

### Recommended Solution (required)

**Why this solution**: 2-3 sentences connecting the recommendation to the evaluation criteria. Be explicit about the trade-off you're making.

"We recommend Solution A because it addresses the highest-impact opportunity (users not knowing about relevant changes) at medium effort. Solution B is more comprehensive but carries significant technical risk and would delay impact by 6 weeks. Solution C could be a fast follow if Solution A validates the hypothesis."

**Requirements**: Use the same P0/P1/P2 structure from the Classic template.

**Success Metrics**: Same format as Classic template - measurable, with method.

**Assumptions to Validate**: What must be true for this solution to work?

| Assumption | How We'll Validate | When |
|-----------|-------------------|------|
| Users want real-time notifications (not batch) | A/B test: real-time vs. daily digest | Week 2 post-launch |
| Email is the right channel | Survey + usage data | Pre-launch research |

### Experiment Plan (recommended)

If this is a bet rather than a certainty, describe how you'll learn:

1. **Hypothesis**: If we do X, we expect Y because Z
2. **Minimum viable test**: Smallest thing we can ship to learn
3. **Decision criteria**: At what metric threshold do we continue, pivot, or stop?
4. **Timeline**: How long do we run the experiment?

### Open Questions (required)

Same format as Classic template. Number them, assign owners, flag blocking vs. non-blocking.
