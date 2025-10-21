📋 CORE TRADING FEATURES

Essential UI Components

- [ ] Empty states everywhere

  - "No Data" / "No Orders" / "No Positions"
  - Consistent icons and messaging
  - Professional appearance

- [✅] Bottom tab navigation --- DONE

  - 1. OPEN ORDERS TAB

  - Time
  - Symbol
  - Type (Limit/Market)
  - Side (Buy/Sell)
  - Price
  - Amount
  - Filled % (0%, 50%, 100%)
  - Total Value
  - Cancel Button

  2.  SCHEDULED ORDERS TAB (NEW)

  - Symbol
  - Type (Limit/Market)
  - Side (Buy/Sell)
  - Price
  - Amount
  - Scheduled Date
  - Scheduled Time
  - Countdown Timer (live)
  - Status (Pending/Executing/Executed/Failed)
  - Cancel Button

  3.  POSITIONS TAB

  - Symbol
  - Side (Long/Short)
  - Size (quantity)
  - Entry Price
  - Mark Price
  - Last Price
  - Liquidation Price
  - Distance to Liquidation (%)
  - Unrealized P&L ($)
  - Unrealized P&L (%)
  - Close Button

  4.  HISTORY TAB

  - Date
  - Time
  - Symbol
  - Type (Limit/Market)
  - Side (Buy/Sell)
  - Price
  - Amount
  - Total Value
  - Fee
  - Status (Filled/Cancelled/Rejected)

Positions Management

- [✅] Positions table with all critical data:
  - [ ] Symbol display
  - [ ] Side indicator (Long/Short with color badges)
  - [ ] Size (quantity)
  - [ ] Entry Price
  - [ ] Mark Price (for margin calculations)
  - [ ] Last Price (for reference)
  - [ ] Liquidation Price with distance % (e.g., "5.2% away")
  - [ ] Unrealized P&L (both $ and %)
  - [ ] Realized P&L (both $ and %)
  - [ ] Close button (immediate execution)

Order Management

- [✅] Open Orders with Cancel
  - Symbol, Side, Type, Price, Amount
  - Filled percentage (0%, 50%, 100%)
  - Total value
  - Cancel button (instant cancellation)
  - Real-time status updates

Trade Execution

- [✅] Trade Form (Fixed Sidebar) with Limit + Market orders
  - [ ] Order type tabs (Limit / Market)
  - [ ] Buy/Sell toggle
  - [ ] Price input (for Limit orders)
  - [ ] Amount input with BTC/USDT toggle
  - [ ] Percentage buttons (25%, 50%, 75%, 100%)
  - [ ] Available balance display
  - [ ] Fee calculation display
  - [ ] Order total calculation
  - [ ] Large Buy button (green)
  - [ ] Large Sell button (red)

---

📋 main FEATURES

Risk Management

- [✅] TP/SL with BOTH price and % input

  - [ ] Dual input fields (price ⇄ percentage)
  - [ ] Auto-calculate between them
  - [ ] Visual indicator (Entry → TP/SL)
  - [ ] Shows profit/loss projection
  - [ ] Supports both Long and Short positions

- [✅] Leverage slider with live calculations

  - [ ] Slider (1x to 125x)
  - [ ] Live position size calculation
  - [ ] Live margin requirement calculation
  - [ ] Live liquidation price update
  - [ ] Visual warning for high leverage
  - [ ] Preset leverage options (10x, 25x, 50x, 100x)

- [ ] Risk/Reward ratio display
  - [ ] Auto-calculate when TP/SL is set
  - [ ] Show ratio (e.g., "1:2.5")
  - [ ] Warning if R:R < 1:1
  - [ ] Color-coded (green = good, red = bad)

Data Management

- [✅] Filter & Sort functionality
  - [✅] Filter by symbol (All / BTC / ETH / etc.)
  - [✅] Filter by side (All / Buy / Sell)
  - [✅] Filter by type (All / Limit / Market / Stop)
  - [✅] Sort by: Time, Price, Amount, P&L
  - [✅] Ascending/Descending toggle
  - [✅] Proper column alignment (headers and data)
  - [✅] Fixed sorting interference with react-grid-layout
  - [✅] Filter controls with clear functionality
  - [✅] Filter/sort persists across tabs

Market Data Visualization

- [ ] Order Book with depth visualization

  - [✅] Live bid prices (green)
  - [✅] Live ask prices (red)
  - [✅] Quantity at each level
  - [✅] Depth visualization bars (background gradient)
  - [✅] Current spread display
  - [✅] Total cumulative volume
  - [❌] Real-time updates via WebSocket

- [❌] Chart Panel

  - [ ] TradingView widget integration
  - [ ] Timeframe selector (1m, 5m, 15m, 30m, 1h, 4h, 1D, 1W)
  - [ ] Volume bars display
  - [ ] Fullscreen toggle
  - [ ] Chart type selector (Candles/Line/Area)

- [✅] Market Ticker Bar (Top)
  - [✅] Current price (large, prominent)
  - [✅] 24h change % (color-coded)
  - [✅] 24h High
  - [✅] 24h Low
  - [✅] 24h Volume (BTC)
  - [✅] 24h Volume (USDT)

User Notifications (Functionality)

- [ ] Real-time alerts + sound notifications
  - [ ] Sound on order filled
  - [ ] Sound on order cancelled
  - [ ] Sound on liquidation warning (< 10% from liq)
  - [ ] Browser push notifications (with permission)
  - [ ] Toast notifications in-app
  - [ ] Notification history panel
  - [ ] Mute/unmute toggle
  - [ ] Volume control

---

📋 ADVANCED ORDER TYPES

- [ ] Advanced order types

  - [ ] Stop-Limit orders
    - Stop price trigger
    - Limit price execution
    - Stop-loss for risk management
  - [ ] OCO (One-Cancels-Other)
    - Link two orders together
    - When one fills, cancel the other
    - Useful for bracketed trades
  - [ ] Order type selector in Trade Form
  - [ ] Clear documentation/tooltips for each type

- [ ] Scheduled Orders (NEW )
  - [ ] Schedule tab in Trade Form
  - [ ] Date picker
  - [ ] Time

picker (with seconds) (Functionality)

- [ ] Timezone display
- [ ] Order preview with scheduled time
- [ ] Live countdown timer (updates every second)
- [ ] Scheduled Orders sub-tab in bottom panel
- [ ] Status indicators (Pending/Executing/Executed/Failed)
- [ ] Cancel scheduled order before execution
- [ ] Notifications:
  - [ ] 1 hour before execution
  - [ ] 5 minutes before execution
  - [ ] 30 seconds before execution
  - [ ] At execution time
- [ ] Support for Market and Limit scheduled orders
- [ ] Optional: Recurring orders (DCA) - Phase 2

---

📋 OUR DIFFERENTIATORS: SOCIAL FEATURES

Room Management (Functionality)

- [ ] Room Header (Top Bar)
  - [ ] Room name display
  - [ ] Host indicator (crown icon/badge)
  - [ ] Participant count (e.g., "👥 12 traders")
  - [ ] Virtual balance display
  - [ ] Cumulative profit rate (color-coded)
  - [ ] Room settings button (host only)
  - [ ] Close Room button (host only)
  - [ ] Leave Room button (participants)

Social Panels (Draggable & Collapsible)

- [ ] Participants Panel

  - [ ] List of all users in room
  - [ ] User avatars(phase 2)
  - [ ] Username display
  - [ ] Host badge for room creator
  - [ ] Online status indicators
  - [ ] Participant count in header
  - [ ] Collapse/expand toggle
  - [ ] Draggable (can move anywhere)
  - [ ] Resizable
  - [ ] Can be hidden completely

- [ ] Chat Panel (Real-time)
  - [ ] Message input field
  - [ ] Send button
  - [ ] Real-time message display
  - [ ] User avatars in messages(phase 2)
  - [ ] Timestamp for each message
  - [ ] Auto-scroll to latest message
  - [ ] Unread message indicator
  - [ ] Collapse/expand toggle
  - [ ] Draggable (can move anywhere)
  - [ ] Resizable
  - [ ] Can be hidden completely
  - [ ] Message history (last 100 messages)

Social Trading Features

- [ ] Virtual balance tracking

  - [ ] Starting balance per user
  - [ ] Current balance updates with trades
  - [ ] P&L tracking per user
  - [ ] Leaderboard

- [ ] Host controls
  - [ ] Kick participant
  - [ ] Mute participant (chat)
  - [ ] Room settings (public/private)
  - [ ] Share trade signals (optional - Phase 2)

---

SOME - MINOR SUGGESTIONS :

1. Show Calculated Target Price
When user enters %, show what the actual price will be:
jsx
// Inside TP section
{tpPercent > 0 && (
  <div className="calculated-price">
    Target Price: <strong>${calculatedTPPrice.toLocaleString()}</strong>
  </div>
)}

2. Show Risk/Reward Ratio
When both TP and SL are set:
jsx
// At bottom of modal, before Confirm button
{tpPercent > 0 && slPercent > 0 && (
  <div className="risk-reward-display">
    <span className="label">Risk/Reward Ratio:</span>
    <span className={`ratio ${rrRatio >= 1 ? 'good' : 'bad'}`}>
      1:{rrRatio.toFixed(2)}
    </span>
  </div>
)}

3. Slider Color Coding
   css
   /_ Take Profit slider - green gradient _/
   .tp-slider::-webkit-slider-track {
   background: linear-gradient(to right,
   rgba(0,255,0,0.1) 0%,
   rgba(0,255,0,0.3) 100%
   );
   }

/_ Stop Loss slider - red gradient _/
.sl-slider::-webkit-slider-track {
background: linear-gradient(to right,
rgba(255,0,0,0.1) 0%,
rgba(255,0,0,0.3) 75%
);
}

4. Validation Messages
   jsx
   // If TP is below entry (for Long)
   {side === 'Long' && tpPrice < entryPrice && (
   <span className="error">⚠️ TP must be above entry price</span>
   )}

// If SL is above entry (for Long)
{side === 'Long' && slPrice > entryPrice && (
<span className="error">⚠️ SL must be below entry price</span>
)}

Core Brand Application
[ ] Add CSS variables to root stylesheet
[ ] Apply to active tab indicators
[ ] Apply to active filters
[ ] Apply to links and hover states
[ ] Apply to primary buttons (non-trading)
[ ] Test contrast and readability

Extended Application  
[ ] Apply to loading states
[ ] Apply to notifications
[ ] Apply to modals/dialogs
[ ] Apply to tooltips
[ ] Add glow effects (subtle)
[ ] Create brand style guide document

[ ] Add smooth transitions
[ ] Add hover animations
[ ] Test across all screens

COMPLETE COLOR PALETTE
/_ Trading Platform Color System _/

/_ Brand Identity _/
--brand-primary: #F0B90B; /_ Yellow/Gold _/
--brand-hover: #F7931A; /_ Bitcoin Orange _/
--brand-light: #FCD535; /_ Light Yellow _/
--brand-dark: #D9A00A; /_ Dark Gold _/

/_ Trading Semantics (Sacred - Don't Touch) _/
--color-long: #22C55E; /_ Green _/
--color-short: #EF4444; /_ Red _/
--color-profit: #22C55E; /_ Green _/
--color-loss: #EF4444; /_ Red _/

/_ UI Neutrals _/
--bg-primary: #0A0E13; /_ Darkest _/
--bg-secondary: #161A1E; /_ Medium dark _/
--bg-elevated: #1E2329; /_ Lighter panels _/
--bg-hover: rgba(255,255,255,0.05);

/_ Text _/
--text-primary: rgba(255,255,255,0.9);
--text-secondary: rgba(255,255,255,0.6);
--text-tertiary: rgba(255,255,255,0.4);
--text-disabled: rgba(255,255,255,0.2);

/_ Borders _/
--border-default: rgba(255,255,255,0.05);
--border-hover: rgba(255,255,255,0.1);
--border-focus: var(--brand-primary);

/_ Status _/
--status-warning: #F59E0B; /_ Amber _/
--status-error: #EF4444; /_ Red _/
--status-info: #3B82F6; /_ Blue _/
--status-success: var(--brand-primary); /_ Yellow _/

KEEP GREEN/RED FOR TRADING:
✅ Buy/Long buttons = GREEN (never yellow)
✅ Sell/Short buttons = RED (never yellow)
✅ Profit = GREEN (never yellow)
✅ Loss = RED (never yellow)
✅ Positive P&L = GREEN (never yellow)
✅ Negative P&L = RED (never yellow)

Yellow on dark = ⭐⭐⭐⭐⭐ Excellent contrast
Orange on dark = ⭐⭐⭐⭐ Good, but less striking

We will be choosing the yellow one .

This is the implementation color:
:root {
/_ Brand Colors - Yellow/Gold _/
--brand-primary: #F0B90B; /_ Main yellow (Bybit-style) _/
--brand-primary-hover: #F7931A; /_ Bitcoin orange hover _/
--brand-primary-light: #FCD535; /_ Light yellow _/
--brand-primary-dark: #D9A00A; /_ Dark gold _/
--brand-glow: rgba(240, 185, 11, 0.2); /_ Glow effect _/

/_ Trading Colors (Keep Separate) _/
--color-profit: #22C55E; /_ Green _/
--color-loss: #EF4444; /_ Red _/
--color-buy: #22C55E; /_ Green _/
--color-sell: #EF4444; /_ Red _/

/_ Backgrounds _/
--bg-primary: #0A0E13;
--bg-secondary: #161A1E;
--bg-elevated: #1E2329;

/_ Text _/
--text-primary: rgba(255,255,255,0.9);
--text-secondary: rgba(255,255,255,0.6);
--text-tertiary: rgba(255,255,255,0.4);

/_ Borders _/
--border-color: rgba(255,255,255,0.1);
--border-color-hover: rgba(255,255,255,0.2);
}

WHERE TO APPLY YELLOW

1. Active Tab Indicator
2. Active Filter (Your Innovation)
3. Links & Hover States
4. Room Header Accent
   css
   .room-header {
   background: var(--bg-secondary);
   border-bottom: 1px solid var(--brand-primary);
   }

.profit-indicator.positive::before {
content: "▲";
color: var(--brand-primary);
}

5. Primary Buttons (Non-Trading)

6. Donation/Chat Buttons
7. Loading States
8. Success Notifications

9. Clear Button (Your Filter Bar)

MY PROFESSIONAL RECOMMENDATION FOR TRADING:
We will GO WITH YELLOW/GOLD 🟡

🏆 WHY YELLOW IS BETTER FOR OUR PLATFORM

1. Trading Platform Psychology
   text
   Yellow/Gold = Money, Profit, Success ✓
   Orange = Energy, Action (more suitable for fitness/food apps)

2. Color Harmony
   text
   Yellow + Green (profit) = ✓ Works well
   Yellow + Red (loss) = ✓ Distinct enough

Orange + Green (profit) = ⚠️ Too similar (both warm)
Orange + Red (loss) = ❌ Clash (both aggressive)

3. Industry Standard
   text
   Bybit, Binance, Huobi = Yellow → Proven to work
   Users expect it in trading platforms
   Feels "at home" for traders

4. Visibility
   text
   Yellow on dark = ⭐⭐⭐⭐⭐ Excellent contrast
   Orange on dark = ⭐⭐⭐⭐ Good, but less striking

5. Brand Positioning
   text
   Yellow = "Professional trading platform" (like the big guys)
   Orange = "Innovative startup" (less established feeling)

[v] Quickly closing issue - if I hit close it should remove quickly but there is delay
[v] Time zone
[v] Redirect issue
[v] Limit market issue
[v] Chart price are not moving in sync with order book
[v] Virtual balance negative issue.
[v] Lag in the position tab.
[v] In the tp/sl number issue.
