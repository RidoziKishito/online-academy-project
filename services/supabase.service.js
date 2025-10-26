import { supabase, supabaseAdmin, isSupabaseConfigured } from '../utils/supabase.client.js';

const SupabaseService = {
    // Subscribe to conversation messages
    subscribeToMessages(conversationId, callback) {
        if (!isSupabaseConfigured) {
            console.warn('Supabase not configured. Real-time features disabled.');
            return null;
        }

        return supabase
            .channel(`conversation:${conversationId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'message_storage',
                filter: `conversation_id=eq.${conversationId}`
            }, callback)
            .subscribe();
    },

    // Subscribe to user's conversations
    subscribeToUserConversations(userId, callback) {
        if (!isSupabaseConfigured) {
            console.warn('Supabase not configured. Real-time features disabled.');
            return null;
        }

        return supabase
            .channel(`user:${userId}:conversations`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'conversations',
                filter: `user1_id=eq.${userId},user2_id=eq.${userId}`
            }, callback)
            .subscribe();
    },

    // Unsubscribe from a channel
    unsubscribe(subscription) {
        if (subscription) {
            supabase.removeChannel(subscription);
        }
    },

    // Get real-time connection status
    getConnectionStatus() {
        if (!isSupabaseConfigured) {
            return { connected: false, reason: 'Supabase not configured' };
        }

        return {
            connected: supabase.realtime.isConnected(),
            reason: supabase.realtime.isConnected() ? 'Connected' : 'Disconnected'
        };
    },

    // Send real-time message (for testing)
    async sendRealtimeMessage(conversationId, message) {
        if (!isSupabaseConfigured) {
            console.warn('Supabase not configured. Cannot send real-time message.');
            return false;
        }

        try {
            const { error } = await supabase
                .from('message_storage')
                .update({ messages: message })
                .eq('conversation_id', conversationId);

            if (error) {
                console.error('Error sending real-time message:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error sending real-time message:', error);
            return false;
        }
    },

    // Get user's JWT token for RLS
    async getUserToken(userId) {
        if (!isSupabaseConfigured) {
            return null;
        }

        try {
            // This would typically be done during login
            // For now, we'll return null and handle auth differently
            return null;
        } catch (error) {
            console.error('Error getting user token:', error);
            return null;
        }
    }
};

export default SupabaseService;
