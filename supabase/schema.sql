-- Initial Schema for ZONABET
-- Target: Supabase (PostgreSQL)

-- 1. Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  role TEXT DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BLOCKED')),
  balance DECIMAL(12, 2) DEFAULT 0.00,
  referral_code TEXT UNIQUE,
  referred_by TEXT REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Matches
CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  competition_id TEXT,
  competition_name TEXT NOT NULL,
  competition_category TEXT,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'PRE_MATCH' CHECK (status IN ('PRE_MATCH', 'LIVE', 'FINISHED', 'CANCELLED')),
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  result TEXT,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Markets
CREATE TABLE IF NOT EXISTS markets (
  id TEXT PRIMARY KEY,
  match_id TEXT REFERENCES matches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'SUSPENDED', 'CLOSED')),
  max_exposure DECIMAL(12, 2),
  max_stake DECIMAL(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Selections (Odds)
CREATE TABLE IF NOT EXISTS selections (
  id TEXT PRIMARY KEY,
  market_id TEXT REFERENCES markets(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL,
  label TEXT NOT NULL,
  odds DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'SETTLED')),
  result TEXT CHECK (result IN ('WIN', 'LOSS', 'VOID', 'PENDING')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Bets
CREATE TABLE IF NOT EXISTS bets (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  total_stake DECIMAL(12, 2) NOT NULL,
  total_odds DECIMAL(10, 2) NOT NULL,
  potential_return DECIMAL(12, 2) NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'WON', 'LOST', 'VOID', 'CANCELLED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Bet Items (Multiple selections per bet)
CREATE TABLE IF NOT EXISTS bet_items (
  id TEXT PRIMARY KEY,
  bet_id TEXT REFERENCES bets(id) ON DELETE CASCADE,
  match_id TEXT REFERENCES matches(id),
  market_id TEXT REFERENCES markets(id),
  selection_id TEXT REFERENCES selections(id),
  odds_at_bet_time DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'WON', 'LOST', 'VOID')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('DEPOSIT', 'WITHDRAWAL', 'BET_PLACEMENT', 'BET_WIN', 'REFUND', 'MANUAL_ADJUSTMENT')),
  amount DECIMAL(12, 2) NOT NULL,
  prev_balance DECIMAL(12, 2) NOT NULL,
  next_balance DECIMAL(12, 2) NOT NULL,
  description TEXT,
  admin_id TEXT REFERENCES profiles(id),
  reference_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  amount DECIMAL(12, 2) NOT NULL,
  fee DECIMAL(12, 2) DEFAULT 0.00,
  net_amount DECIMAL(12, 2) DEFAULT 0.00,
  method TEXT NOT NULL,
  account_number TEXT NOT NULL DEFAULT '',
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED')),
  admin_id TEXT REFERENCES profiles(id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. System Settings
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY, -- e.g., 'default'
  config JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT,
  admin_email TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Permissive policies for ZONABET API backend & public read
CREATE POLICY "Public read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Public read markets" ON markets FOR SELECT USING (true);
CREATE POLICY "Public read selections" ON selections FOR SELECT USING (true);
CREATE POLICY "Public read system_settings" ON system_settings FOR SELECT USING (true);

CREATE POLICY "Service and API full access profiles" ON profiles FOR ALL USING (true);
CREATE POLICY "Service and API full access matches" ON matches FOR ALL USING (true);
CREATE POLICY "Service and API full access markets" ON markets FOR ALL USING (true);
CREATE POLICY "Service and API full access selections" ON selections FOR ALL USING (true);
CREATE POLICY "Service and API full access bets" ON bets FOR ALL USING (true);
CREATE POLICY "Service and API full access bet_items" ON bet_items FOR ALL USING (true);
CREATE POLICY "Service and API full access transactions" ON transactions FOR ALL USING (true);
CREATE POLICY "Service and API full access withdrawals" ON withdrawals FOR ALL USING (true);
CREATE POLICY "Service and API full access system_settings" ON system_settings FOR ALL USING (true);
CREATE POLICY "Service and API full access audit_logs" ON audit_logs FOR ALL USING (true);
