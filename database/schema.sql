CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    business_name VARCHAR(255),
    plan VARCHAR(20) DEFAULT 'pro',
    role VARCHAR(10) DEFAULT 'user',
    theme_preference VARCHAR(10) DEFAULT 'system',
    twilio_number VARCHAR(50),
    twilio_number_assigned BOOLEAN DEFAULT FALSE,
    setup_status VARCHAR(30) DEFAULT 'not_started',
    setup_completed_at TIMESTAMP,
    subscription_status VARCHAR(20) DEFAULT 'inactive',
    lemon_squeezy_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    service_type VARCHAR(255),
    address TEXT,
    preferred_date VARCHAR(50),
    preferred_time VARCHAR(50),
    urgency VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'new',
    source VARCHAR(50) DEFAULT 'missed_call',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lead_id UUID REFERENCES leads(id),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    client_name VARCHAR(255),
    client_phone VARCHAR(50),
    service_type VARCHAR(255),
    address TEXT,
    date VARCHAR(50),
    time VARCHAR(50),
    status VARCHAR(20) DEFAULT 'booked',
    notes TEXT,
    calendar_event_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) DEFAULT 'lemonsqueezy',
    provider_subscription_id VARCHAR(255),
    plan VARCHAR(20),
    status VARCHAR(20) DEFAULT 'active',
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    target_user_id UUID REFERENCES users(id),
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_messages_lead_id ON messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
CREATE INDEX IF NOT EXISTS idx_users_setup_status ON users(setup_status);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view own leads" ON leads
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own messages" ON messages
    FOR ALL USING (
        lead_id IN (SELECT id FROM leads WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can view own appointments" ON appointments
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own subscriptions" ON subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Seed admin user (run this after first signup to set yourself as admin)
-- UPDATE users SET role = 'admin' WHERE email = 'axcis.ai@gmail.com';
