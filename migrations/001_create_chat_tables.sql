-- Create conversations table (one-on-one only)
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id INT NOT NULL REFERENCES users(user_id),
    user2_id INT NOT NULL REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user1_id, user2_id)
);

-- Create message storage table with JSONB
CREATE TABLE message_storage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_conversations_user1_id ON conversations(user1_id);
CREATE INDEX idx_conversations_user2_id ON conversations(user2_id);
CREATE INDEX idx_message_storage_conversation_id ON message_storage(conversation_id);
CREATE INDEX idx_message_storage_created_at ON message_storage(created_at);

-- Create GIN index for JSONB queries
CREATE INDEX idx_message_storage_messages_gin ON message_storage USING GIN (messages);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_storage ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
CREATE POLICY "Users can view their own conversations" ON conversations
    FOR SELECT USING (
        user1_id = (SELECT user_id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email') 
        OR user2_id = (SELECT user_id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
    );

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (
        user1_id = (SELECT user_id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email') 
        OR user2_id = (SELECT user_id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
    );

-- RLS Policies for message_storage
CREATE POLICY "Users can view messages in their conversations" ON message_storage
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE user1_id = (SELECT user_id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
               OR user2_id = (SELECT user_id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
        )
    );

CREATE POLICY "Users can insert messages in their conversations" ON message_storage
    FOR INSERT WITH CHECK (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE user1_id = (SELECT user_id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
               OR user2_id = (SELECT user_id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
        )
    );

CREATE POLICY "Users can update messages in their conversations" ON message_storage
    FOR UPDATE USING (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE user1_id = (SELECT user_id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
               OR user2_id = (SELECT user_id FROM users WHERE email = current_setting('request.jwt.claims', true)::json->>'email')
        )
    );
