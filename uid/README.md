# UID Payback System (Simplified Launch)

This document explains what to do for the UID payback system, based on the latest requirements. No broker API integration is needed for launch. All payback logic is handled in our own system.

---

## Step-by-Step What To Do

1. **UID Registration**

   - Let users enter their UID for each broker (Bybit, OKX, Bitget, BingX, Deepcoin, OrangeX, Blopin, Lbank, GateIO, XT, Tapbit).
   - Store each UID in your database, linked to the user and broker.

2. **Set Payback Percentages**

   - Decide and store the payback % for each broker (e.g., BingX = 65%, Bitget = 55%, etc.).
   - This can be a setting in your admin panel or a config file/table.

3. **Track User Trading Volume**

   - Track or let users report their trading volume for each broker/UID.
   - (For launch, this can be manual or based on user-uploaded screenshots, CSVs, or self-reporting.)

4. **Calculate Payback**

   - For each user and broker, calculate:  
     `Payback = Trading Volume x Payback %`
   - Show this amount to the user in real-time on their dashboard.

5. **Pay Users**

   - Pay users from your own wallet, based on your calculation.
   - This can be manual (admin sends money and marks as paid) or automated later.

6. **Admin Tools**

   - Add admin features to:
     - Adjust payback % per broker
     - Mark paybacks as paid/pending/failed
     - Export payback data (CSV)

7. **(Optional) UID Validation**
   - For launch, skip broker API validation.
   - Optionally, check UID format or prevent duplicates in your system.

---

## What You Do NOT Need (for Launch)

- No broker API integration
- No partner/affiliate API keys
- No automatic payback tracking from brokers
- No complex UID validation with brokers

---

## Future Improvements (After Launch)

- Integrate with broker APIs for automatic UID validation and payback tracking
- Automate payback payouts
- Add broker-specific payout logic if needed

---

**Summary:**

- All payback logic is in your system.
- You decide and pay the full amount to users.
- No broker API needed for launch.
