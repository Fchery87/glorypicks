# GloryPicks Research: Comparable Platforms, ICT Concepts, Feature Gaps

_Date: 2026-05-24_

## Executive Findings

- The strongest competitors do **not** only show signals; they cover the trader workflow from **market discovery -> chart analysis -> alerting -> execution/review -> journaling -> analytics/backtesting**.
- TradingView sets the baseline for charting UX, alerts, screeners, community scripts, broker connections, and social sharing; its own feature pages highlight Supercharts, alerts, Pine Script, screeners, community, news, and broker trading integrations. [TradingView Features](https://www.tradingview.com/features/), [TradingView Alerts](https://www.tradingview.com/support/solutions/43000520149-introduction-to-tradingview-alerts/), [TradingView Community](https://www.tradingview.com/social-network/)
- TrendSpider differentiates with automation: automated technical analysis, market scanners, no-code strategy testing/backtesting, cloud alerts, and no-code bots. [TrendSpider Product](https://trendspider.com/product/), [TrendSpider Backtesting](https://trendspider.com/product/strategy-development-and-backtesting-tools/), [TrendSpider Alerts/Bots](https://trendspider.com/product/trade-timing-and-execution-tools/)
- Journaling platforms are now feature-rich: TradeZella emphasizes broker auto-sync, dashboards, trade replay, backtesting, and AI insights; Tradervue emphasizes broker imports, auto-generated charts, tagging/filtering, reports, and trade sharing; TradesViz emphasizes advanced filtering, simulations/replay/backtesting, 90+ broker imports, 20+ auto-sync integrations, and 300+ stats/visualizations; Edgewonk emphasizes psychology tracking, checklists, Chart Lab, AI/Edge Finder, and performance simulation. [TradeZella Analytics](https://www.tradezella.com/journal-analytics), [TradeZella Replay](https://tradezella.com/trade-replay), [Tradervue Pricing/Features](https://www.tradervue.com/site/pricing/), [TradesViz Getting Started](https://tradesviz.crisp.help/en/article/getting-started-with-tradesviz-trading-journal-zvgi7r/), [TradesViz Backtesting](https://tradesviz.crisp.help/en/article/intraday-and-eod-backtesting-with-70-indicators-for-any-asset-type-4gjqgr/), [Edgewonk Features](https://edgewonk.com/features)
- ICT/SMC products often bundle visual detection of **BOS/CHoCH/MSS, order blocks, fair value gaps, liquidity sweeps, premium/discount zones, and confluence-scored signals**. Examples include cTrader SMC/ICT indicators and MT4/MT5 SMC indicators that advertise order-block/FVG/liquidity/structure detection. [cTrader SMC-ICT Control Panel](https://ctrader.com/products/3909), [KT SMC Indicator](https://www.keenbase-trading.com/products/smart-money-concepts-indicator/), [MQL5 Smart SMC Pro](https://www.mql5.com/en/market/product/167955)

## Comparable Platform Capability Matrix

| Platform type | Examples | Capabilities to benchmark | Implication for GloryPicks |
|---|---|---|---|
| Charting/social/chart scripts | TradingView | Multi-asset charts, alerts, screeners, Pine Script/community scripts, broker trading, social ideas. [TradingView Features](https://www.tradingview.com/features/) | GloryPicks needs strong chart interaction, annotations, alerts, and a shareable analysis layer, not just signal cards. |
| Automated analysis/scanners/backtesting | TrendSpider | Automated technical analysis, scanner/idea generation, strategy tester, backtesting, no-code bots/alerts. [TrendSpider Product](https://trendspider.com/product/) | Build deterministic scan jobs and backtest reports so ICT signals are auditable. |
| Journaling and analytics | TradeZella, Tradervue, TradesViz, Edgewonk | Broker imports/auto-sync, trade charts, tags, reports, replay, backtesting, AI insights, psychology/checklists. [TradeZella](https://www.tradezella.com/journal-analytics), [Tradervue](https://www.tradervue.com/site/pricing/), [TradesViz](https://tradesviz.crisp.help/en/article/getting-started-with-tradesviz-trading-journal-zvgi7r/), [Edgewonk](https://edgewonk.com/features) | The largest product gap is post-trade workflow: journal, review, replay, and edge analytics. |
| SMC/ICT indicators | cTrader/MT5/TradingView-style indicators | Auto-detection of order blocks, FVGs, structure breaks, liquidity sweeps, confluence scores, execution zones. [cTrader SMC-ICT](https://ctrader.com/products/3909), [MQL5 Smart SMC Pro](https://www.mql5.com/en/market/product/167955) | GloryPicks should expose transparent ICT objects on charts with confidence scoring and reasons. |

## ICT / Smart Money Concepts to Support

Core ICT concepts are commonly described around institutional order flow, liquidity, market structure, imbalances, and time-of-day models. Research sources consistently identify these as foundational:

1. **Market structure**: Break of Structure, Change of Character, and Market Structure Shift are used to infer trend continuation or reversal. [XS ICT Guide](https://www.xs.com/en/blog/ict-trading/), [ICT FVG/MSS notes](https://michaeljhuddleston.org/notes/ict-fair-value-gaps-market-structure-shifts-trade-like-smart-money/)
2. **Liquidity pools and sweeps**: Buy-side liquidity above prior highs and sell-side liquidity below prior lows are central; liquidity sweeps/raids are treated as potential setup triggers. [ICT Liquidity Pool](https://innercircletrader.net/tutorials/ict-liquidity-pool/), [Internal/External Liquidity](https://innercircletrader.net/tutorials/ict-internal-external-liquidity/)
3. **Fair Value Gaps / imbalances**: Three-candle displacement gaps or imbalances are used as retracement/execution zones; inverse FVGs act as flipped support/resistance references. [ICT FVG/MSS notes](https://michaeljhuddleston.org/notes/ict-fair-value-gaps-market-structure-shifts-trade-like-smart-money/), [SMC Glossary](https://wzt.fund/glossary)
4. **Order blocks and breaker blocks**: Prior institutional candles/zones before displacement, including role reversal after invalidation, are widely used by SMC/ICT tools. [XS ICT Guide](https://www.xs.com/en/blog/ict-trading/), [MQL5 Smart SMC Pro](https://www.mql5.com/en/market/product/167955)
5. **Premium/discount and OTE**: Many ICT guides use dealing ranges and Fibonacci-based optimal trade entry zones, often around 0.618-0.786. [Quantum Algo ICT Guide](https://www.quantum-algo.com/blog/guides/ict-trading-strategy-complete-guide/)
6. **Kill zones / time model**: London and New York session windows are commonly emphasized for intraday ICT setups. [Quantum Algo ICT Guide](https://www.quantum-algo.com/blog/guides/ict-trading-strategy-complete-guide/)
7. **Top-down bias**: Higher-timeframe bias, session liquidity sweep, then lower-timeframe entry trigger is a common ICT model framing. [Complete ICT 2022 Strategy](https://innercircletrader.net/tutorials/complete-ict-trading-strategy-2022/)

## Likely Feature Gaps for GloryPicks

Prioritized gaps for a platform positioned as a professional ICT signal dashboard:

1. **Signal explainability gap**
   - Current product positioning should move from “BUY/SELL signal” to “setup thesis”.
   - Needed: visible detected objects, reasons, confidence/confluence score, invalidation level, entry zone, targets, risk/reward, data timestamp, and provider source.

2. **Backtesting/statistical proof gap**
   - Competitors such as TrendSpider and TradeZella make backtesting a core selling point. [TrendSpider Backtesting](https://trendspider.com/product/strategy-development-and-backtesting-tools/), [TradeZella Backtesting](https://tradezella.com/backtesting)
   - Needed: historical strategy tester for each ICT model, including win rate, expectancy, profit factor, max drawdown, average R, MFE/MAE, session/timeframe breakdown, and sample size warnings.

3. **Journaling/review gap**
   - Tradervue, TradesViz, TradeZella, and Edgewonk prove that journaling is a standalone value center. [Tradervue Features](https://www.tradervue.com/site/pricing/), [TradesViz Guides](https://tradesviz.crisp.help/en/article/getting-started-with-tradesviz-trading-journal-zvgi7r/), [Edgewonk Psychology](https://edgewonk.com/trading-psychology)
   - Needed: manual trade log, broker/CSV import, setup tags, screenshots/chart snapshots, rule checklist, emotion/discipline fields, post-trade notes, and review dashboards.

4. **Replay and chart annotation gap**
   - TradeZella’s replay workflow shows demand for candle-by-candle and day replay. [TradeZella Replay](https://tradezella.com/trade-replay)
   - Needed: save a signal snapshot, replay candles after signal fire, compare planned vs actual path, and annotate why the setup worked/failed.

5. **Alert workflow gap**
   - TradingView and TrendSpider both emphasize flexible alerts. [TradingView Alerts](https://www.tradingview.com/support/solutions/43000520149-introduction-to-tradingview-alerts/), [TrendSpider Alerts/Bots](https://trendspider.com/product/trade-timing-and-execution-tools/)
   - Needed: alerts on price entering FVG/order block, liquidity sweep confirmed, BOS/MSS confirmed, confidence score threshold, invalidation hit, and target hit; delivery via app, email, Discord/Telegram/webhook.

6. **Market discovery/scanner gap**
   - TradingView screeners and TrendSpider scanners set expectations for finding setups quickly. [TradingView Screener](https://www.tradingview.com/support/solutions/43000718866-what-is-the-stock-screener/), [TrendSpider Scanner](https://trendspider.com/product/find-high-quality-trading-ideas/)
   - Needed: multi-symbol ICT scanner ranked by setup quality, asset class, session, timeframe alignment, volatility, spread/liquidity, and upcoming news risk.

7. **Psychology and rule-discipline gap**
   - Edgewonk differentiates by measuring trading psychology and decision quality, not just P&L. [Edgewonk Psychology](https://edgewonk.com/trading-psychology/)
   - Needed: pre-trade checklist, discipline score, emotional state, rule violations, tilt markers, and weekly review prompts.

8. **Community/shareability gap**
   - TradingView has a large social/community script/idea ecosystem. [TradingView Community](https://www.tradingview.com/social-network/)
   - Needed: shareable signal pages, annotated chart images, strategy templates, public/private playbooks, and verified performance summaries.

## Implementation Recommendations

### Phase 1: Make signals trustworthy and auditable

- Add a normalized `SignalExplanation` model:
  - `bias`, `setup_type`, `timeframes`, `confidence_score`, `confluence_factors`, `entry_zone`, `stop/invalidation`, `targets`, `risk_reward`, `detected_at`, `data_source`, `candle_timestamp`.
- Add structured ICT chart overlays:
  - FVG rectangles, order blocks, breaker blocks, liquidity highs/lows, sweep markers, BOS/MSS labels, premium/discount range, kill-zone session shading.
- Add setup quality scoring:
  - Example score factors: higher-timeframe bias alignment, displacement strength, fresh/unmitigated FVG, liquidity sweep proximity, session window, volatility regime, clean invalidation, minimum R:R.
- Add disclaimers and wording: “educational analysis / setup candidate” instead of deterministic profit language.

### Phase 2: Add scanner and alert engine

- Build a background scan pipeline per asset/timeframe:
  - persisted candles -> indicator/ICT object extraction -> signal candidate -> score -> alert dispatch.
- Persist every generated signal and detected ICT object; do not only compute in memory.
- Add alert rules:
  - price enters FVG/order block, sweep confirmed, BOS/MSS confirmed, signal score crosses threshold, invalidation/target hit.
- Add webhook/Discord/Telegram-ready notification payloads for power users.

### Phase 3: Add journal and performance analytics

- Start with manual journaling + CSV import before broker OAuth/API sync.
- Minimum journal fields:
  - symbol, asset class, side, entry/exit, size, P&L, R multiple, fees, setup tag, signal ID, screenshots/snapshot, checklist result, mistake tags, emotional state, notes.
- Analytics dashboards:
  - expectancy, win rate, profit factor, max drawdown, average R, best/worst setup, best session, best timeframe, MFE/MAE, holding time, rule compliance.
- Link signals to trades so users can answer: “Which GloryPicks setup types actually produce my edge?”

### Phase 4: Backtesting and replay

- Backtesting MVP:
  - deterministic candle-based simulation with configurable entry/stop/target rules, slippage/spread assumptions, trading session filters, and news-exclusion option.
- Report every backtest with sample size, instrument list, timeframe, date range, assumptions, and survivorship/data limitations.
- Replay MVP:
  - saved signal snapshot plus candle-by-candle replay from pre-signal context to post-trade outcome.

### Phase 5: Differentiators for an ICT-native product

- “ICT Playbook Builder”: let users create rule templates such as “London sweep -> MSS -> FVG retrace -> 2R target”.
- “Setup Autopsy”: after outcome, auto-label whether invalidation was clean, entry was late, target was realistic, or signal failed due to missing confluence.
- “Session Intelligence”: show London/NY kill-zone dashboards, liquidity taken, open range, prior day/week high/low, and premium/discount state.
- “Confidence Calibration”: compare historical confidence score buckets against realized expectancy so scores become evidence-based, not cosmetic.

## Product Positioning Recommendation

Position GloryPicks as an **ICT-native decision and review system**, not just another signal dashboard:

> “Find ICT setups, understand the thesis, get alerted at execution zones, journal the trade, replay the outcome, and measure whether the setup is your edge.”

That positioning directly addresses the gaps between charting tools, SMC indicators, and journaling platforms while giving GloryPicks a focused identity.

## Source Index

- TradingView: [Features](https://www.tradingview.com/features/), [Alerts](https://www.tradingview.com/support/solutions/43000520149-introduction-to-tradingview-alerts/), [Screener](https://www.tradingview.com/support/solutions/43000718866-what-is-the-stock-screener/), [Community](https://www.tradingview.com/social-network/), [Broker trading](https://www.tradingview.com/trading/)
- TrendSpider: [Product](https://trendspider.com/product/), [Backtesting](https://trendspider.com/product/strategy-development-and-backtesting-tools/), [Scanner](https://trendspider.com/product/find-high-quality-trading-ideas/), [Alerts/Bots](https://trendspider.com/product/trade-timing-and-execution-tools/), [Automated TA](https://help.trendspider.com/kb/automated-technical-analysis)
- Journaling: [TradeZella Analytics](https://www.tradezella.com/journal-analytics), [TradeZella Replay](https://tradezella.com/trade-replay), [TradeZella Backtesting](https://tradezella.com/backtesting), [Tradervue Features](https://www.tradervue.com/site/pricing/), [TradesViz Getting Started](https://tradesviz.crisp.help/en/article/getting-started-with-tradesviz-trading-journal-zvgi7r/), [TradesViz Backtesting](https://tradesviz.crisp.help/en/article/intraday-and-eod-backtesting-with-70-indicators-for-any-asset-type-4gjqgr/), [Edgewonk Features](https://edgewonk.com/features), [Edgewonk Psychology](https://edgewonk.com/trading-psychology/)
- ICT/SMC: [XS ICT Guide](https://www.xs.com/en/blog/ict-trading/), [ICT FVG/MSS notes](https://michaeljhuddleston.org/notes/ict-fair-value-gaps-market-structure-shifts-trade-like-smart-money/), [ICT Liquidity Pool](https://innercircletrader.net/tutorials/ict-liquidity-pool/), [Internal/External Liquidity](https://innercircletrader.net/tutorials/ict-internal-external-liquidity/), [Complete ICT 2022 Strategy](https://innercircletrader.net/tutorials/complete-ict-trading-strategy-2022/), [SMC Glossary](https://wzt.fund/glossary), [cTrader SMC-ICT Control Panel](https://ctrader.com/products/3909), [KT SMC Indicator](https://www.keenbase-trading.com/products/smart-money-concepts-indicator/), [MQL5 Smart SMC Pro](https://www.mql5.com/en/market/product/167955)
