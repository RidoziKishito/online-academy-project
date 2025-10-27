// Chat System Configuration
export const CHAT_CONFIG = {
    // Polling configuration
    POLLING_INTERVAL: process.env.CHAT_POLLING_INTERVAL || 2000, // 2 seconds
    
    // Message limits
    MAX_MESSAGE_LENGTH: process.env.MAX_MESSAGE_LENGTH || 1000,
    MAX_MESSAGES_PER_PAGE: process.env.MAX_MESSAGES_PER_PAGE || 50,
    
    // Rate limiting
    RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS || 60000, // 1 minute
    RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
    RATE_LIMIT_MAX_MESSAGES: process.env.RATE_LIMIT_MAX_MESSAGES || 30,
    
    // Message types
    ALLOWED_MESSAGE_TYPES: ['text', 'emoji'],
    
    // UI configuration
    SCROLL_DELAY: 100, // milliseconds
    AUTO_SCROLL_ENABLED: true
};

export default CHAT_CONFIG;
