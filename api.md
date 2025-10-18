# Bybit API Documentation

## REST API Endpoints (Public - Free)

### Base URL

```
https://api.bybit.com/v5/market/
```

### 1. Market Tickers

**Endpoint**: `/tickers`
**Parameters**: `category=linear&symbol=BTCUSDT`
**Full URL**: `https://api.bybit.com/v5/market/tickers?category=linear&symbol=BTCUSDT`
**Provides**: Current price, 24h change, high/low, volume, turnover, funding rate

### 2. Order Book

**Endpoint**: `/orderbook`
**Parameters**: `category=linear&symbol=BTCUSDT&limit=25`
**Full URL**: `https://api.bybit.com/v5/market/orderbook?category=linear&symbol=BTCUSDT&limit=25`
**Provides**: Bids/asks with price and quantity

### 3. Recent Trades

**Endpoint**: `/recent-trade`
**Parameters**: `category=linear&symbol=BTCUSDT&limit=50`
**Full URL**: `https://api.bybit.com/v5/market/recent-trade?category=linear&symbol=BTCUSDT&limit=50`
**Provides**: Recent trades with price, quantity, time, side

### 4. Klines/Candles

**Endpoint**: `/kline`
**Parameters**: `category=linear&symbol=BTCUSDT&interval=1&limit=200`
**Full URL**: `https://api.bybit.com/v5/market/kline?category=linear&symbol=BTCUSDT&interval=1&limit=200`
**Intervals**: 1, 3, 5, 15, 30, 60, 120, 240, 360, 720, D, W, M

### 5. Funding Rate History

**Endpoint**: `/funding/history`
**Parameters**: `category=linear&symbol=BTCUSDT&limit=200`
**Full URL**: `https://api.bybit.com/v5/market/funding/history?category=linear&symbol=BTCUSDT&limit=200`

### 6. Open Interest

**Endpoint**: `/open-interest`
**Parameters**: `category=linear&symbol=BTCUSDT&intervalTime=5min`
**Full URL**: `https://api.bybit.com/v5/market/open-interest?category=linear&symbol=BTCUSDT&intervalTime=5min`
**Valid intervals**: 5min, 15min, 30min, 1h, 4h, 1d

### 7. Long/Short Ratio

**Endpoint**: `/account-ratio`
**Parameters**: `category=linear&symbol=BTCUSDT&period=5m&limit=200`
**Full URL**: `https://api.bybit.com/v5/market/account-ratio?category=linear&symbol=BTCUSDT&period=5m&limit=200`

---

## WebSocket Streams (Public - Free)

### Base URL

```
wss://stream.bybit.com/v5/public/linear
```

### 1. Ticker Stream

**Topic**: `tickers.BTCUSDT`
**Subscription Message**:

```json
{
  "op": "subscribe",
  "args": ["tickers.BTCUSDT"]
}
```

**Provides**: Real-time price, 24h stats, funding rate

### 2. Order Book Stream

**Topic**: `orderbook.50.BTCUSDT`
**Subscription Message**:

```json
{
  "op": "subscribe",
  "args": ["orderbook.50.BTCUSDT"]
}
```

**Provides**: Real-time order book updates (50 levels)

### 3. Trade Stream

**Topic**: `publicTrade.BTCUSDT`
**Subscription Message**:

```json
{
  "op": "subscribe",
  "args": ["publicTrade.BTCUSDT"]
}
```

**Provides**: Real-time trade executions

### 4. Kline Stream

**Topic**: `kline.1.BTCUSDT`
**Subscription Message**:

```json
{
  "op": "subscribe",
  "args": ["kline.1.BTCUSDT"]
}
```

**Provides**: Real-time candle updates (1 minute)

---

## Important Notes

### Rate Limits

- **REST API**: 120 requests per minute per IP
- **WebSocket**: No specific limits mentioned for public streams
- **All endpoints are FREE** - no API key required for public data

### Category Parameter

- Always use `category=linear` for USDT perpetual futures
- This is for futures trading, not spot trading

### Symbol Format

- Use trading pair symbols: `BTCUSDT`, `ETHUSDT`, `ADAUSDT`, etc.

### Testing Tools

- **WebSocket Testing**: https://websocketking.com/
- **REST API Testing**: Use browser or Postman

### Data Mapping for Components

#### Market Widget (`market-widget.tsx`):

- `lastPrice` → currentPrice
- `price24hPcnt` → changePercent24h
- `highPrice24h` → high24h
- `lowPrice24h` → low24h
- `volume24h` → volume24hBTC
- `turnover24h` → turnover24hUSDT
- `fundingRate` → fundingRate
- `openInterest` → openInterest

#### Order Book (`order-book-test.tsx`):

- `b` array → bids (price, qty)
- `a` array → asks (price, qty)
- `lastPrice` → currentPrice
- `markPrice` → markPrice
