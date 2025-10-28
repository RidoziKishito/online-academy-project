import db from '../utils/db.js';

const Conversation = {
    // Create a new conversation between two users
    async create(user1Id, user2Id) {
        try {
            // Ensure user1_id is always smaller to avoid duplicate conversations
            const [smallerId, largerId] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];
            
            const [conversation] = await db('conversations')
                .insert({
                    user1_id: smallerId,
                    user2_id: largerId
                })
                .returning('*');
            
            return conversation;
        } catch (error) {
            // Handle unique constraint violation (conversation already exists)
            if (error.code === '23505') {
                return await this.findByUsers(user1Id, user2Id);
            }
            throw error;
        }
    },

    // Find conversation between two users
    async findByUsers(user1Id, user2Id) {
        const [smallerId, largerId] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];
        
        const conversation = await db('conversations')
            .where({
                user1_id: smallerId,
                user2_id: largerId
            })
            .first();
        
        return conversation;
    },

    // Get all conversations for a user
    async findByUserId(userId) {
        const conversations = await db('conversations')
            .where('user1_id', userId)
            .orWhere('user2_id', userId)
            .orderBy('updated_at', 'desc');
        
        return conversations;
    },

    // Get conversation with user details
    async findWithUserDetails(userId) {
        const conversations = await db('conversations')
            .leftJoin('users as user1', 'conversations.user1_id', 'user1.user_id')
            .leftJoin('users as user2', 'conversations.user2_id', 'user2.user_id')
            .select(
                'conversations.*',
                'user1.full_name as user1_name',
                'user1.email as user1_email',
                'user1.avatar_url as user1_avatar',
                'user2.full_name as user2_name',
                'user2.email as user2_email',
                'user2.avatar_url as user2_avatar'
            )
            .where('conversations.user1_id', userId)
            .orWhere('conversations.user2_id', userId)
            .orderBy('conversations.updated_at', 'desc');
        
        return conversations;
    },

    // Update conversation timestamp
    async updateTimestamp(conversationId) {
        await db('conversations')
            .where('id', conversationId)
            .update({
                updated_at: new Date()
            });
    },

    // Get conversation by ID
    async findById(conversationId) {
        const conversation = await db('conversations')
            .where('id', conversationId)
            .first();
        
        return conversation;
    },

    // Check if user is participant in conversation
    async isParticipant(conversationId, userId) {
        const conversation = await db('conversations')
            .where('id', conversationId)
            .where(function() {
                this.where('user1_id', userId).orWhere('user2_id', userId);
            })
            .first();
        
        return !!conversation;
    }
};

export default Conversation;
