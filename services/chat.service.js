import Conversation from '../models/conversation.model.js';
import Message from '../models/message.model.js';
import db from '../utils/db.js';
import logger from '../utils/logger.js';

const ChatService = {
    // Get or create conversation between two users
    async getOrCreateConversation(user1Id, user2Id) {
        try {
            // Check if conversation already exists
            let conversation = await Conversation.findByUsers(user1Id, user2Id);
            
            if (!conversation) {
                // Create new conversation
                conversation = await Conversation.create(user1Id, user2Id);
            }
            
            return conversation;
        } catch (error) {
            logger.error({ err: error, user1Id, user2Id }, 'Error getting/creating conversation');
            throw error;
        }
    },

    // Send a message
    async sendMessage(conversationId, senderId, content, messageType = 'text') {
        try {
            // Verify user is participant in conversation
            const isParticipant = await Conversation.isParticipant(conversationId, senderId);
            if (!isParticipant) {
                throw new Error('User is not a participant in this conversation');
            }

            // Add message to storage
            const message = await Message.addMessage(conversationId, senderId, content, messageType);
            
            // Update conversation timestamp
            await Conversation.updateTimestamp(conversationId);
            
            return message;
        } catch (error) {
            logger.error({ err: error, conversationId, senderId }, 'Error sending message');
            throw error;
        }
    },

    // Get conversation messages with pagination
    async getConversationMessages(conversationId, userId, page = 1, limit = 50) {
        try {
            // Verify user is participant
            const isParticipant = await Conversation.isParticipant(conversationId, userId);
            if (!isParticipant) {
                throw new Error('User is not a participant in this conversation');
            }

            const result = await Message.getMessages(conversationId, page, limit);
            return result;
        } catch (error) {
            logger.error({ err: error, conversationId, userId }, 'Error getting conversation messages');
            throw error;
        }
    },

    // Get user's conversations with recent messages
    async getUserConversations(userId) {
        try {
            const conversations = await Conversation.findWithUserDetails(userId);
            
            if (conversations.length === 0) {
                return [];
            }

            const conversationIds = conversations.map(conv => conv.id);
            const recentMessages = await Message.getRecentMessages(conversationIds);

            // Add recent message to each conversation
            const conversationsWithMessages = conversations.map(conv => ({
                ...conv,
                recent_message: recentMessages[conv.id] || null,
                other_user: conv.user1_id === userId ? {
                    id: conv.user2_id,
                    name: conv.user2_name,
                    email: conv.user2_email,
                    avatar: conv.user2_avatar
                } : {
                    id: conv.user1_id,
                    name: conv.user1_name,
                    email: conv.user1_email,
                    avatar: conv.user1_avatar
                }
            }));

            return conversationsWithMessages;
        } catch (error) {
            logger.error({ err: error, userId }, 'Error getting user conversations');
            throw error;
        }
    },

    // Send bulk message to multiple students
    async sendBulkMessage(instructorId, studentIds, content, messageType = 'text') {
        try {
            const results = [];
            
            for (const studentId of studentIds) {
                try {
                    // Get or create conversation
                    const conversation = await this.getOrCreateConversation(instructorId, studentId);
                    
                    // Send message
                    const message = await this.sendMessage(conversation.id, instructorId, content, messageType);
                    
                    results.push({
                        studentId,
                        conversationId: conversation.id,
                        message,
                        success: true
                    });
                } catch (error) {
                    results.push({
                        studentId,
                        success: false,
                        error: error.message
                    });
                }
            }
            
            return results;
        } catch (error) {
            logger.error({ err: error, instructorId, count: Array.isArray(studentIds) ? studentIds.length : 0 }, 'Error sending bulk message');
            throw error;
        }
    },

    // Get students for a course (for instructor bulk messaging)
    async getCourseStudents(courseId) {
        try {
            const students = await db('enrollments')
                .join('users', 'enrollments.user_id', 'users.user_id')
                .where('enrollments.course_id', courseId)
                .select(
                    'users.user_id',
                    'users.full_name',
                    'users.email',
                    'users.avatar_url'
                );
            
            return students;
        } catch (error) {
            logger.error({ err: error, courseId }, 'Error getting course students');
            throw error;
        }
    },

    // Search messages in a conversation
    async searchMessages(conversationId, userId, searchTerm) {
        try {
            // Verify user is participant
            const isParticipant = await Conversation.isParticipant(conversationId, userId);
            if (!isParticipant) {
                throw new Error('User is not a participant in this conversation');
            }

            const messages = await Message.searchMessages(conversationId, searchTerm);
            return messages;
        } catch (error) {
            logger.error({ err: error, conversationId, userId, searchTerm }, 'Error searching messages');
            throw error;
        }
    },

    // Get conversation by ID with user details
    async getConversationDetails(conversationId, userId) {
        try {
            // Verify user is participant
            const isParticipant = await Conversation.isParticipant(conversationId, userId);
            if (!isParticipant) {
                throw new Error('User is not a participant in this conversation');
            }

            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                throw new Error('Conversation not found');
            }

            // Get other user details
            const otherUserId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;
            const otherUser = await db('users')
                .where('user_id', otherUserId)
                .select('user_id', 'full_name', 'email', 'avatar_url', 'role')
                .first();

            return {
                ...conversation,
                other_user: otherUser
            };
        } catch (error) {
            logger.error({ err: error, conversationId, userId }, 'Error getting conversation details');
            throw error;
        }
    },

    // Delete a message
    async deleteMessage(conversationId, messageId, userId) {
        try {
            // Verify user is participant
            const isParticipant = await Conversation.isParticipant(conversationId, userId);
            if (!isParticipant) {
                throw new Error('User is not a participant in this conversation');
            }

            const deleted = await Message.deleteMessage(conversationId, messageId);
            return deleted;
        } catch (error) {
            logger.error({ err: error, conversationId, messageId, userId }, 'Error deleting message');
            throw error;
        }
    }
};

export default ChatService;
