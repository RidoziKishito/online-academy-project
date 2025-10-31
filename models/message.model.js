import db from '../utils/db.js';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const Message = {
    // Add a message to a conversation
    async addMessage(conversationId, senderId, content, messageType = 'text') {
        const trx = await db.transaction();
        
        try {
            // Validate inputs
            if (!conversationId || !senderId || !content) {
                throw new Error('Missing required parameters');
            }

            const messageId = uuidv4();
            const timestamp = new Date().toISOString();
            
            // Validate timestamp is not in the future
            if (new Date(timestamp) > new Date()) {
                throw new Error('Message timestamp cannot be in the future');
            }
            
            const newMessage = {
                id: messageId,
                sender_id: senderId,
                content: content,
                message_type: messageType,
                timestamp: timestamp
            };

            // Get existing messages
            const existingStorage = await trx('message_storage')
                .where('conversation_id', conversationId)
                .first();

            if (existingStorage) {
                // Update existing message storage
                const messages = existingStorage.messages || [];
                messages.push(newMessage);
                
                await trx('message_storage')
                    .where('conversation_id', conversationId)
                    .update({
                        messages: JSON.stringify(messages),
                        updated_at: new Date()
                    });
            } else {
                // Create new message storage
                await trx('message_storage')
                    .insert({
                        conversation_id: conversationId,
                        messages: JSON.stringify([newMessage])
                    });
            }

            await trx.commit();
            return newMessage;
        } catch (error) {
            await trx.rollback();
            logger.error({ err: error, conversationId, senderId }, 'Error adding message');
            throw error;
        }
    },

    // Get messages for a conversation with pagination
    async getMessages(conversationId, page = 1, limit = 50) {
        const offset = (page - 1) * limit;
        
        const messageStorage = await db('message_storage')
            .where('conversation_id', conversationId)
            .first();

        if (!messageStorage || !messageStorage.messages) {
            return {
                messages: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    totalPages: 0
                }
            };
        }

        const messages = messageStorage.messages;
        const totalMessages = messages.length;
        
        // For "load older messages", we need to get messages from the end of the array
        // Page 1: newest messages (last N messages in chronological order)
        // Page 2+: older messages (previous N messages going backwards)
        let paginatedMessages;
        
        if (page === 1) {
            // First page: get the most recent messages
            const startIndex = Math.max(0, totalMessages - limit);
            paginatedMessages = messages.slice(startIndex);
        } else {
            // Subsequent pages: get older messages going backwards
            const startIndex = Math.max(0, totalMessages - (page * limit));
            const endIndex = totalMessages - ((page - 1) * limit);
            paginatedMessages = messages.slice(startIndex, endIndex);
        }

        return {
            messages: paginatedMessages,
            pagination: {
                page,
                limit,
                total: totalMessages,
                totalPages: Math.ceil(totalMessages / limit)
            }
        };
    },

    // Get all messages for a conversation (for real-time updates)
    async getAllMessages(conversationId) {
        const messageStorage = await db('message_storage')
            .where('conversation_id', conversationId)
            .first();

        if (!messageStorage || !messageStorage.messages) {
            return [];
        }

        // Return messages in chronological order (oldest first)
        return messageStorage.messages;
    },

    // Get recent messages for multiple conversations
    async getRecentMessages(conversationIds, limit = 10) {
        const messageStorages = await db('message_storage')
            .whereIn('conversation_id', conversationIds)
            .select('conversation_id', 'messages');

        const recentMessages = {};
        
        messageStorages.forEach(storage => {
            if (storage.messages && storage.messages.length > 0) {
                // Get the last message
                const lastMessage = storage.messages[storage.messages.length - 1];
                recentMessages[storage.conversation_id] = lastMessage;
            }
        });

        return recentMessages;
    },

    // Search messages in a conversation
    async searchMessages(conversationId, searchTerm) {
        const messageStorage = await db('message_storage')
            .where('conversation_id', conversationId)
            .first();

        if (!messageStorage || !messageStorage.messages) {
            return [];
        }

        // Use JSONB query to search in message content
        const results = await db('message_storage')
            .where('conversation_id', conversationId)
            .whereRaw("messages::text ILIKE ?", [`%${searchTerm}%`])
            .first();

        if (!results || !results.messages) {
            return [];
        }

        // Filter messages that contain the search term
        const filteredMessages = results.messages.filter(message => 
            message.content.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return filteredMessages;
    },

    // Delete a message (soft delete by removing from JSONB array)
    async deleteMessage(conversationId, messageId) {
        const messageStorage = await db('message_storage')
            .where('conversation_id', conversationId)
            .first();

        if (!messageStorage || !messageStorage.messages) {
            return false;
        }

        const messages = messageStorage.messages;
        const filteredMessages = messages.filter(msg => msg.id !== messageId);

        if (filteredMessages.length === messages.length) {
            return false; // Message not found
        }

        await db('message_storage')
            .where('conversation_id', conversationId)
            .update({
                messages: JSON.stringify(filteredMessages),
                updated_at: new Date()
            });

        return true;
    },

    // Get message count for a conversation
    async getMessageCount(conversationId) {
        const messageStorage = await db('message_storage')
            .where('conversation_id', conversationId)
            .first();

        if (!messageStorage || !messageStorage.messages) {
            return 0;
        }

        return messageStorage.messages.length;
    }
};

export default Message;
