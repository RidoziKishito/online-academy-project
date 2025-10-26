import express from 'express';
import ChatService from '../services/chat.service.js';
import { restrict } from '../middlewares/auth.mdw.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Utility function for consistent error responses
const sendErrorResponse = (res, statusCode, message, error = null, req = null) => {
    res.status(statusCode).json({
        success: false,
        message: message,
        error: (req && (req.hostname === 'localhost' || req.hostname === '127.0.0.1')) && error ? error.message : 'Internal server error'
    });
};

// Get user's conversations
router.get('/conversations', restrict, async (req, res) => {
    try {
        const userId = req.session.authUser.user_id;
        const conversations = await ChatService.getUserConversations(userId);
        
        res.json({
            success: true,
            data: conversations
        });
    } catch (error) {
        console.error('Error getting conversations:', error);
        sendErrorResponse(res, 500, 'Failed to get conversations', error, req);
    }
});

// Get or create conversation between two users
router.post('/conversations', restrict, async (req, res) => {
    try {
        const { otherUserId } = req.body;
        const currentUserId = req.session.authUser.user_id;

        // Input validation
        if (!otherUserId || typeof otherUserId !== 'string' && typeof otherUserId !== 'number') {
            return res.status(400).json({
                success: false,
                message: 'Valid other user ID is required'
            });
        }

        const otherUserIdNum = parseInt(otherUserId);
        if (isNaN(otherUserIdNum) || otherUserIdNum <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format'
            });
        }

        if (otherUserIdNum === currentUserId) {
            return res.status(400).json({
                success: false,
                message: 'Cannot create conversation with yourself'
            });
        }

        const conversation = await ChatService.getOrCreateConversation(currentUserId, otherUserIdNum);
        
        res.json({
            success: true,
            data: conversation
        });
    } catch (error) {
        console.error('Error creating conversation:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create conversation',
            error: error.message
        });
    }
});

// Get conversation details
router.get('/conversations/:id', restrict, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.authUser.user_id;

        const conversation = await ChatService.getConversationDetails(id, userId);
        
        res.json({
            success: true,
            data: conversation
        });
    } catch (error) {
        console.error('Error getting conversation details:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get conversation details',
            error: error.message
        });
    }
});

// Get conversation messages
router.get('/conversations/:id/messages', restrict, async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const userId = req.session.authUser.user_id;

        const result = await ChatService.getConversationMessages(id, userId, parseInt(page), parseInt(limit));
        
        res.json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('Error getting messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get messages',
            error: error.message
        });
    }
});

// Rate limiting for message sending
const messageRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 message requests per windowMs
    message: {
        success: false,
        message: 'Too many messages, please slow down'
    }
});

// Send a message
router.post('/conversations/:id/messages', restrict, messageRateLimit, async (req, res) => {
    try {
        const { id } = req.params;
        const { content, messageType = 'text' } = req.body;
        const senderId = req.session.authUser.user_id;

        // Input validation
        if (!content || typeof content !== 'string' || content.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Message content is required'
            });
        }

        // Sanitize and validate content
        const sanitizedContent = content.trim().substring(0, 1000); // Limit to 1000 characters
        if (sanitizedContent.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Message content cannot be empty after sanitization'
            });
        }

        // Validate message type
        const allowedTypes = ['text', 'emoji'];
        if (!allowedTypes.includes(messageType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid message type'
            });
        }

        // Validate conversation ID format
        if (!id || typeof id !== 'string' || id.length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Invalid conversation ID'
            });
        }

        const message = await ChatService.sendMessage(id, senderId, sanitizedContent, messageType);
        
        res.json({
            success: true,
            data: message
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message',
            error: error.message
        });
    }
});

// Search messages in conversation
router.get('/conversations/:id/search', restrict, async (req, res) => {
    try {
        const { id } = req.params;
        const { q } = req.query;
        const userId = req.session.authUser.user_id;

        if (!q || q.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        const messages = await ChatService.searchMessages(id, userId, q.trim());
        
        res.json({
            success: true,
            data: messages
        });
    } catch (error) {
        console.error('Error searching messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search messages',
            error: error.message
        });
    }
});

// Delete a message
router.delete('/conversations/:id/messages/:messageId', restrict, async (req, res) => {
    try {
        const { id, messageId } = req.params;
        const userId = req.session.authUser.user_id;

        const deleted = await ChatService.deleteMessage(id, messageId, userId);
        
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }

        res.json({
            success: true,
            message: 'Message deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete message',
            error: error.message
        });
    }
});

// Get students for a course (for instructor bulk messaging)
router.get('/students/:courseId', restrict, async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.session.authUser.user_id;

        // Check if user is instructor
        if (req.session.authUser.role !== 'instructor') {
            return res.status(403).json({
                success: false,
                message: 'Only instructors can access student lists'
            });
        }

        const students = await ChatService.getCourseStudents(courseId);
        
        res.json({
            success: true,
            data: students
        });
    } catch (error) {
        console.error('Error getting course students:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get course students',
            error: error.message
        });
    }
});

// Send bulk message to multiple students
router.post('/bulk-message', restrict, async (req, res) => {
    try {
        const { studentIds, content, messageType = 'text' } = req.body;
        const instructorId = req.session.authUser.user_id;

        // Check if user is instructor
        if (req.session.authUser.role !== 'instructor') {
            return res.status(403).json({
                success: false,
                message: 'Only instructors can send bulk messages'
            });
        }

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Student IDs array is required'
            });
        }

        if (!content || content.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Message content is required'
            });
        }

        const results = await ChatService.sendBulkMessage(instructorId, studentIds, content.trim(), messageType);
        
        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error sending bulk message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send bulk message',
            error: error.message
        });
    }
});

export default router;
