// Chat System JavaScript
class ChatSystem {
    constructor() {
        this.currentConversationId = null;
        this.currentUserId = null;
        this.isOpen = false;
        this.subscription = null;
        this.currentPage = 1;
        this.messagesPerPage = 20;
        this.hasMoreMessages = false;
        this.isLoadingMessages = false;
        
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
    }

    setupChatButton() {
        // Create floating chat button in bottom right corner
        if (!document.querySelector('#chatFloatingButton')) {
            const chatButtonHTML = `
                <div id="chatFloatingButton" class="chat-floating-button">
                    <button id="chatButton" class="btn btn-primary btn-lg rounded-circle shadow" type="button">
                        <i class="bi bi-chat-dots"></i>
                    </button>
                </div>
            `;
            
            // Add floating button to body
            document.body.insertAdjacentHTML('beforeend', chatButtonHTML);

            // Add click event listener
            document.getElementById('chatButton').addEventListener('click', () => {
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
                    </div>
                </div>
                <div class="message-input-container" style="display: none;">
                    <div class="input-group">
                        <input type="text" id="messageInput" class="form-control" placeholder="Type a message...">
                        <button id="sendButton" class="btn btn-primary" type="button">
                            <i class="bi bi-send"></i>
                        </button>
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
            <div class="conversation-item" data-conversation-id="${conv.id}" data-other-user-id="${conv.other_user.id}" data-other-user-name="${conv.other_user.name}">
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
                const otherUserName = item.dataset.otherUserName;
                
                this.openConversation(conversationId, otherUserId, otherUserName);
            });
        });
    }

    async openConversation(conversationId, otherUserId, otherUserName = null) {
        this.currentConversationId = conversationId;
        this.currentPage = 1;
        this.hasMoreMessages = false;
        this.isLoadingMessages = false;
        
        // Stop any existing polling
        if (this.messagePollingInterval) {
            clearInterval(this.messagePollingInterval);
            this.messagePollingInterval = null;
        }
        
        // Show messages container
        document.getElementById('conversationsList').style.display = 'none';
        document.getElementById('chatMessages').style.display = 'block';
        document.querySelector('.message-input-container').style.display = 'block';

        // Clear previous messages and show loading
        const messagesContainer = document.querySelector('.messages-container');
        messagesContainer.innerHTML = `
            <div class="text-center text-muted py-3">
                <div class="spinner-border spinner-border-sm me-2" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                Loading messages...
            </div>
        `;

        // Update chat header with user name (fast - no API call needed)
        this.updateChatHeaderFast(otherUserName);

        // Load messages
        await this.loadMessages(conversationId);

        // Subscribe to real-time updates
        this.subscribeToMessages(conversationId);

        // Add scroll listener for scroll-to-bottom button
        this.setupScrollListener();
        
        // Focus the messages container for keyboard scrolling
        setTimeout(() => {
            const messagesContainer = document.querySelector('.messages-container');
            if (messagesContainer) {
                messagesContainer.focus();
                
                // Test scroll functionality
                if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    console.log('Messages container scroll info:', {
                        scrollHeight: messagesContainer.scrollHeight,
                        clientHeight: messagesContainer.clientHeight,
                        scrollTop: messagesContainer.scrollTop,
                        canScroll: messagesContainer.scrollHeight > messagesContainer.clientHeight
                    });
                }
            }
        }, 100);
    }

    updateChatHeaderFast(otherUserName) {
        const chatHeader = document.querySelector('.chat-header h6');
        
        // Update header with user name and add back button (instant - no API call)
        chatHeader.innerHTML = `
            <button id="backToConversations" class="btn btn-sm btn-outline-secondary me-2" style="padding: 0.25rem 0.5rem;">
                <i class="bi bi-arrow-left"></i>
            </button>
            <span class="text-success">${otherUserName || 'User'}</span>
        `;

        // Add back button event listener
        document.getElementById('backToConversations').addEventListener('click', () => {
            this.showConversationsList();
        });
    }

    async updateChatHeader(conversationId) {
        try {
            const response = await fetch(`/api/chat/conversations/${conversationId}`);
            const data = await response.json();

            if (data.success) {
                const otherUser = data.data.other_user;
                const chatHeader = document.querySelector('.chat-header h6');
                
                // Update header with user name and add back button
                chatHeader.innerHTML = `
                    <button id="backToConversations" class="btn btn-sm btn-outline-secondary me-2" style="padding: 0.25rem 0.5rem;">
                        <i class="bi bi-arrow-left"></i>
                    </button>
                    <span class="text-success">${otherUser.full_name}</span>
                `;

                // Add back button event listener
                document.getElementById('backToConversations').addEventListener('click', () => {
                    this.showConversationsList();
                });
            }
        } catch (error) {
            console.error('Error updating chat header:', error);
            // Fallback to generic header
            const chatHeader = document.querySelector('.chat-header h6');
            chatHeader.innerHTML = `
                <button id="backToConversations" class="btn btn-sm btn-outline-secondary me-2" style="padding: 0.25rem 0.5rem;">
                    <i class="bi bi-arrow-left"></i>
                </button>
                <span class="text-success">User</span>
            `;
            document.getElementById('backToConversations').addEventListener('click', () => {
                this.showConversationsList();
            });
        }
    }

    showConversationsList() {
        // Hide messages container and show conversations list
        document.getElementById('chatMessages').style.display = 'none';
        document.getElementById('conversationsList').style.display = 'block';
        document.querySelector('.message-input-container').style.display = 'none';
        
        // Reset header to generic "Chat"
        const chatHeader = document.querySelector('.chat-header h6');
        chatHeader.innerHTML = 'Chat';
        
        // Stop polling for messages
        if (this.messagePollingInterval) {
            clearInterval(this.messagePollingInterval);
            this.messagePollingInterval = null;
        }
        
        // Remove scroll listeners
        const messagesContainer = document.querySelector('.messages-container');
        if (messagesContainer) {
            messagesContainer.removeEventListener('scroll', this.handleScroll.bind(this));
            messagesContainer.removeEventListener('wheel', this.handleWheel.bind(this));
            messagesContainer.removeEventListener('keydown', this.handleKeydown.bind(this));
        }
        
        // Hide scroll-to-bottom button
        this.hideScrollToBottomButton();
        
        this.currentConversationId = null;
    }

    async loadMessages(conversationId, loadMore = false) {
        if (this.isLoadingMessages) return;
        
        this.isLoadingMessages = true;
        
        try {
            const page = loadMore ? this.currentPage + 1 : 1;
            const response = await fetch(`/api/chat/conversations/${conversationId}/messages?page=${page}&limit=${this.messagesPerPage}`);
            const data = await response.json();

            if (data.success) {
                if (data.data.messages && data.data.messages.length > 0) {
                    if (loadMore) {
                        // Prepend older messages to the top
                        this.prependMessages(data.data.messages);
                        this.currentPage = page;
                    } else {
                        // Replace all messages (first load)
                        this.renderMessages(data.data.messages);
                        this.currentPage = 1;
                    }
                    
                    // Update pagination info
                    this.hasMoreMessages = data.data.pagination.page < data.data.pagination.totalPages;
                    this.updateLoadMoreButton();
                } else if (!loadMore) {
                    // Show empty state when no messages (only on first load)
                    this.renderEmptyMessages();
                }
            } else {
                if (!loadMore) {
                    this.renderErrorMessages('Failed to load messages');
                }
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            if (!loadMore) {
                this.renderErrorMessages('Error loading messages');
            }
        } finally {
            this.isLoadingMessages = false;
        }
    }

    renderEmptyMessages() {
        const container = document.querySelector('.messages-container');
        container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="bi bi-chat-dots" style="font-size: 3rem; opacity: 0.5;"></i>
                <p class="mt-2 mb-0">No messages yet</p>
                <small>Start the conversation by sending a message!</small>
            </div>
        `;
    }

    renderErrorMessages(errorMessage) {
        const container = document.querySelector('.messages-container');
        container.innerHTML = `
            <div class="text-center text-danger py-4">
                <i class="bi bi-exclamation-triangle" style="font-size: 3rem;"></i>
                <p class="mt-2 mb-0">${errorMessage}</p>
                <small>Please try again later</small>
            </div>
        `;
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

        // Add load more button if there are more messages
        this.updateLoadMoreButton();

        // Scroll to bottom to show newest messages
        const scrollDelay = window.CHAT_CONFIG?.SCROLL_DELAY || 100;
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('Scrolled to bottom. ScrollTop:', container.scrollTop, 'ScrollHeight:', container.scrollHeight);
            }
        }, scrollDelay);
    }

    prependMessages(messages) {
        const container = document.querySelector('.messages-container');
        const loadMoreButton = container.querySelector('.load-more-button');
        
        // Remove load more button temporarily
        if (loadMoreButton) {
            loadMoreButton.remove();
        }
        
        // Store current scroll position
        const oldScrollHeight = container.scrollHeight;
        const oldScrollTop = container.scrollTop;
        
        // Prepend new messages
        const newMessagesHTML = messages.map(message => `
            <div class="message ${message.sender_id == this.currentUserId ? 'message-sent' : 'message-received'}" data-message-id="${message.id}">
                <div class="message-content">
                    ${this.formatMessageContent(message.content)}
                </div>
                <div class="message-time">
                    ${new Date(message.timestamp).toLocaleTimeString()}
                </div>
            </div>
        `).join('');
        
        container.insertAdjacentHTML('afterbegin', newMessagesHTML);
        
        // Restore scroll position
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
        
        // Add load more button back
        this.updateLoadMoreButton();
    }

    updateLoadMoreButton() {
        const container = document.querySelector('.messages-container');
        const existingButton = container.querySelector('.load-more-button');
        
        // Remove existing button
        if (existingButton) {
            existingButton.remove();
        }
        
        // Add load more button if there are more messages
        if (this.hasMoreMessages) {
            const loadMoreHTML = `
                <div class="load-more-button text-center py-2">
                    <button class="btn btn-outline-secondary btn-sm" id="loadMoreMessages">
                        <i class="bi bi-arrow-up"></i> Load older messages
                    </button>
                </div>
            `;
            container.insertAdjacentHTML('afterbegin', loadMoreHTML);
            
            // Add event listener
            document.getElementById('loadMoreMessages').addEventListener('click', () => {
                this.loadMoreMessages();
            });
        }
    }

    async loadMoreMessages() {
        if (this.currentConversationId && this.hasMoreMessages && !this.isLoadingMessages) {
            await this.loadMessages(this.currentConversationId, true);
        }
    }

    setupScrollListener() {
        const messagesContainer = document.querySelector('.messages-container');
        if (!messagesContainer) return;

        // Remove existing listener
        messagesContainer.removeEventListener('scroll', this.handleScroll.bind(this));
        
        // Add new listener
        messagesContainer.addEventListener('scroll', this.handleScroll.bind(this));
        
        // Prevent scroll events from bubbling to the page
        messagesContainer.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        
        // Ensure the container can receive focus for keyboard scrolling
        messagesContainer.setAttribute('tabindex', '0');
        
        // Focus container when clicked
        messagesContainer.addEventListener('click', () => {
            messagesContainer.focus();
        });
        
        // Handle keyboard scrolling
        messagesContainer.addEventListener('keydown', this.handleKeydown.bind(this));
    }

    handleWheel(event) {
        const messagesContainer = document.querySelector('.messages-container');
        if (!messagesContainer) return;

        // Check if the scroll is happening within the messages container
        const rect = messagesContainer.getBoundingClientRect();
        const isInsideContainer = (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
        );

        if (isInsideContainer) {
            // Just prevent the scroll from bubbling to the page
            // Let the browser handle the natural scrolling of the container
            event.stopPropagation();
        }
    }

    handleScroll() {
        const messagesContainer = document.querySelector('.messages-container');
        if (!messagesContainer) return;

        const scrollTop = messagesContainer.scrollTop;
        const scrollHeight = messagesContainer.scrollHeight;
        const clientHeight = messagesContainer.clientHeight;
        
        // Show scroll-to-bottom button if user has scrolled up
        const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
        
        if (!isNearBottom) {
            this.showScrollToBottomButton();
        } else {
            this.hideScrollToBottomButton();
        }
    }

    showScrollToBottomButton() {
        const messagesContainer = document.querySelector('.messages-container');
        if (!messagesContainer || messagesContainer.querySelector('.scroll-to-bottom-btn')) return;

        const scrollButton = document.createElement('button');
        scrollButton.className = 'scroll-to-bottom-btn';
        scrollButton.innerHTML = '<i class="bi bi-arrow-down"></i>';
        scrollButton.title = 'Scroll to bottom';
        
        messagesContainer.appendChild(scrollButton);
        
        scrollButton.addEventListener('click', () => {
            this.scrollToBottom();
            this.hideScrollToBottomButton();
        });
    }

    hideScrollToBottomButton() {
        const scrollButton = document.querySelector('.scroll-to-bottom-btn');
        if (scrollButton) {
            scrollButton.remove();
        }
    }

    handleKeydown(event) {
        const messagesContainer = document.querySelector('.messages-container');
        if (!messagesContainer) return;

        // Handle arrow keys and page up/down for scrolling
        switch(event.key) {
            case 'ArrowUp':
                event.preventDefault();
                messagesContainer.scrollTop -= 50;
                break;
            case 'ArrowDown':
                event.preventDefault();
                messagesContainer.scrollTop += 50;
                break;
            case 'PageUp':
                event.preventDefault();
                messagesContainer.scrollTop -= messagesContainer.clientHeight * 0.8;
                break;
            case 'PageDown':
                event.preventDefault();
                messagesContainer.scrollTop += messagesContainer.clientHeight * 0.8;
                break;
            case 'Home':
                event.preventDefault();
                messagesContainer.scrollTop = 0;
                break;
            case 'End':
                event.preventDefault();
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                break;
        }
    }

    formatMessageContent(content) {
        // Basic formatting - convert line breaks to HTML
        return content.replace(/\n/g, '<br>');
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
            // Get only the latest messages (page 1) to check for new ones
            const response = await fetch(`/api/chat/conversations/${conversationId}/messages?page=1&limit=${this.messagesPerPage}`);
            const data = await response.json();
            
            if (data.success && data.data.messages.length > 0) {
                // Get the last message (newest) since page 1 now contains the newest messages in chronological order
                const latestMessage = data.data.messages[data.data.messages.length - 1];
                const lastMessageId = this.getLastMessageId();
                
                // If we have a new message, reload all messages
                if (!lastMessageId || latestMessage.id !== lastMessageId) {
                    // Reset to first page and reload all messages
                    this.currentPage = 1;
                    await this.loadMessages(conversationId, false);
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
        
        // Hide floating button when chat is open
        const floatingButton = document.getElementById('chatFloatingButton');
        if (floatingButton) {
            floatingButton.style.display = 'none';
        }
    }

    closeChatBox() {
        document.getElementById('chatBox').style.display = 'none';
        this.isOpen = false;
        
        // Hide input container when chat is closed
        const inputContainer = document.querySelector('.message-input-container');
        if (inputContainer) {
            inputContainer.style.display = 'none';
        }
        
        // Show floating button when chat is closed
        const floatingButton = document.getElementById('chatFloatingButton');
        if (floatingButton) {
            floatingButton.style.display = 'block';
        }
        
        // Stop polling for messages
        if (this.messagePollingInterval) {
            clearInterval(this.messagePollingInterval);
            this.messagePollingInterval = null;
        }
    }

    // Public method to open chat with specific user
    async openChatWithUser(otherUserId, otherUserName = null) {
        try {
            console.log('ChatSystem.openChatWithUser called with:', otherUserId, otherUserName);
            
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

            console.log('API response status:', response.status);
            const data = await response.json();
            console.log('Create conversation response:', data);

            if (data.success) {
                console.log('Opening chat box and conversation...');
                this.openChatBox();
                this.openConversation(data.data.id, otherUserId, otherUserName);
            } else {
                console.error('Failed to create conversation:', data.message);
                alert('Failed to create conversation: ' + data.message);
                this.showError('Failed to create conversation: ' + data.message);
            }
        } catch (error) {
            console.error('Error opening chat with user:', error);
            alert('Error opening chat: ' + error.message);
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
    } else {
        console.error('Chat system not initialized');
    }
};

// Wrapper specifically for course detail button
window.openChatWithInstructor = function(instructorId, instructorName) {
    console.log('openChatWithInstructor called with:', instructorId, instructorName);
    
    if (!window.authUser) {
        console.error('User not authenticated');
        alert('Please sign in to chat with the instructor');
        return;
    }
    
    if (window.chatSystem) {
        console.log('Opening chat with instructor...');
        window.chatSystem.openChatWithUser(instructorId, instructorName);
    } else {
        console.error('Chat system not initialized');
        alert('Chat system is not available. Please refresh the page.');
    }
};
