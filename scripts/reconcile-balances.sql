-- ============================================================================
-- RECONCILIATION SCRIPT: Fix Virtual Balance Over-Deductions
-- ============================================================================
-- This script finds and fixes rooms that were incorrectly charged the full
-- orderValue instead of (margin + fee) when opening leveraged positions.
--
-- IMPORTANT: Run this AFTER confirming the RPC function fix is working!
-- Replace '2024-01-15 00:00:00' with the date when the RPC function was updated.
-- ============================================================================

-- STEP 1: REVIEW - See which rooms were affected (RUN THIS FIRST!)
-- Replace '2024-01-15 00:00:00' with your actual fix date/time
SELECT 
    p.room_id,
    r.name as room_name,
    COUNT(*) as affected_positions,
    SUM((p.entry_price * p.quantity) - (p.initial_margin + p.fee)) as total_over_deduction,
    MIN(p.opened_at) as first_affected_position,
    MAX(p.opened_at) as last_affected_position
FROM public.trading_room_positions p
JOIN public.trading_rooms r ON r.id = p.room_id
WHERE p.opened_at < '2024-01-15 00:00:00'  -- CHANGE THIS DATE!
    AND p.closed_at IS NULL  -- Only open positions
    AND p.leverage > 1  -- Only leveraged positions
    AND (p.entry_price * p.quantity) > (p.initial_margin + p.fee)  -- Bug occurred
GROUP BY p.room_id, r.name
ORDER BY total_over_deduction DESC;

-- STEP 2: DETAILED VIEW - See individual positions (optional)
SELECT 
    p.room_id,
    r.name as room_name,
    p.id as position_id,
    p.opened_at,
    p.symbol,
    p.side,
    p.quantity,
    p.entry_price,
    p.leverage,
    (p.entry_price * p.quantity) as order_value,
    p.initial_margin,
    p.fee,
    (p.initial_margin + p.fee) as correct_deduction,
    (p.entry_price * p.quantity) as actual_deduction_bug,
    (p.entry_price * p.quantity) - (p.initial_margin + p.fee) as over_deduction
FROM public.trading_room_positions p
JOIN public.trading_rooms r ON r.id = p.room_id
WHERE p.opened_at < '2024-01-15 00:00:00'  -- CHANGE THIS DATE!
    AND p.closed_at IS NULL
    AND p.leverage > 1
    AND (p.entry_price * p.quantity) > (p.initial_margin + p.fee)
ORDER BY p.room_id, p.opened_at;

-- ============================================================================
-- STEP 3: ACTUAL FIX - Uncomment and run this when ready
-- ============================================================================
-- WARNING: This will modify room balances. Test in staging first!
-- 
-- BEGIN;
-- 
-- UPDATE public.trading_rooms r
-- SET virtual_balance = virtual_balance + (
--     SELECT COALESCE(SUM((p.entry_price * p.quantity) - (p.initial_margin + p.fee)), 0)
--     FROM public.trading_room_positions p
--     WHERE p.room_id = r.id
--         AND p.opened_at < '2024-01-15 00:00:00'  -- CHANGE THIS DATE!
--         AND p.closed_at IS NULL
--         AND p.leverage > 1
--         AND (p.entry_price * p.quantity) > (p.initial_margin + p.fee)
-- )
-- WHERE EXISTS (
--     SELECT 1 
--     FROM public.trading_room_positions p
--     WHERE p.room_id = r.id
--         AND p.opened_at < '2024-01-15 00:00:00'  -- CHANGE THIS DATE!
--         AND p.closed_at IS NULL
--         AND p.leverage > 1
--         AND (p.entry_price * p.quantity) > (p.initial_margin + p.fee)
-- );
-- 
-- -- Verify the changes
-- SELECT 
--     r.id,
--     r.name,
--     r.virtual_balance as new_balance,
--     (
--         SELECT COALESCE(SUM((p.entry_price * p.quantity) - (p.initial_margin + p.fee)), 0)
--         FROM public.trading_room_positions p
--         WHERE p.room_id = r.id
--             AND p.opened_at < '2024-01-15 00:00:00'  -- CHANGE THIS DATE!
--             AND p.closed_at IS NULL
--             AND p.leverage > 1
--             AND (p.entry_price * p.quantity) > (p.initial_margin + p.fee)
--     ) as adjustment_made
-- FROM public.trading_rooms r
-- WHERE EXISTS (
--     SELECT 1 
--     FROM public.trading_room_positions p
--     WHERE p.room_id = r.id
--         AND p.opened_at < '2024-01-15 00:00:00'  -- CHANGE THIS DATE!
--         AND p.closed_at IS NULL
--         AND p.leverage > 1
--         AND (p.entry_price * p.quantity) > (p.initial_margin + p.fee)
-- )
-- ORDER BY adjustment_made DESC;
-- 
-- -- If everything looks good:
-- -- COMMIT;
-- -- If something looks wrong:
-- -- ROLLBACK;
-- 
-- ============================================================================

-- STEP 4: ALTERNATIVE - Fix one room at a time (safer for testing)
-- Uncomment and replace 'room-uuid-here' with actual room ID
/*
UPDATE public.trading_rooms
SET virtual_balance = virtual_balance + (
    SELECT COALESCE(SUM((p.entry_price * p.quantity) - (p.initial_margin + p.fee)), 0)
    FROM public.trading_room_positions p
    WHERE p.room_id = 'room-uuid-here'  -- CHANGE THIS!
        AND p.opened_at < '2024-01-15 00:00:00'  -- CHANGE THIS DATE!
        AND p.closed_at IS NULL
        AND p.leverage > 1
        AND (p.entry_price * p.quantity) > (p.initial_margin + p.fee)
)
WHERE id = 'room-uuid-here';  -- CHANGE THIS!
*/
