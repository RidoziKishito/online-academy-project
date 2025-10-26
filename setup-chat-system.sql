-- =====================================================
-- Chat System Database Setup
-- =====================================================
-- This script sets up the complete chat system database
-- including tables, indexes, RLS policies, and sample data
-- =====================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CREATE TABLES
-- =====================================================

-- Conversations table (one-on-one only)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id INT NOT NULL,
    user2_id INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user1_id, user2_id),
    CONSTRAINT check_different_users CHECK (user1_id != user2_id)
);

-- Message storage as JSONB for efficient storage
CREATE TABLE IF NOT EXISTS message_storage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Indexes for conversations table
CREATE INDEX IF NOT EXISTS idx_conversations_user1_id ON conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2_id ON conversations(user2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- Indexes for message_storage table
CREATE INDEX IF NOT EXISTS idx_message_storage_conversation_id ON message_storage(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_storage_updated_at ON message_storage(updated_at DESC);

-- JSONB indexes for efficient message queries
CREATE INDEX IF NOT EXISTS idx_message_storage_messages_gin ON message_storage USING GIN (messages);
CREATE INDEX IF NOT EXISTS idx_message_storage_messages_content ON message_storage USING GIN ((messages->>'content'));

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on both tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_storage ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. CREATE RLS POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON message_storage;
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON message_storage;
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON message_storage;

-- RLS Policies for conversations table
CREATE POLICY "Users can view their own conversations" ON conversations
    FOR SELECT USING (
        user1_id = (SELECT user_id FROM users WHERE email = auth.jwt() ->> 'email') 
        OR user2_id = (SELECT user_id FROM users WHERE email = auth.jwt() ->> 'email')
    );

CREATE POLICY "Users can create conversations" ON conversations
    FOR INSERT WITH CHECK (
        user1_id = (SELECT user_id FROM users WHERE email = auth.jwt() ->> 'email') 
        OR user2_id = (SELECT user_id FROM users WHERE email = auth.jwt() ->> 'email')
    );

CREATE POLICY "Users can update their conversations" ON conversations
    FOR UPDATE USING (
        user1_id = (SELECT user_id FROM users WHERE email = auth.jwt() ->> 'email') 
        OR user2_id = (SELECT user_id FROM users WHERE email = auth.jwt() ->> 'email')
    );

-- RLS Policies for message_storage table
CREATE POLICY "Users can view messages in their conversations" ON message_storage
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE user1_id = (SELECT user_id FROM users WHERE email = auth.jwt() ->> 'email')
               OR user2_id = (SELECT user_id FROM users WHERE email = auth.jwt() ->> 'email')
        )
    );

CREATE POLICY "Users can insert messages in their conversations" ON message_storage
    FOR INSERT WITH CHECK (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE user1_id = (SELECT user_id FROM users WHERE email = auth.jwt() ->> 'email')
               OR user2_id = (SELECT user_id FROM users WHERE email = auth.jwt() ->> 'email')
        )
    );

CREATE POLICY "Users can update messages in their conversations" ON message_storage
    FOR UPDATE USING (
        conversation_id IN (
            SELECT id FROM conversations 
            WHERE user1_id = (SELECT user_id FROM users WHERE email = auth.jwt() ->> 'email')
               OR user2_id = (SELECT user_id FROM users WHERE email = auth.jwt() ->> 'email')
        )
    );

-- =====================================================
-- 5. CREATE FUNCTIONS FOR AUTOMATIC UPDATES
-- =====================================================

-- Function to update conversation timestamp when messages are added
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the conversation's last_message_at timestamp
    UPDATE conversations 
    SET 
        last_message_at = NOW(),
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update conversation timestamp
DROP TRIGGER IF EXISTS trigger_update_conversation_timestamp ON message_storage;
CREATE TRIGGER trigger_update_conversation_timestamp
    AFTER UPDATE ON message_storage
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_timestamp();

-- =====================================================
-- 6. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get conversation between two users
CREATE OR REPLACE FUNCTION get_conversation_between_users(user1_id_param INT, user2_id_param INT)
RETURNS TABLE (
    id UUID,
    user1_id INT,
    user2_id INT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    last_message_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.user1_id,
        c.user2_id,
        c.created_at,
        c.updated_at,
        c.last_message_at
    FROM conversations c
    WHERE (c.user1_id = user1_id_param AND c.user2_id = user2_id_param)
       OR (c.user1_id = user2_id_param AND c.user2_id = user1_id_param)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get message count for a conversation
CREATE OR REPLACE FUNCTION get_message_count(conversation_id_param UUID)
RETURNS INT AS $$
DECLARE
    message_count INT;
BEGIN
    SELECT jsonb_array_length(messages) INTO message_count
    FROM message_storage
    WHERE conversation_id = conversation_id_param;
    
    RETURN COALESCE(message_count, 0);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. CREATE SAMPLE DATA (OPTIONAL)
-- =====================================================

-- Insert sample conversations (uncomment if you want sample data)
/*
-- Get some sample users (adjust user IDs based on your actual users)
DO $$
DECLARE
    user1_id INT;
    user2_id INT;
    user3_id INT;
    conv_id UUID;
BEGIN
    -- Get first 3 users from your users table
    SELECT user_id INTO user1_id FROM users LIMIT 1 OFFSET 0;
    SELECT user_id INTO user2_id FROM users LIMIT 1 OFFSET 1;
    SELECT user_id INTO user3_id FROM users LIMIT 1 OFFSET 2;
    
    -- Only create sample data if we have at least 3 users
    IF user1_id IS NOT NULL AND user2_id IS NOT NULL AND user3_id IS NOT NULL THEN
        -- Create conversation between user1 and user2
        INSERT INTO conversations (user1_id, user2_id) 
        VALUES (user1_id, user2_id) 
        ON CONFLICT (user1_id, user2_id) DO NOTHING
        RETURNING id INTO conv_id;
        
        -- Add sample messages if conversation was created
        IF conv_id IS NOT NULL THEN
            INSERT INTO message_storage (conversation_id, messages) VALUES (
                conv_id,
                '[
                    {
                        "id": "msg_001",
                        "sender_id": ' || user1_id || ',
                        "content": "Hello! How can I help you with your studies?",
                        "message_type": "text",
                        "timestamp": "' || NOW() - INTERVAL '1 hour' || '"
                    },
                    {
                        "id": "msg_002", 
                        "sender_id": ' || user2_id || ',
                        "content": "Hi! I have a question about the assignment 😊",
                        "message_type": "text",
                        "timestamp": "' || NOW() - INTERVAL '30 minutes' || '"
                    }
                ]'::jsonb
            );
        END IF;
        
        -- Create conversation between user1 and user3
        INSERT INTO conversations (user1_id, user2_id) 
        VALUES (user1_id, user3_id) 
        ON CONFLICT (user1_id, user2_id) DO NOTHING
        RETURNING id INTO conv_id;
        
        -- Add sample messages if conversation was created
        IF conv_id IS NOT NULL THEN
            INSERT INTO message_storage (conversation_id, messages) VALUES (
                conv_id,
                '[
                    {
                        "id": "msg_003",
                        "sender_id": ' || user1_id || ',
                        "content": "Welcome to the course! Feel free to ask any questions.",
                        "message_type": "text",
                        "timestamp": "' || NOW() - INTERVAL '2 hours' || '"
                    }
                ]'::jsonb
            );
        END IF;
    END IF;
END $$;
*/

-- =====================================================
-- 8. CREATE VIEWS FOR EASY QUERYING
-- =====================================================

-- View for conversations with user details
CREATE OR REPLACE VIEW conversation_details AS
SELECT 
    c.id as conversation_id,
    c.user1_id,
    c.user2_id,
    u1.full_name as user1_name,
    u1.email as user1_email,
    u2.full_name as user2_name,
    u2.email as user2_email,
    c.created_at,
    c.updated_at,
    c.last_message_at,
    get_message_count(c.id) as message_count
FROM conversations c
LEFT JOIN users u1 ON c.user1_id = u1.user_id
LEFT JOIN users u2 ON c.user2_id = u2.user_id;

-- View for recent messages with user details
CREATE OR REPLACE VIEW recent_messages AS
SELECT 
    c.id as conversation_id,
    c.user1_id,
    c.user2_id,
    u1.full_name as user1_name,
    u2.full_name as user2_name,
    ms.messages,
    ms.updated_at as last_message_time
FROM conversations c
LEFT JOIN message_storage ms ON c.id = ms.conversation_id
LEFT JOIN users u1 ON c.user1_id = u1.user_id
LEFT JOIN users u2 ON c.user2_id = u2.user_id
WHERE ms.messages IS NOT NULL AND jsonb_array_length(ms.messages) > 0;

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions to your application user
-- (Adjust the username based on your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON message_storage TO your_app_user;
-- GRANT USAGE ON SCHEMA public TO your_app_user;

-- =====================================================
-- 10. VERIFICATION QUERIES
-- =====================================================

-- Verify tables were created
SELECT 
    table_name, 
    table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('conversations', 'message_storage')
ORDER BY table_name;

-- Verify indexes were created
SELECT 
    indexname, 
    tablename, 
    indexdef 
FROM pg_indexes 
WHERE tablename IN ('conversations', 'message_storage')
ORDER BY tablename, indexname;

-- Verify RLS policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename IN ('conversations', 'message_storage')
ORDER BY tablename, policyname;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Chat System Database Setup Complete!';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Tables created: conversations, message_storage';
    RAISE NOTICE 'Indexes created: Performance optimized';
    RAISE NOTICE 'RLS policies: Security enabled';
    RAISE NOTICE 'Functions created: Helper functions available';
    RAISE NOTICE 'Views created: conversation_details, recent_messages';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test the chat system';
    RAISE NOTICE '2. Verify RLS policies work correctly';
    RAISE NOTICE '3. Check performance with sample data';
    RAISE NOTICE '=====================================================';
END $$;
