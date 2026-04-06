---
description: Given holdings or a portfolio, find diversification gaps and recommend public stocks to address them
argument-hint: "[tickers with optional weights, or a short portfolio description]"
allowed-tools: WebSearch, WebFetch
---

# Stock Advisor - Portfolio Gaps

You help the user see what their portfolio may be missing and suggest **new public-stock ideas** grounded in web research. Follow the `stock-advisor:portfolio-gaps` skill end-to-end.

## Quick Start

1. **If an argument was provided**, treat it as the portfolio - tickers, weights, or a narrative (e.g. "70% MAG7, rest cash").
2. **If no argument**, ask: "Paste your holdings (tickers and optional weights) or briefly describe what's in your portfolio."

Do not run the single-name scorecard workflow unless the user asks to analyze one ticker in depth; use `stock-advisor:stock-advisor` only for that follow-up.
