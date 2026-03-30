# Refresh Data Feature - CORRECTED

## Overview

The "Refresh Data" button recalculates stock and revenue based on transactions, while preserving user-entered cost data.

## How It Works

### When You Click "Refresh Data":

1. **Queries Transactions** for the selected month
2. **Calculates Stock**: Remaining = Opening + Restocked - Sold
3. **Calculates Revenue**: From transaction totals
4. **Preserves Costs**: Does NOT change buying cost or operating expenses
5. **Updates Carry Forward**: Sets next month's opening stock

## Example (Your Data)

### February 2025:

- Opening Stock: 1035
- Restocked: 0
- Sold: 615
- **Remaining: 1035 + 0 - 615 = 420** ✓

## What Gets Updated

- `gross_revenue` - from transactions
- `net_profit` - calculated (revenue - costs)
- `carry_forward_stock` - calculated (opening + restocked - sold)
- `full_bottles` - updated to match carry forward

## What Is PRESERVED (Not Changed)

- `opening_stock` - user provided
- `total_restocked` - user provided
- `total_buying_cost` - user provided
- `operating_expenses` - user provided

## Formula

**Remaining Stock = Opening Stock + Restocked - Sold**

Example: 1035 + 0 - 615 = 420
