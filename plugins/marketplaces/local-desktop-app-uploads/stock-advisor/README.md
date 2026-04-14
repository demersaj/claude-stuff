# Stock Advisor Plugin

Analyzes any stock or company - public **or** private - and produces a structured buy/sell/hold recommendation backed by web research and a weighted scorecard.

## Commands

| Command | Description |
|---|---|
| `/stock-advisor:analyze [company]` | Analyze a stock or company and produce a full investment report |
| `/stock-advisor:gaps [holdings]` | Map sector/theme exposure gaps from your list or portfolio; suggest new stocks (and run `/stock-advisor:analyze` on finalists) |

**Examples:**

```
/stock-advisor:analyze AAPL
/stock-advisor:analyze Stripe
/stock-advisor:analyze NVDA
/stock-advisor:analyze SpaceX
/stock-advisor:analyze Microsoft

/stock-advisor:gaps AAPL 25%, MSFT 25%, GOOGL 20%, NVDA 15%, cash
/stock-advisor:gaps I am all US mega-cap tech and mega-cap healthcare, no small caps
/stock-advisor:gaps VTI 60%, QQQ 30%, individual BHP and XOM
```

## Portfolio gaps skill

When you use `/stock-advisor:gaps`, the agent:

1. **Normalizes** your input (tickers, weights, or narrative)
2. **Maps** sector, market cap, geography, and theme exposure
3. **Calls out** concentration, redundancy, and missing slices vs typical diversification or stated goals
4. **Researches** candidates via web search **tied to each gap**
5. **Delivers** a structured report with prioritized tickers, thesis, risks, and sources

For a full buy/hold/sell scorecard on any suggestion, run `/stock-advisor:analyze <ticker>` afterward.

## What it does (single-name analyze)

For each analysis, the plugin:

1. **Classifies** the company as public or private
2. **Researches** across financial, growth, competitive, and sentiment dimensions using web search
3. **Scores** 6 dimensions on a 1–5 scale with source-backed justification
4. **Computes** a weighted score and maps it to a recommendation
5. **Delivers** a structured report with bull case, bear case, key metrics, catalysts, and data sources

## Scorecard Dimensions

| Dimension | Weight |
|---|---|
| Financial Health | 25% |
| Growth Trajectory | 25% |
| Competitive Position | 20% |
| Management & Execution | 15% |
| Sentiment & Catalysts | 10% |
| Risk Factors | -5% (penalty) |

## Recommendations

| Score | Recommendation |
|---|---|
| 4.0 – 5.0 | STRONG BUY |
| 3.3 – 3.9 | BUY |
| 2.7 – 3.2 | HOLD |
| 2.0 – 2.6 | SELL |
| 1.0 – 1.9 | STRONG SELL |

## Notes

- Private company analyses have lower confidence due to limited public data
- All reports include a disclaimer - this is AI research, not professional financial advice
- Sources are listed at the bottom of every report
