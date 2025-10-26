// Chat System JavaScript
class ChatSystem {
    constructor() {
        this.currentConversationId = null;
        this.currentUserId = null;
        this.isOpen = false;
        this.supabase = null;
        this.subscription = null;
        
        this.init();
    }

    init() {
        // Check if user is authenticated
        if (typeof window.authUser === 'undefined' || !window.authUser) {
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('User not authenticated, chat system disabled');
            }
            return;
        }

        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('Initializing chat system for user:', window.authUser);
        }
        this.currentUserId = window.authUser.user_id;
        this.setupChatButton();
        this.setupChatBox();
        this.initSupabase();
    }

    setupChatButton() {
        // Add chat button to navbar
        const navbar = document.querySelector('.navbar-nav');
        if (navbar && !document.querySelector('#chatButton')) {
            const chatButton = document.createElement('li');
            chatButton.className = 'nav-item';
            chatButton.innerHTML = `
                <button id="chatButton" class="btn btn-outline-primary btn-sm ms-2" type="button">
                    <i class="bi bi-chat-dots"></i> Chat
                </button>
            `;
            navbar.appendChild(chatButton);

            chatButton.addEventListener('click', () => {
                this.toggleChatBox();
            });
        }
    }

    setupChatBox() {
        // Create chat box HTML
        const chatBoxHTML = `
            <div id="chatBox" class="chat-box" style="display: none;">
                <div class="chat-header">
                    <h6 class="mb-0">Chat</h6>
                    <button id="closeChat" class="btn btn-sm btn-outline-secondary">
                        <i class="bi bi-x"></i>
                    </button>
                </div>
                <div class="chat-body">
                    <div id="conversationsList" class="conversations-list">
                        <div class="text-center text-muted py-3">
                            <i class="bi bi-chat-dots"></i>
                            <p class="mb-0">Select a conversation to start chatting</p>
                        </div>
                    </div>
                    <div id="chatMessages" class="chat-messages" style="display: none;">
                        <div class="messages-container"></div>
                        <div class="message-input-container">
                            <div class="input-group">
                                <input type="text" id="messageInput" class="form-control" placeholder="Type a message...">
                                <button id="emojiButton" class="btn btn-outline-secondary" type="button">
                                    <i class="bi bi-emoji-smile"></i>
                                </button>
                                <button id="sendButton" class="btn btn-primary" type="button">
                                    <i class="bi bi-send"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add chat box to body
        document.body.insertAdjacentHTML('beforeend', chatBoxHTML);

        // Add event listeners
        document.getElementById('closeChat').addEventListener('click', () => {
            this.closeChatBox();
        });

        document.getElementById('sendButton').addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Load conversations
        this.loadConversations();
    }

    initSupabase() {
        // Initialize Supabase if available
        if (typeof window.supabase !== 'undefined') {
            this.supabase = window.supabase;
        }
    }

    async loadConversations() {
        try {
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('Loading conversations...');
            }
            const response = await fetch('/api/chat/conversations');
            const data = await response.json();
            
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('Conversations response:', data);
            }

            if (data.success) {
                this.renderConversations(data.data);
            } else {
                console.error('Failed to load conversations:', data.message);
                this.showError('Failed to load conversations: ' + data.message);
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
            this.showError('Error loading conversations: ' + error.message);
        }
    }

    renderConversations(conversations) {
        const container = document.getElementById('conversationsList');
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('Rendering conversations:', conversations);
        }
        
        if (conversations.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="bi bi-chat-dots" style="font-size: 2rem; opacity: 0.5;"></i>
                    <p class="mb-2">No conversations yet</p>
                    <small>Start a conversation by clicking "Chat" with another user</small>
                </div>
            `;
            return;
        }

        container.innerHTML = conversations.map(conv => `
            <div class="conversation-item" data-conversation-id="${conv.id}" data-other-user-id="${conv.other_user.id}">
                <div class="d-flex align-items-center">
                    <div class="avatar me-2">
                        <i class="bi bi-person-circle"></i>
                    </div>
                    <div class="flex-grow-1">
                        <div class="fw-semibold">${conv.other_user.name}</div>
                        <div class="text-muted small">
                            ${conv.recent_message ? conv.recent_message.content.substring(0, 50) + '...' : 'No messages yet'}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

        // Add click listeners to conversation items
        container.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                const conversationId = item.dataset.conversationId;
                const otherUserId = item.dataset.otherUserId;
                this.openConversation(conversationId, otherUserId);
            });
        });
    }

    async openConversation(conversationId, otherUserId) {
        this.currentConversationId = conversationId;
        
        // Show messages container
        document.getElementById('conversationsList').style.display = 'none';
        document.getElementById('chatMessages').style.display = 'block';

        // Load messages
        await this.loadMessages(conversationId);

        // Subscribe to real-time updates
        this.subscribeToMessages(conversationId);
    }

    async loadMessages(conversationId) {
        try {
            const response = await fetch(`/api/chat/conversations/${conversationId}/messages`);
            const data = await response.json();

            if (data.success) {
                this.renderMessages(data.data.messages);
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    renderMessages(messages) {
        const container = document.querySelector('.messages-container');
        
        container.innerHTML = messages.map(message => `
            <div class="message ${message.sender_id == this.currentUserId ? 'message-sent' : 'message-received'}" data-message-id="${message.id}">
                <div class="message-content">
                    ${this.formatMessageContent(message.content)}
                </div>
                <div class="message-time">
                    ${new Date(message.timestamp).toLocaleTimeString()}
                </div>
            </div>
        `).join('');

        // Scroll to bottom to show newest messages
        const scrollDelay = window.CHAT_CONFIG?.SCROLL_DELAY || 100;
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('Scrolled to bottom. ScrollTop:', container.scrollTop, 'ScrollHeight:', container.scrollHeight);
            }
        }, scrollDelay);
    }

    formatMessageContent(content) {
        // Simple emoji support and basic formatting
        return content
            .replace(/\n/g, '<br>')
            .replace(/:\)/g, '😊')
            .replace(/:\(/g, '😢')
            .replace(/:D/g, '😄')
            .replace(/:P/g, '😛');
    }

    async sendMessage() {
        const input = document.getElementById('messageInput');
        const content = input.value.trim();

        if (!content || !this.currentConversationId) {
            return;
        }

        try {
            const response = await fetch(`/api/chat/conversations/${this.currentConversationId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: content,
                    messageType: 'text'
                })
            });

            const data = await response.json();

            if (data.success) {
                input.value = '';
                // Message will be added via real-time subscription
                // Force scroll to bottom after sending
                setTimeout(() => {
                    this.scrollToBottom();
                }, 200);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    subscribeToMessages(conversationId) {
        // Clear any existing polling
        if (this.messagePollingInterval) {
            clearInterval(this.messagePollingInterval);
        }

        // Smart polling - only poll when chat is open and page is visible
        const pollInterval = window.CHAT_CONFIG?.POLLING_INTERVAL || 2000; // 2 seconds
        this.messagePollingInterval = setInterval(() => {
            // Only poll if chat is open and page is visible
            if (this.isOpen && !document.hidden) {
                this.checkForNewMessages(conversationId);
            }
        }, pollInterval);

        // Pause polling when page becomes hidden
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.messagePollingInterval) {
                clearInterval(this.messagePollingInterval);
                this.messagePollingInterval = null;
            } else if (!document.hidden && this.isOpen && !this.messagePollingInterval) {
                this.subscribeToMessages(conversationId);
            }
        });

        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('Smart polling started for conversation:', conversationId);
        }
    }

    async checkForNewMessages(conversationId) {
        try {
            const response = await fetch(`/api/chat/conversations/${conversationId}/messages`);
            const data = await response.json();
            
            if (data.success && data.data.messages.length > 0) {
                // Get the last message (newest) since messages are now in chronological order
                const latestMessage = data.data.messages[data.data.messages.length - 1];
                const lastMessageId = this.getLastMessageId();
                
                // If we have a new message, reload all messages
                if (!lastMessageId || latestMessage.id !== lastMessageId) {
                    this.loadMessages(conversationId);
                    // Scroll to bottom after loading new messages
                    setTimeout(() => {
                        this.scrollToBottom();
                    }, 100);
                }
            }
        } catch (error) {
            console.error('Error checking for new messages:', error);
        }
    }

    getLastMessageId() {
        const messages = document.querySelectorAll('.message');
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            return lastMessage.dataset.messageId;
        }
        return null;
    }

    scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        if (container) {
            container.scrollTop = container.scrollHeight;
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('Force scrolled to bottom. ScrollTop:', container.scrollTop, 'ScrollHeight:', container.scrollHeight);
            }
        }
    }

    toggleChatBox() {
        if (this.isOpen) {
            this.closeChatBox();
        } else {
            this.openChatBox();
        }
    }

    openChatBox() {
        document.getElementById('chatBox').style.display = 'block';
        this.isOpen = true;
    }

    closeChatBox() {
        document.getElementById('chatBox').style.display = 'none';
        this.isOpen = false;
        
        // Stop polling for messages
        if (this.messagePollingInterval) {
            clearInterval(this.messagePollingInterval);
            this.messagePollingInterval = null;
        }
    }

    // Public method to open chat with specific user
    async openChatWithUser(otherUserId) {
        try {
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('Opening chat with user:', otherUserId);
            }
            // Create or get conversation
            const response = await fetch('/api/chat/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    otherUserId: otherUserId
                })
            });

            const data = await response.json();
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('Create conversation response:', data);
            }

            if (data.success) {
                this.openChatBox();
                this.openConversation(data.data.id, otherUserId);
            } else {
                this.showError('Failed to create conversation: ' + data.message);
            }
        } catch (error) {
            console.error('Error opening chat with user:', error);
            this.showError('Error opening chat: ' + error.message);
        }
    }

    showError(message) {
        const container = document.getElementById('conversationsList');
        container.innerHTML = `
            <div class="text-center text-danger py-3">
                <i class="bi bi-exclamation-triangle" style="font-size: 2rem;"></i>
                <p class="mb-0">${message}</p>
            </div>
        `;
    }
}

// Global function to open chat (as requested)
window.openChat = function(srcId, destId) {
    if (window.chatSystem) {
        window.chatSystem.openChatWithUser(destId);
    }
};

// Initialize chat system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatSystem = new ChatSystem();
});
