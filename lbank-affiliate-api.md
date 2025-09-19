# Affiliate API Documentation

## Update Log

| Effective Time (UTC+8) | Type           | Description                                                                                                                                                                                                                                                                                                                                                                                                                                              | Version |
| ---------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 2025.09.03 16:00       | Added          | `/v2/money/detail/list` new field: `withdrawOrderId`                                                                                                                                                                                                                                                                                                                                                                                                     | V1.7    |
| 2025.06.27 16:00       | Added          | Added new field to the following interfaces: /user/team/list, /user/list, and /user/info: Total Spot Assets (USDT only)                                                                                                                                                                                                                                                                                                                                  | V1.6    |
| 2025.02.27 16:00       | New            | Added the following endpoint: `/affiliate-api/v2/money/detail/list`                                                                                                                                                                                                                                                                                                                                                                                      | V1.5    |
| 2024.11.07 16:00       | New            | Added the following endpoint: `/affiliate-api/v2/trade/future`<br/>Note: Starting from 2024.10.31, the commission settlement cycle has been changed to T+1. Commissions generated from orders traded between 00:00 and 24:00 on day T will be distributed after 10:00 on day T+1. Daily commission summaries are now calculated based on 00:00-24:00 trade time. This change affects the data of the following endpoint: `/commission/stats/symbol/list` | V1.4    |
| 2024.09.18 16:00       | Modified       | Added spot and futures asset fields to `user/team/list`, `user/list`, and `user/info` endpoints                                                                                                                                                                                                                                                                                                                                                          | V1.3    |
| 2024.09.10 18:00       | New + Modified | 1. Added `user/team/list` endpoint to replace `user/list`. If currently using `user/list`, please switch to `user/team/list` ASAP.<br/>2. Added `symbol/list` endpoint for querying users' daily commission amounts                                                                                                                                                                                                                                      | V1.2    |
| 2024.08.01 11:00       | New            | Added `user/info` endpoint                                                                                                                                                                                                                                                                                                                                                                                                                               | V1.1    |
| 2024.07.18 21:00       | New            | Initial version of documentation                                                                                                                                                                                                                                                                                                                                                                                                                         | V1.0    |

---

## Access Instructions

### Signature Authentication

Refer to LBank signature authentication - [LBank Signature Authentication](https://www.lbank.com/zh-CN/docs/index.html#c64cd15fdc)

### Access URL

#### **REST API**

Domain: [https://affiliate.lbankverify.com/](https://affiliate.lbankverify.com/) (Requires IP whitelist)

---

### Response Examples

**Success:**

```json
{
  "result": "true",
  "error_code": 0,
  "data": [],
  "ts": 1721305060631
}
```

**Failure:**

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

1. Current version is for internal use only, enabling agents to query data of their team members (the user's team).
2. Pagination uses rolling method with `start + pageSize`. If `start` is not provided, it defaults to 0. For subsequent pages, pass `start + pageSize` as the new `start`. For example: page 1 - `start=0, pageSize=10`; page 2 - `start=10, pageSize=10`; etc.
3. Pagination query limit is max 100 entries. Requests exceeding this limit will return error code `20026` (invalid parameter).

---

# Query Endpoints

---

### Query Team Member Information (New Version)

Rate Limit: 5 requests/10s

`GET /affiliate-api/v2/invite/user/team/list`

**Request Parameters:**

| Name      | Type | Required | Description                                              |
| --------- | ---- | -------- | -------------------------------------------------------- |
| startTime | Long | Yes      | Registration start time                                  |
| endTime   | Long | Yes      | Registration end time                                    |
| start     | int  | Yes      | Start index, default 0; next page use `start + pageSize` |
| pageSize  | int  | Yes      | Number of entries (max 100)                              |

**Response Parameters:**

| Name                    | Type    | Description                                                                          |
| ----------------------- | ------- | ------------------------------------------------------------------------------------ |
| openId                  | String  | User's openId                                                                        |
| code                    | String  | Referral Code                                                                        |
| createTime              | Long    | Registration time (timestamp)                                                        |
| directInvitation        | boolean | Direct invitee or not                                                                |
| deposit                 | boolean | Has deposits/withdrawals or not                                                      |
| transaction             | boolean | Has traded or not                                                                    |
| kycStatus               | Integer | KYC status: 0 - not verified, 1 - verified                                           |
| userLevel               | Integer | User Level: 1–21 (General Agent, Level 1–20 Partner), 0 - Invitee, 99 - Regular user |
| currencyFeeAmt          | String  | Spot Commission Rate (if agent)                                                      |
| contractFeeAmt          | String  | Futures Commission Rate (if agent)                                                   |
| currencyTotalFeeAmt     | String  | Total Spot Assets                                                                    |
| currencyTotalFeeAmtUsdt | String  | Total Spot Assets (USDT only)                                                        |
| contractTotalFeeAmt     | String  | Total Futures Assets                                                                 |
| reserveAmt              | String  | Futures Bonus                                                                        |

**Response Example:**

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
      "currencyTotalFeeAmtUsdt": "0.0000",
      "contractTotalFeeAmt": "0.0000",
      "reserveAmt": "0.0000"
    }
  ],
  "ts": 1721305060631
}
```

---

### Query Team Member Information (Old Version, Deprecated)

Rate Limit: 5 requests/10s

`GET /affiliate-api/v2/invite/user/list`

**Request Parameters:**

| Name      | Type | Required | Description                                                            |
| --------- | ---- | -------- | ---------------------------------------------------------------------- |
| startTime | Long | Yes      | Registration start time                                                |
| endTime   | Long | Yes      | Registration end time                                                  |
| start     | int  | Yes      | Starting data ID, default 0. For next page, use max ID of current page |
| pageSize  | int  | Yes      | Number of entries (max 100)                                            |

**Response Parameters:**
Same as above (New Version).

**Response Example:**
Same as above (New Version).

---

### Query Single Team Member Information

Rate Limit: 5 requests/10s

`GET /affiliate-api/v2/invite/user/info`

**Request Parameters:**

| Name   | Type   | Required | Description |
| ------ | ------ | -------- | ----------- |
| openId | String | Yes      | User openId |

**Response Parameters:**

| Name                    | Type    | Description                                                                          |
| ----------------------- | ------- | ------------------------------------------------------------------------------------ |
| openId                  | String  | User openId                                                                          |
| code                    | String  | Referral Code                                                                        |
| createTime              | Long    | Registration time                                                                    |
| directInvitation        | boolean | Direct invitee or not                                                                |
| deposit                 | boolean | Has deposits/withdrawals or not                                                      |
| transaction             | boolean | Has traded or not                                                                    |
| kycStatus               | Integer | KYC status: 0 - not verified, 1 - verified                                           |
| userLevel               | Integer | User Level: 1–21 (General Agent, Level 1–20 Partner), 0 - Invitee, 99 - Regular user |
| currencyFeeAmt          | String  | Spot Commission Rate (if agent)                                                      |
| contractFeeAmt          | String  | Futures Commission Rate (if agent)                                                   |
| inviteResult            | boolean | Whether queried user is in the user's team; if false, other fields are not reliable  |
| currencyTotalFeeAmt     | String  | Total Spot Assets                                                                    |
| currencyTotalFeeAmtUsdt | String  | Total Spot Assets (USDT only)                                                        |
| contractTotalFeeAmt     | String  | Total Futures Assets                                                                 |
| reserveAmt              | String  | Futures Bonus                                                                        |

**Response Example:**

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
    "currencyTotalFeeAmtUsdt": "0.0000",
    "contractTotalFeeAmt": "0.0000",
    "reserveAmt": "0.0000"
  },
  "ts": 1722247098773
}
```

---

### Query Daily Commission Summary by Coin

Rate Limit: 5 requests/10s

`GET /affiliate-api/v2/commission/stats/symbol/list`

**Request Parameters:**

| Name      | Type   | Required | Description                                                |
| --------- | ------ | -------- | ---------------------------------------------------------- |
| openId    | String | Yes      | User openId who received commission                        |
| tradeType | String | Yes      | Trade type: 0 - Spot, 1 - Futures, 10 - Spot + Futures     |
| startTime | Long   | Yes      | Trade start date                                           |
| endTime   | Long   | Yes      | Trade end date                                             |
| coin      | Long   | Yes      | Coin ID for commission; null for all coins                 |
| start     | int    | Yes      | Starting index, default 0; for next page: start + pageSize |
| pageSize  | int    | Yes      | Number of entries (max 100)                                |

**Response Parameters:**

| Name       | Type   | Description                         |
| ---------- | ------ | ----------------------------------- |
| openId     | String | User openId who received commission |
| coinSymbol | String | Coin symbol                         |
| amount     | String | Amount                              |
| tradeType  | String | Trade type: 0 - Spot, 1 - Futures   |
| statsDate  | Long   | Trade date                          |
| usdtAmount | String | Amount in USDT equivalent           |

**Response Example:**

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

### Query Daily Trade Volume and Fee for Single Team Member

Rate Limit: 5 requests/10s

`GET /affiliate-api/v2/trade/user`

**Request Parameters:**

| Name      | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| openId    | String | Yes      | User openId                                            |
| tradeType | String | Yes      | Trade type: 0 - Spot, 1 - Futures, 10 - Spot + Futures |
| startTime | Long   | Yes      | Trade start date                                       |
| endTime   | Long   | Yes      | Trade end date                                         |

**Response Parameters:**

| Name      | Type   | Description  |
| --------- | ------ | ------------ |
| openId    | String | User openId  |
| statsDate | Long   | Trade date   |
| tradeAmt  | String | Trade volume |
| feeAmt    | String | Fee amount   |

**Response Example:**

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

### Query Daily Trade Volume and Fee for Team

Rate Limit: 5 requests/10s

`GET /affiliate-api/v2/trade/user/team`

**Request Parameters:**

| Name      | Type   | Required | Description                                            |
| --------- | ------ | -------- | ------------------------------------------------------ |
| openId    | String | Yes      | User openId                                            |
| tradeType | String | Yes      | Trade type: 0 - Spot, 1 - Futures, 10 - Spot + Futures |
| startTime | Long   | Yes      | Trade start date                                       |
| endTime   | Long   | Yes      | Trade end date                                         |

**Response Parameters:**

| Name      | Type   | Description  |
| --------- | ------ | ------------ |
| openId    | String | User openId  |
| statsDate | Long   | Trade date   |
| tradeAmt  | String | Trade volume |
| feeAmt    | String | Fee amount   |

**Response Example:**

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

### Query Cumulative Futures Turnover and Fees in Time Range

Rate Limit: 5 requests/10s

`GET /affiliate-api/v2/trade/future`

**Request Parameters:**

| Name      | Type   | Required | Description                                 |
| --------- | ------ | -------- | ------------------------------------------- |
| openId    | String | Yes      | User openId                                 |
| userType  | String | Yes      | User scope (enum): SELF, SUB, SELF_SUB, ALL |
| symbol    | String | No       | Trading pair (optional)                     |
| startTime | Long   | Yes      | Start date                                  |
| endTime   | Long   | Yes      | End date                                    |

**Response Parameters:**

| Name     | Type   | Description                               |
| -------- | ------ | ----------------------------------------- |
| turnover | String | Cumulative futures turnover in time range |
| fee      | String | Cumulative futures fees in time range     |

**Response Example:**

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

### Query Deposit/Withdrawal Details in Time Range

Rate Limit: 5 requests/10s

`GET /affiliate-api/v2/money/detail/list`

**Request Parameters:**

| Name            | Type   | Required | Description                                                                                                                    |
| --------------- | ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| openId          | String | Yes      | User openId                                                                                                                    |
| userType        | String | Yes      | User scope (enum): SELF, SUB, SELF_SUB, ALL                                                                                    |
| startTime       | Long   | Yes      | Start creation timestamp (ms)                                                                                                  |
| endTime         | Long   | Yes      | End creation timestamp (ms)                                                                                                    |
| subInOutType    | String | Yes      | Deposit/Withdrawal type enum: IN_DEPOSIT, OUT_WITHDRAW, IN_OTC_BUY, OUT_OTC_SELL, IN_INNER_TRANSFER_IN, OUT_INNER_TRANSFER_OUT |
| assetCode       | String | No       | Coin symbol, null for all                                                                                                      |
| updateStartTime | Long   | No       | Start update timestamp (ms)                                                                                                    |
| updateEndTime   | Long   | No       | End update timestamp (ms)                                                                                                      |
| start           | int    | Yes      | Starting index, default 0; for next page: start + pageSize                                                                     |
| pageSize        | int    | Yes      | Number of entries (max 100.                                                                                                    |

**Response Parameters:**

| Name            | Type    | Description                                                                          |
| --------------- | ------- | ------------------------------------------------------------------------------------ |
| openId          | String  | User openId                                                                          |
| userLevel       | Integer | User Level: 1–21 (General Agent, Level 1–20 Partner), 0 - Invitee, 99 - Regular user |
| subInOutType    | String  | Deposit/Withdrawal type                                                              |
| assetCode       | String  | Coin symbol                                                                          |
| assetNum        | String  | Amount                                                                               |
| status          | String  | Status                                                                               |
| subStatus       | String  | Sub-status                                                                           |
| createTime      | Long    | Creation time                                                                        |
| updateTime      | Long    | Update time                                                                          |
| withdrawOrderId | String  | withdraw Order Id                                                                    |

**Response Example:**

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
      "updateTime": 1737240179000,
      "withdrawOrderId": "220241015150159"
    }
  ],
  "ts": 1740563092165
}
```
