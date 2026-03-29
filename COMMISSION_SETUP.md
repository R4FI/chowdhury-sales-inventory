# Commission Feature Setup Guide

## Overview

The commission feature allows you to track monthly commissions received from the company. This is stored separately in Supabase and added to your net profit calculations.

## Database Setup

### Step 1: Create the Commission Table in Supabase

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the SQL script from `supabase_commission_table.sql`

This will create:

- `month_commissions` table with the following columns:
  - `id` (UUID, primary key)
  - `month_id` (TEXT, unique) - e.g., "feb-2025"
  - `month_label` (TEXT) - e.g., "Feb 2025"
  - `commission_amount` (NUMERIC) - The commission amount
  - `commission_note` (TEXT, optional) - Notes about the commission
  - `created_at` (TIMESTAMP)
  - `updated_at` (TIMESTAMP)

### Step 2: Verify Table Creation

Run this query to verify:

```sql
SELECT * FROM month_commissions;
```

## Features

### Commission Management Page

- **Location**: `/commission` route
- **Access**: Via sidebar navigation "Commission" link

### Capabilities:

1. **Add Commission**: Enter commission amount and optional notes for the current month
2. **Update Commission**: Modify existing commission data
3. **Delete Commission**: Remove commission records
4. **View Summary**: See how commission affects total profit

### Integration Points:

#### Dashboard

- Shows commission in the Monthly Summary card
- Displays "Total Profit" (Net Profit + Commission) when commission exists

#### Reports Page

- Includes commission in the financial summary
- Shows total profit with commission in the invoice preview

## Data Structure

### MonthCommission Interface

```typescript
interface MonthCommission {
  id?: string;
  month_id: string; // e.g., "feb-2025"
  month_label: string; // e.g., "Feb 2025"
  commission_amount: number; // Commission amount in ৳
  commission_note?: string; // Optional notes
  created_at?: string; // ISO timestamp
}
```

## Usage

### Adding a Commission

1. Navigate to Commission page from sidebar
2. Enter the commission amount
3. Optionally add notes (e.g., "Q1 Performance Bonus")
4. Click "ADD COMMISSION"

### Updating a Commission

1. The form will show existing commission data
2. Modify the amount or notes
3. Click "UPDATE COMMISSION"

### Deleting a Commission

1. Click the "DELETE" button
2. Confirm the deletion

## API Hooks

### useMonthCommission(monthId)

```typescript
const {
  commission, // Current commission data or null
  loading, // Loading state
  addOrUpdateCommission, // Function to add/update
  deleteCommission, // Function to delete
  refetch, // Function to refresh data
} = useMonthCommission(month.month_id);
```

### Example Usage:

```typescript
// Add or update commission
await addOrUpdateCommission(5000, "Quarterly bonus");

// Delete commission
await deleteCommission();
```

## Calculations

### Total Profit Formula:

```
Total Profit = Net Profit + Commission Amount
```

Where:

- **Net Profit** = Gross Revenue - Total Buying Cost - Operating Expenses
- **Commission Amount** = Monthly commission from company (if exists)

## Notes

- Commission is optional - months without commission will show only net profit
- Commission data is stored per month using `month_id` as the unique identifier
- If Supabase is not configured, commission data is stored in local memory (temporary)
- Commission is automatically included in all financial summaries when present

## Troubleshooting

### Commission not showing?

1. Check if Supabase is properly configured (`.env` file)
2. Verify the table was created successfully
3. Check browser console for any errors
4. Ensure `month_id` matches between `month_summary` and `month_commissions` tables

### Can't add commission?

1. Verify Supabase connection
2. Check RLS (Row Level Security) policies are enabled
3. Ensure you have write permissions on the table

## Future Enhancements

Potential features to add:

- Commission history view (all months)
- Commission analytics and trends
- Multiple commission types per month
- Commission approval workflow
- Export commission data separately
