---
title: "Affiliate API Documentation — v1.5"
version: "v1.5"
---

# Affiliate API — v1.5

> Converted from the uploaded PDF: AffiliateApi_V1.5_0304_EN

---

## Overview

This MDX document provides a developer-friendly documentation of the Affiliate REST API (v1.5). It includes:

- Update log
- Authentication & base URL
- Response format
- Pagination rules & rate limits
- Endpoints with request parameters, response fields and examples

---

## Update Log

- **2025-02-27** — Added `/affiliate-api/v2/money/detail/list` (v1.5)
- **2024-11-07** — Added `/affiliate-api/v2/trade/future`; commission settlement period update (v1.4)
- **2024-09-18** — Added spot & futures asset fields to user/team/list, user/list, user/info (v1.3)
- **2024-09-10** — Added `user/team/list` and `symbol/list` (v1.2)
- **2024-08-01** — Added `user/info` (v1.1)
- **2024-07-18** — Initial version (v1.0)

---

## Authentication

This API uses the **Lbank Signature Authentication** scheme. Refer to the official LBank signature docs for details on how to sign requests.

**Base domain (REST API)**

```
https://affiliate.lbankverify.com/
```

> Note: IP whitelist binding required.

---

## Common Response Format

Successful response example:

```json
{
  "result": "true",
  "error_code": 0,
  "data": [],
  "ts": 1721305060631
}
```

Failure example:

```json
{
  "result": "false",
  "msg": "Parameter can not be null",
  "error_code": 10001,
  "ts": 1721305093220
}
```

---

## Notes

- This version is intended for agents to query data about users under their umbrella.
- Pagination uses `start + pageSize` style (scrolling). If `start` is omitted, defaults to `0`. To request the next page pass `start + pageSize` (new-style endpoints use `start + pageSize`; older endpoints may use max id pagination).
- Max `pageSize` allowed is **100**. Exceeding will return error code **20026** (invalid parameter).

---

# Endpoints

> Each endpoint section contains: method, path, rate limit (if provided), request parameters, response fields and an example.

---

## 1) Query users under the affiliate (Old Pagination — deprecated)

- **Method:** GET
- **Path:** `/affiliate-api/v2/invite/user/list`
- **Rate limit:** 5 requests / 10s

### Request Parameters

| Name      | Type | Required | Description                                                                                        |
| --------- | ---: | :------: | -------------------------------------------------------------------------------------------------- |
| startTime | Long |   true   | Registration start timestamp (ms)                                                                  |
| endTime   | Long |   true   | Registration end timestamp (ms)                                                                    |
| start     |  int |   true   | Starting data ID (default 0). For next page, pass the value of the maximum ID on the current page. |
| pageSize  |  int |   true   | Number of records to return (max 100)                                                              |

### Response Fields

- `id` (int)
- `openId` (string)
- `code` (string) — referral code
- `createTime` (long)
- `directInvitation` (boolean)
- `deposit` (boolean)
- `transaction` (boolean)
- `kycStatus` (integer) — 0: not verified, 1: verified
- `userLevel` (integer) — 1..10 (hierarchy), 0: invitee, 99: regular user
- `currencyFeeAmt` (string) — spot commission rate (if agent)
- `contractFeeAmt` (string) — contract commission rate (if agent)
- `currencyTotalFeeAmt` (string)
- `contractTotalFeeAmt` (string)
- `reserveAmt` (string)

### Example Response

```json
{
  "result": "true",
  "error_code": 0,
  "data": [
    {
      "id": 1001,
      "openId": "LBA0001001",
      "code": "3DFE",
      "createTime": 1721187212000,
      "directInvitation": false,
      "deposit": false,
      "transaction": false,
      "kycStatus": 0,
      "userLevel": 2,
      "currencyFeeAmt": "90",
      "contractFeeAmt": "90",
      "currencyTotalFeeAmt": "0.0000",
      "contractTotalFeeAmt": "0.0000",
      "reserveAmt": "0.0000"
    }
  ],
  "ts": 1721305060631
}
```

---

## 2) Query users under the affiliate (New Version)

- **Method:** GET
- **Path:** `/affiliate-api/v2/invite/user/team/list`
- **Rate limit:** 5 requests / 10s

### Request Parameters

| Name      | Type | Required | Description                                                          |
| --------- | ---: | :------: | -------------------------------------------------------------------- |
| startTime | Long |   true   | Registration start timestamp (ms)                                    |
| endTime   | Long |   true   | Registration end timestamp (ms)                                      |
| start     |  int |   true   | Starting offset (default 0). For next page, pass `start + pageSize`. |
| pageSize  |  int |   true   | Number of records to return (max 100)                                |

### Response Fields

Same as the old-version endpoint (`openId`, `code`, `createTime`, `directInvitation`, `deposit`, `transaction`, `kycStatus`, `userLevel`, `currencyFeeAmt`, `contractFeeAmt`, `currencyTotalFeeAmt`, `contractTotalFeeAmt`, `reserveAmt`).

### Example Response

(See previous example — identical structure.)

---

## 3) Query a specific user under the affiliate

- **Method:** GET
- **Path:** `/affiliate-api/v2/invite/user/info`
- **Rate limit:** 5 requests / 10s

### Request Parameters

| Name   |   Type | Required | Description       |
| ------ | -----: | :------: | ----------------- |
| openId | String |   true   | The user's openId |

### Response Fields

Same fields as above plus:

- `inviteResult` (boolean) — whether the queried user is under the affiliate umbrella. If `false`, other fields may be meaningless.

### Example Response

```json
{
  "result": "true",
  "error_code": 0,
  "data": {
    "openId": null,
    "code": null,
    "createTime": null,
    "directInvitation": false,
    "deposit": false,
    "transaction": false,
    "kycStatus": null,
    "userLevel": null,
    "currencyFeeAmt": null,
    "contractFeeAmt": null,
    "inviteResult": false,
    "currencyTotalFeeAmt": "0.0000",
    "contractTotalFeeAmt": "0.0000",
    "reserveAmt": "0.0000"
  },
  "ts": 1722247098773
}
```

---

## 4) Daily Summary of Commissions by `coinSymbol`

- **Method:** GET
- **Path:** `/affiliate-api/v2/commission/stats/symbol/list`
- **Rate limit:** 5 requests / 10s

### Request Parameters

| Name      |   Type | Required | Description                                                       |
| --------- | -----: | :------: | ----------------------------------------------------------------- |
| openId    | String |   true   | The openId of the user receiving commission                       |
| tradeType | String |   true   | Trade type: `0` (Spot), `1` (Contract), `10` (Spot + Contract)    |
| startTime |   Long |   true   | Trade start date (ms)                                             |
| endTime   |   Long |   true   | Trade end date (ms)                                               |
| coin      |   Long |   true   | Currency identifier — use `null` to query all currencies          |
| start     |    int |   true   | Starting offset (default 0). For next page use `start + pageSize` |
| pageSize  |    int |   true   | Number of records (max 100)                                       |

### Response Fields

- `openId` (string)
- `coinSymbol` (string)
- `amount` (string)
- `tradeType` (string)
- `statsDate` (long) — trade date (timestamp ms)
- `usdtAmount` (string) — amount converted to USDT

### Example Response

```json
{
  "result": "true",
  "error_code": 0,
  "data": [
    {
      "openId": "LBA0H1xxxx",
      "coinSymbol": "usdt",
      "amount": "71.489088",
      "tradeType": 1,
      "statsDate": 1724774400000,
      "usdtAmount": "0"
    }
  ],
  "ts": 1725330101487
}
```

---

## 5) Query daily trading volume and daily commission for a specified user (under the affiliate)

- **Method:** GET
- **Path:** `/affiliate-api/v2/trade/user`
- **Rate limit:** 5 requests / 10s

### Request Parameters

| Name      |   Type | Required | Description                                            |
| --------- | -----: | :------: | ------------------------------------------------------ |
| openId    | String |   true   | openId of the user                                     |
| tradeType | String |   true   | Trade Type: `0` Spot, `1` Futures, `10` Spot + Futures |
| startTime |   Long |   true   | Trade start date (ms)                                  |
| endTime   |   Long |   true   | Trade end date (ms)                                    |

### Response Fields

- `openId` (string)
- `statsDate` (long)
- `tradeAmt` (string) — commission amount
- `feeAmt` (string) — trading volume

### Example Response

```json
{
  "result": "true",
  "error_code": 0,
  "data": [
    {
      "openId": "LBA0H14XXX",
      "statsDate": 1721145600000,
      "tradeAmt": "0",
      "feeAmt": "0"
    }
  ],
  "ts": 1731035663458
}
```

---

## 6) Query the daily trading volume and daily commission amount of the team under the affiliate

- **Method:** GET
- **Path:** `/affiliate-api/v2/trade/user/team`
- **Rate limit:** 5 requests / 10s

### Request Parameters

| Name      |   Type | Required | Description                                            |
| --------- | -----: | :------: | ------------------------------------------------------ |
| openId    | String |   true   | openId of the affiliate                                |
| tradeType | String |   true   | Trade Type: `0` Spot, `1` Futures, `10` Spot + Futures |
| startTime |   Long |   true   | Trade start date (ms)                                  |
| endTime   |   Long |   true   | Trade end date (ms)                                    |

### Response Fields

- `openId`, `statsDate`, `tradeAmt`, `feeAmt` (same meanings as single user endpoint)

### Example Response

```json
{
  "result": "true",
  "error_code": 0,
  "data": [
    {
      "openId": "LBA0H1XXXX",
      "statsDate": 1721145600000,
      "tradeAmt": "0",
      "feeAmt": "0"
    }
  ],
  "ts": 1731035663458
}
```

---

## 7) Query accumulated futures trading volume & commission within a specified period

- **Method:** GET
- **Path:** `/affiliate-api/v2/trade/future`
- **Rate limit:** 5 requests / 10s

### Request Parameters

| Name      |   Type | Required | Description                                     |
| --------- | -----: | :------: | ----------------------------------------------- |
| openId    | String |   true   | openId                                          |
| userType  | String |   true   | Scope: `SELF`, `SUB`, `SELF_SUB`, `ALL`         |
| symbol    | String |  false   | Trading pair (optional). If omitted, query all. |
| startTime |   Long |   true   | Start date (ms)                                 |
| endTime   |   Long |   true   | End date (ms)                                   |

### Response Fields

- `turnover` (string) — accumulated futures transaction volume in range
- `fee` (string) — accumulated futures commission in range

### Example Response

```json
{
  "result": "true",
  "error_code": 0,
  "data": {
    "turnover": "0",
    "fee": "0"
  },
  "ts": 1731036185769
}
```

---

## 8) Query Deposit & Withdrawal Details Within a Specified Time Range

- **Method:** GET
- **Path:** `/affiliate-api/v2/money/detail/list`
- **Rate limit:** 5 requests / 10s

### Request Parameters

| Name            |   Type | Required | Description                                                                                                                                    |
| --------------- | -----: | :------: | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| openId          | String |   true   | openId                                                                                                                                         |
| userType        | String |   true   | Scope: `SELF`, `SUB`, `SELF_SUB`, `ALL`                                                                                                        |
| startTime       |   Long |   true   | Start creation time (ms)                                                                                                                       |
| endTime         |   Long |   true   | End creation time (ms)                                                                                                                         |
| subInOutType    | String |   true   | Deposit & Withdrawal Type (enum): `IN_DEPOSIT`, `OUT_WITHDRAW`, `IN_OTC_BUY`, `OUT_OTC_SELL`, `IN_INNER_TRANSFER_IN`, `OUT_INNER_TRANSFER_OUT` |
| assetCode       | String |  false   | Asset symbol (optional)                                                                                                                        |
| updateStartTime |   Long |  false   | Start modification time (ms)                                                                                                                   |
| updateEndTime   |   Long |  false   | End modification time (ms)                                                                                                                     |
| start           |    int |   true   | Query start position (default 0). For next page pass `start + pageSize`                                                                        |
| pageSize        |    int |   true   | Number of records (max 100)                                                                                                                    |

### Response Fields

- `openId` (string)
- `userLevel` (integer) — user level mapping (1-21 increasing; 0: invitee, 99: regular user)
- `subInOutType` (string)
- `assetCode` (string)
- `assetNum` (string)
- `status` (string)
- `subStatus` (string)
- `createTime` (long)
- `updateTime` (long)

### Example Response

```json
{
  "result": "true",
  "error_code": 0,
  "data": [
    {
      "openId": "LBA0HXXXX",
      "userLevel": 2,
      "subInOutType": "On-chain Deposit",
      "assetCode": "USDT",
      "assetNum": "102.581",
      "status": "Completed",
      "subStatus": "Deposit Successful",
      "createTime": 1737240179000,
      "updateTime": 1737240179000
    }
  ],
  "ts": 1740563092165
}
```

---

## General Tips & Examples

### Pagination example (new-style)

- Request page 1: `start=0&pageSize=10`
- Request page 2: `start=10&pageSize=10`
- Request page 3: `start=20&pageSize=10`

### Timestamps

All timestamps in requests and responses are in **milliseconds since epoch**.

---

## Appendix — Common Enums

- `tradeType`:

  - `0` — Spot
  - `1` — Contract / Futures
  - `10` — Spot + Contract

- `userType` (scope): `SELF`, `SUB`, `SELF_SUB`, `ALL`

- `subInOutType`:
  - `IN_DEPOSIT`, `OUT_WITHDRAW`, `IN_OTC_BUY`, `OUT_OTC_SELL`, `IN_INNER_TRANSFER_IN`, `OUT_INNER_TRANSFER_OUT`

---

## Need changes?

If you want this MDX exported to a file, restructured (e.g. smaller pages per endpoint), or additional examples (curl, Node, Python), tell me which format you prefer and I'll generate it.
