# Ledgr — Product Features & How It Works

## 1. Product Overview

**Ledgr** is a personal and collaborative finance manager.

It helps users manage their own money while also handling financial relationships with:

- Partners
- Family
- Roommates
- Friends
- Trip groups
- Households

Ledgr brings personal finance, shared expenses, debts, budgets, savings goals, investments, analytics, and financial insights into one place.

The core idea is:

> **Record financial reality once, then use that information everywhere.**

---

# 2. Personal Finance

Personal finance is the foundation of Ledgr.

Users can record and understand their everyday financial activity.

### Users can:

- Record expenses
- Record income
- Record transfers
- Categorize transactions
- Attach receipts
- Add merchants
- Add notes
- Add tags
- Associate transactions with accounts
- View transaction history
- Search and filter transactions

Account selection is optional for normal transactions.

For example, a user can record:

> Lunch — ₹300

without selecting a bank account.

If an account is selected, Ledgr can also reflect the transaction in that account's balance.

---

# 3. Transactions

Transactions represent actual financial activity.

There are three primary everyday actions:

### Expense

Money leaving the user.

Example:

> Groceries — ₹2,500

### Income

Money coming to the user.

Example:

> Salary — ₹80,000

### Transfer

Money moving between the user's accounts.

Example:

> Bank Account → Savings Account — ₹20,000

A transfer is not treated as income or expense because the user's total money has not changed.

---

# 4. Accounts

Accounts represent where money is held.

Examples:

- Bank accounts
- Cash
- Wallets
- Credit cards
- Savings accounts
- Investment accounts

Each account provides:

- Current balance
- Transaction history
- Balance history
- Account activity
- Related goals
- Relevant analytics

Users can archive accounts without losing their historical transactions.

---

# 5. Categories

Categories help users understand where money is being spent or received.

Categories can be organized into groups.

Example:

```text
Food
 ├── Groceries
 ├── Restaurants
 └── Delivery

Transport
 ├── Fuel
 ├── Taxi
 └── Public Transport
```

Categories are used throughout Ledgr for:

- Transactions
- Budgets
- Spending analytics
- Reports
- AI insights

---

# 6. Dashboard

The dashboard provides a quick overview of the user's financial situation.

It can show:

### Money

- Total balance
- Income
- Expenses
- Cash flow
- Net worth

### Planning

- Budget usage
- Savings goals
- Upcoming recurring payments

### Together

- Money others owe you
- Money you owe others
- Recent shared expenses
- Pending settlements

### Activity

- Recent transactions
- Recent financial events

The dashboard should answer:

> **"How am I doing financially right now?"**

---

# 7. Spaces

Spaces allow users to separate different financial contexts.

Examples:

```text
Personal
Goa Trip
Couple
Roommates
Family
Household
```

Each space has its own relevant financial activity.

---

# 8. Personal Space

Every user can have a personal financial space.

This is where they manage their own finances.

Example:

```text
Personal

Accounts
Transactions
Budgets
Goals
Investments
Analytics
```

Personal data does not automatically become visible to other people.

---

# 9. Household Space

A household represents people managing finances around a shared living environment.

Example:

```text
JD
Partner
Roommate
```

Typical expenses:

- Rent
- Electricity
- Internet
- Groceries
- Cleaning
- Household subscriptions

The household can have shared expenses, shared budgets, and optionally shared accounts.

---

# 10. Family Space

Family is focused on financial collaboration between family members.

A family does not necessarily mean everyone lives together.

Examples:

- Parents
- Children
- Siblings

Possible use cases:

- Family expenses
- Education expenses
- Family goals
- Shared subscriptions
- Financial responsibilities

---

# 11. Couple Space

A couple space allows two people to manage shared financial activity.

They can track:

- Shared expenses
- Shared budgets
- Shared goals
- Shared accounts
- Who paid for what
- Who owes whom

Personal finances can remain separate while shared finances are managed together.

---

# 12. Roommates Space

Roommates can use a space for household expenses.

Example:

```text
Rent
Electricity
Internet
Groceries
Cleaning
```

Each expense can be divided between roommates.

Ledgr keeps track of the resulting balances automatically.

---

# 13. Trip Space

A trip space is designed for temporary shared expenses.

Example:

```text
Goa Trip

JD
Rahul
Aman
Priya
```

Users can record:

- Hotels
- Food
- Taxi
- Tickets
- Activities
- Shopping

Expenses can then be split between participants.

---

# 14. Group Space

A general-purpose group space can be used for situations that don't fit the other categories.

Examples:

- Friends
- Events
- Clubs
- Projects
- Group activities

The same shared-expense functionality can be used.

---

# 15. Friends

Friends are people the user has financial relationships with.

A friend does **not** need a Ledgr account.

For example:

```text
Rahul
```

can exist as a contact even if Rahul never signs up.

A friend can participate in:

- Bill splits
- Debts
- Settlements
- Shared expenses

Being someone's friend does not give them access to the user's finances.

---

# 16. Bill Splitting

Bill splitting allows users to divide one real expense between multiple people.

Example:

JD pays:

> Dinner — ₹3,000

Three people participated:

```text
JD       ₹1,000
Rahul    ₹1,000
Aman     ₹1,000
```

Ledgr records the actual ₹3,000 expense once.

It then calculates what each person should ultimately bear.

If JD paid the entire amount:

```text
Rahul owes JD ₹1,000
Aman owes JD ₹1,000
```

---

# 17. Split Methods

Expenses can be divided using:

### Equal

₹3,000 / 3 people

```text
₹1,000 each
```

### Exact Amount

```text
JD      ₹1,200
Rahul   ₹800
Aman    ₹1,000
```

### Percentage

```text
JD      40%
Rahul   30%
Aman    30%
```

### Shares

```text
JD      2 shares
Rahul   1 share
Aman    1 share
```

Ledgr calculates the final amounts automatically.

---

# 18. Debts

A debt represents money one person currently owes another.

Debts can be created from:

- Bill splits
- Lending
- Borrowing
- Manual obligations

Example:

```text
Rahul owes JD ₹1,000
```

A debt is not treated as an expense or income.

It represents an outstanding obligation.

---

# 19. Debt Tracking

For every friend, Ledgr can show:

```text
They owe you
You owe them
Net balance
```

Example:

```text
Rahul

They owe you: ₹1,500
You owe them: ₹300

Net:
Rahul owes you ₹1,200
```

---

# 20. Mutual Debt Netting

Ledgr supports situations where two people owe each other money.

Example:

```text
Dinner
Rahul owes JD ₹500

Hotel
Rahul owes JD ₹1,000

Taxi
JD owes Rahul ₹300
```

Instead of asking the user to make multiple payments, Ledgr calculates:

```text
Rahul owes JD ₹1,500
JD owes Rahul ₹300

Net = ₹1,200
```

The UI can show:

> **Rahul owes you ₹1,200**

with:

> **Settle up**

The original debts remain visible in history.

---

# 21. Settlements

A settlement records repayment of a debt.

Example:

```text
Rahul owes JD ₹1,200

Rahul pays JD ₹1,200
```

Result:

```text
Outstanding debt = ₹0
```

Settlements can also be partial.

Example:

```text
Debt = ₹1,200
Payment = ₹700

Remaining = ₹500
```

---

# 22. Settlement History

Users can see:

- Original debt
- Payments made
- Partial settlements
- Final settlement
- Settlement date
- Related expense

This gives users a complete history of financial relationships.

---

# 23. Budgets

Budgets help users control spending.

A budget is created for a category.

Example:

```text
Food
Monthly budget
₹15,000
```

The user then sees:

```text
Spent: ₹11,200
Remaining: ₹3,800
```

---

# 24. Budget Periods

Budgets can repeat across periods.

Examples:

- Weekly
- Monthly
- Quarterly
- Yearly
- Custom

Example:

```text
Food Budget

January    ₹15,000
February   ₹15,000
March      ₹18,000
```

Each period tracks its own spending.

---

# 25. Budget Alerts

Users can configure spending thresholds.

Example:

```text
Budget = ₹10,000

80% used
```

Ledgr can notify the user:

> You've used 80% of your Food budget.

When the budget is exceeded:

> You've exceeded your Food budget by ₹1,200.

---

# 26. Savings Goals

Savings goals help users protect money for something important.

Examples:

- Emergency fund
- New laptop
- Car
- Vacation
- House
- Education

A goal has:

```text
Target amount
Saved/protected amount
Linked account
Deadline
```

---

# 27. Goal Target Amount

The target is the ultimate amount the user wants to save.

Example:

```text
Emergency Fund

Target:
₹5,00,000
```

This represents the final objective.

---

# 28. Goal Saved Amount

The saved amount represents the amount the user currently wants to protect.

Example:

```text
Target:
₹5,00,000

Currently protected:
₹1,50,000
```

The protected amount is controlled by the user.

It does not automatically increase whenever the account balance increases.

---

# 29. Goal Account Monitoring

A goal can be linked to a financial account.

Example:

```text
Emergency Fund
        ↓
Savings Account

Protected amount:
₹1,50,000
```

If the account balance is:

```text
₹1,70,000
```

everything is fine.

If the balance falls to:

```text
₹1,40,000
```

Ledgr detects that the protected amount has been breached.

---

# 30. Goal Protection Alerts

The important rule is:

```text
Alert when account balance < saved/protected amount
```

Not:

```text
Alert when account balance < target amount
```

Example:

```text
Target = ₹5,00,000
Protected = ₹1,50,000
Account = ₹1,40,000
```

Result:

> Your protected savings amount has fallen below ₹1,50,000.

The alert is based on the amount the user currently wants to protect.

---

# 31. Goal Contributions

Users can maintain a contribution history.

Example:

```text
Jan 10    +₹20,000
Feb 15    +₹15,000
Mar 20    +₹25,000
```

This provides a history of how the user has built their goal.

Contributions are historical goal records and do not replace the actual account transactions.

---

# 32. Recurring Transactions

Recurring transactions represent financial activity that happens repeatedly.

Examples:

- Rent
- Salary
- Netflix
- Insurance
- EMI
- Internet
- Subscriptions

Users define:

```text
Amount
Frequency
Start date
Category
Account
Transaction type
```

Ledgr can then show upcoming occurrences.

---

# 33. Recurring Reminders

Before a recurring transaction occurs, Ledgr can notify the user.

Example:

> Rent of ₹20,000 is expected tomorrow.

Users can then:

- Confirm it
- Modify it
- Skip it
- Record it

---

# 34. Financial Calendar

The financial calendar brings future financial events together.

It can display:

- Upcoming recurring payments
- Expected income
- Budget periods
- Debt settlements
- Goal deadlines
- Other financial events

Example:

```text
September 25
Salary

September 28
Rent

September 30
Credit Card Payment
```

---

# 35. Investments

Ledgr can also track investments.

Users can manage:

- Investment accounts
- Holdings
- Assets
- Quantity
- Purchase value
- Current value
- Contributions
- Returns

Examples:

- Stocks
- ETFs
- Mutual funds
- Bonds
- Gold
- Crypto
- Other investments

Investment value can contribute to the user's overall net worth.

---

# 36. Net Worth

Net worth provides a high-level view of financial position.

Conceptually:

```text
Assets
-
Liabilities
=
Net Worth
```

Assets can include:

- Cash
- Bank accounts
- Investments
- Other tracked assets

Liabilities can include:

- Credit card balances
- Debts
- Other tracked obligations

Ledgr can display net worth over time.

---

# 37. Spending Analytics

Spending analytics help users understand where their money goes.

Users can see:

- Total spending
- Spending by category
- Spending by merchant
- Spending over time
- Largest expenses
- Category trends
- Period comparisons

Example:

```text
Food        ₹15,000
Transport    ₹8,000
Shopping     ₹6,500
Bills        ₹5,000
```

---

# 38. Income Analytics

Income analytics show:

- Total income
- Income by source
- Income trends
- Monthly income
- Income comparisons

Example:

```text
Salary       ₹80,000
Freelance    ₹15,000
Other         ₹5,000
```

---

# 39. Cash Flow

Cash flow explains how money moves during a period.

Example:

```text
Income       ₹1,00,000
Expenses      ₹70,000
---------------------
Net Cash Flow ₹30,000
```

Users can view cash flow:

- Daily
- Weekly
- Monthly
- Yearly
- Custom periods

---

# 40. Forecasting

Ledgr can estimate future financial activity using:

- Historical transactions
- Recurring transactions
- Existing obligations
- Expected income
- Spending patterns

Example:

```text
Expected income:
₹1,00,000

Expected expenses:
₹72,000

Projected cash flow:
₹28,000
```

Forecasted values should always be clearly distinguished from actual financial data.

---

# 41. Merchant Analytics

Ledgr can identify spending patterns by merchant.

Example:

```text
Swiggy
12 transactions
₹4,500

Amazon
8 transactions
₹9,200
```

This helps users understand repeated spending.

---

# 42. Spending Anomalies

Ledgr can identify unusual financial activity.

Example:

```text
Your Shopping spending this month
is significantly higher than your recent average.
```

Anomaly detection should be based on actual transaction history.

---

# 43. Import

Users can import existing financial data.

Typical workflow:

```text
Upload
 ↓
Map columns
 ↓
Preview
 ↓
Review
 ↓
Import
```

Supported formats can include CSV and supported bank exports.

Ledgr should identify possible duplicate transactions before importing.

---

# 44. Search

Global search allows users to quickly find financial information.

Users can search:

- Transactions
- Accounts
- Categories
- Merchants
- Friends
- Spaces
- Budgets
- Goals
- Debts
- Recurring transactions

Search results should only contain information the user is allowed to access.

---

# 45. Notifications

Ledgr can notify users about important financial events.

Examples:

### Budgets

> You've reached 80% of your Food budget.

### Goals

> Your protected savings amount has been breached.

### Debts

> Rahul still owes you ₹1,200.

### Recurring

> Your rent payment is due tomorrow.

### Imports

> Your transaction import is complete.

---

# 46. AI Insights

AI analyzes the user's financial information and turns it into understandable insights.

Examples:

> Your restaurant spending increased compared with last month.

> Your recurring expenses account for a significant portion of your monthly spending.

> Your cash flow is expected to decrease next month because of upcoming recurring expenses.

AI should explain financial information rather than replace the underlying financial records.

---

# 47. Ask AI

Ask AI allows users to ask questions about their finances in natural language.

Examples:

> How much did I spend on food last month?

> Who owes me money?

> How much do I owe Rahul?

> What were my biggest expenses this year?

> How much did I spend on subscriptions?

> How has my net worth changed?

> What recurring payments are coming this week?

The answers should be based on the user's accessible financial data.

---

# 48. Financial Insights

The Insights section brings analytics together.

Primary views:

```text
Overview
Spending
Income
Cash Flow
Net Worth
Forecast
```

The user should be able to move from a high-level metric into the underlying transactions.

Example:

```text
Food spending increased 18%
        ↓
Click
        ↓
Food category breakdown
        ↓
Merchant breakdown
        ↓
Individual transactions
```

---

# 49. Personal vs Shared Finances

Ledgr keeps personal and shared finances conceptually separate.

Example:

```text
Personal
 ├── Salary
 ├── Personal shopping
 └── Personal savings

Couple
 ├── Rent
 ├── Groceries
 └── Vacation

Goa Trip
 ├── Hotel
 ├── Food
 └── Taxi
```

This prevents temporary shared expenses from polluting the user's personal financial context.

---

# 50. Access and Privacy

Users should always know who can access shared financial information.

A person being:

```text
Friend
```

does not automatically mean:

```text
Can view my finances
```

Financial access comes from being part of the relevant shared space or having explicit permission.

---

# 51. Activity History

Important financial actions should remain understandable over time.

Users should be able to trace:

```text
Transaction
 ↓
Split
 ↓
Debt
 ↓
Settlement
```

For example:

```text
₹3,000 Dinner
        ↓
Split between 3 people
        ↓
Rahul owes ₹1,000
        ↓
Rahul pays ₹1,000
        ↓
Debt settled
```

---

# 52. Mobile Experience

The mobile experience focuses on the most common actions.

Primary navigation:

```text
Home
Money
+
Insights
More
```

The central `+` action provides quick access to:

```text
Expense
Income
Transfer
Split Expense
Debt Payment
```

The goal is to make recording financial activity extremely fast.

---

# 53. Overall Product Structure

The product can be understood as five major areas:

```text
MONEY
Transactions
Accounts
Budgets
Goals
Investments

INSIGHTS
Spending
Income
Cash Flow
Net Worth
Forecast

TOGETHER
Spaces
Friends
Bill Splits
Debts
Settlements

TOOLS
Recurring
Import
Calendar
Notifications

INTELLIGENCE
AI Insights
Ask AI
Anomaly Detection
Forecasting
```

---

# 54. How Everything Connects

The core Ledgr experience works like this:

```text
Record a transaction
        ↓
Categorize it
        ↓
Associate it with an account if applicable
        ↓
Use it in budgets and analytics
        ↓
If shared, split it
        ↓
Create resulting obligations
        ↓
Track debts
        ↓
Settle debts
        ↓
Update financial picture
        ↓
Use the information for insights
```

This means the user does not have to maintain the same financial information in multiple places.

---

# 55. Example — Complete Real-World Flow

JD goes to dinner with Rahul.

Dinner costs:

```text
₹2,000
```

JD pays the entire bill.

He records:

```text
Expense
₹2,000
Restaurant
Food
Paid by JD
```

He splits it:

```text
JD       ₹1,000
Rahul    ₹1,000
```

Ledgr records the actual expense once.

It then determines:

```text
Rahul owes JD ₹1,000
```

Later Rahul also pays for a taxi:

```text
₹600
```

JD's share:

```text
₹300
```

Now:

```text
Rahul owes JD ₹1,000
JD owes Rahul ₹300
```

Ledgr calculates:

```text
Net:
Rahul owes JD ₹700
```

JD selects:

```text
Settle up
```

Rahul pays ₹700.

Result:

```text
Net balance = ₹0
```

The dinner, taxi, debt, and settlement history all remain available.

---

# 56. Example — Personal Budget + Goal

JD receives:

```text
Salary = ₹1,00,000
```

He spends:

```text
Food = ₹12,000
Transport = ₹6,000
Bills = ₹15,000
```

He has:

```text
Food budget = ₹15,000
```

Ledgr shows:

```text
₹12,000 / ₹15,000
80%
```

JD also has:

```text
Emergency Fund

Target = ₹5,00,000
Protected = ₹1,50,000
```

His savings account currently contains:

```text
₹1,70,000
```

No alert is generated.

If he later spends ₹30,000 from that account:

```text
Balance = ₹1,40,000
```

Ledgr detects:

```text
Balance < Protected Amount
```

and alerts him.

---

# 57. Core Product Model

The entire product can be summarized as:

```text
                    LEDGR
                      │
        ┌─────────────┼─────────────┐
        │             │             │
      MONEY        TOGETHER       INSIGHTS
        │             │             │
   Transactions      Friends      Spending
   Accounts          Spaces       Income
   Budgets           Splits       Cash Flow
   Goals             Debts        Net Worth
   Investments       Settlements   Forecast
        │             │             │
        └─────────────┼─────────────┘
                      │
                   TOOLS
                      │
            Recurring / Import
             Calendar / Alerts
                      │
                      ↓
                 INTELLIGENCE
                      │
                 AI Insights
                  Ask AI
```

---

# 58. Product Philosophy

Ledgr should make financial management feel like one connected system instead of a collection of disconnected features.

The user records reality:

```text
"I spent ₹2,000."
```

Ledgr can then understand:

```text
Transaction
Category
Account movement
Budget impact
Spending analytics
Cash flow
Shared expense
Debt
Settlement
Financial insights
```

The user should not need to manually maintain each of these separately.

**The fundamental product principle is:**

> **Record reality once. Derive everything else from it.**
