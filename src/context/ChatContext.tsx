import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Conversation, Message, MessageType, User } from '../types';
import { useAuth } from './AuthContext';
import { playSendSound, playReceiveSound } from '../utils/audio';

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  messages: Message[];
  allMessagesRecord: Record<string, Message[]>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Real-time Messaging
  sendMessage: (payload: {
    text: string;
    type?: MessageType;
    mediaUrl?: string;
    voiceDuration?: number;
  }) => void;
  deleteMessage: (messageId: string) => void;
  reactToMessage: (messageId: string, emoji: string) => void;

  // Conversation controls
  startDirectChat: (targetUsername: string, targetUser?: User) => Promise<Conversation>;
  createGroupChat: (groupName: string, memberUsernames: string[], avatar?: string) => Promise<Conversation>;
  updateGroupProfile: (conversationId: string, updates: { name?: string; avatar?: string; description?: string }) => Promise<void>;
  addMemberToGroup: (conversationId: string, username: string) => Promise<void>;
  removeMemberFromGroup: (conversationId: string, username: string) => Promise<void>;
  deleteConversation: (convId: string) => Promise<void>;
  clearConversation: (convId: string) => void;
  toggleLikeMessage: (messageId: string) => void;

  // Typing
  typingUsers: Record<string, string[]>;
  sendTyping: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, refreshUsers } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const saved = localStorage.getItem('glitch_conversations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [allMessagesRecord, setAllMessagesRecord] = useState<Record<string, Message[]>>(() => {
    try {
      const saved = localStorage.getItem('glitch_messages');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [activeConversationId, setActiveConversationIdRaw] = useState<string | null>(null);

  const setActiveConversationId = useCallback((id: string | null) => {
    setActiveConversationIdRaw(id);
    if (id) {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
      );
    }
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});

  const wsRef = useRef<WebSocket | null>(null);

  // Sync with local cache
  useEffect(() => {
    localStorage.setItem('glitch_conversations', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem('glitch_messages', JSON.stringify(allMessagesRecord));
  }, [allMessagesRecord]);

  // Fetch initial conversations from server
  const fetchServerConversations = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/conversations?username=${encodeURIComponent(currentUser.username)}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.conversations) && data.conversations.length > 0) {
          setConversations(data.conversations);
        }
      }
    } catch (err) {
      console.warn('Failed to load server conversations:', err);
    }
  }, [currentUser?.username]);

  // Fetch messages for active conversation from server
  const fetchMessagesForConversation = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/messages/${convId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages)) {
          setAllMessagesRecord((prev) => ({
            ...prev,
            [convId]: data.messages,
          }));
        }
      }
    } catch (err) {
      console.warn('Failed to load server messages:', err);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchServerConversations();
    }
  }, [currentUser?.id, fetchServerConversations]);

  useEffect(() => {
    if (activeConversationId) {
      fetchMessagesForConversation(activeConversationId);
    }
  }, [activeConversationId, fetchMessagesForConversation]);

  // Connect to real-time live WebSocket server
  useEffect(() => {
    if (!currentUser) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let ws: WebSocket;
    let reconnectTimer: NodeJS.Timeout;

    const connectWs = () => {
      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(
            JSON.stringify({
              type: 'identify',
              userId: currentUser.id,
              userName: currentUser.username,
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleIncomingSocketEvent(data);
          } catch {
            // ignore
          }
        };

        ws.onclose = () => {
          reconnectTimer = setTimeout(connectWs, 3000);
        };
      } catch {
        reconnectTimer = setTimeout(connectWs, 5000);
      }
    };

    connectWs();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [currentUser?.id, currentUser?.username]);

  const handleIncomingSocketEvent = useCallback(
    (event: any) => {
      if (!event || !event.type) return;

      if (event.type === 'new_message') {
        const msg: Message = event.payload;
        if (msg.senderId !== currentUser?.id) {
          playReceiveSound(true);
        }

        setAllMessagesRecord((prev) => {
          const list = prev[msg.conversationId] || [];
          if (list.some((m) => m.id === msg.id)) return prev;
          return { ...prev, [msg.conversationId]: [...list, msg] };
        });

        const isFromMe = msg.senderId === currentUser?.id;
        const unreadForReceiver = isFromMe
          ? 0
          : activeConversationId === msg.conversationId
          ? 0
          : 1;

        setConversations((prev) => {
          const exists = prev.some((c) => c.id === msg.conversationId);
          if (!exists) {
            const newConv: Conversation = {
              id: msg.conversationId,
              type: 'direct',
              name: msg.senderName,
              avatar: msg.senderAvatar,
              participantIds: [msg.senderId],
              isPinned: false,
              isMuted: false,
              unreadCount: unreadForReceiver,
              lastMessage: {
                text: msg.text || (msg.type === 'voice' ? 'Voice memo' : 'Photo'),
                senderId: msg.senderId,
                senderName: msg.senderName,
                createdAt: msg.createdAt,
                status: 'delivered',
                type: msg.type,
              },
              createdAt: msg.createdAt,
            };
            return [newConv, ...prev];
          }

          return prev.map((c) =>
            c.id === msg.conversationId
              ? {
                  ...c,
                  lastMessage: {
                    text: msg.text || (msg.type === 'voice' ? 'Voice memo' : 'Photo'),
                    senderId: msg.senderId,
                    senderName: msg.senderName,
                    createdAt: msg.createdAt,
                    status: 'delivered',
                    type: msg.type,
                  },
                  unreadCount: isFromMe
                    ? 0
                    : activeConversationId === msg.conversationId
                    ? 0
                    : (c.unreadCount || 0) + 1,
                }
              : c
          );
        });
      } else if (event.type === 'reaction') {
        const { messageId, conversationId, emoji, userId, reactions } = event;
        setAllMessagesRecord((prev) => {
          const list = prev[conversationId] || [];
          return {
            ...prev,
            [conversationId]: list.map((m) => {
              if (m.id !== messageId) return m;
              if (reactions) {
                return { ...m, reactions };
              }
              const currentReactions = { ...m.reactions };
              const users = currentReactions[emoji] || [];
              if (users.includes(userId)) {
                currentReactions[emoji] = users.filter((u) => u !== userId);
                if (currentReactions[emoji].length === 0) delete currentReactions[emoji];
              } else {
                currentReactions[emoji] = [...users, userId];
              }
              return { ...m, reactions: currentReactions };
            }),
          };
        });
      } else if (event.type === 'conversation_created' || event.type === 'conversation_updated') {
        const conv: Conversation = event.conversation;
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.id === conv.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...conv };
            return updated;
          }
          return [conv, ...prev];
        });
      } else if (event.type === 'conversation_deleted') {
        const { conversationId } = event;
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
        if (activeConversationId === conversationId) {
          setActiveConversationId(null);
        }
      } else if (event.type === 'user_registered' || event.type === 'user_updated' || event.type === 'presence') {
        refreshUsers();
      } else if (event.type === 'typing') {
        const { conversationId, userName } = event;
        if (userName === currentUser?.username) return;

        setTypingUsers((prev) => {
          const current = prev[conversationId] || [];
          if (current.includes(userName)) return prev;
          return { ...prev, [conversationId]: [...current, userName] };
        });

        setTimeout(() => {
          setTypingUsers((prev) => {
            const current = prev[conversationId] || [];
            return { ...prev, [conversationId]: current.filter((u) => u !== userName) };
          });
        }, 3000);
      }
    },
    [currentUser?.id, currentUser?.username, activeConversationId, refreshUsers]
  );

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;
  const messages = activeConversationId ? allMessagesRecord[activeConversationId] || [] : [];

  // Live Send Message
  const sendMessage = async ({
    text,
    type = 'text',
    mediaUrl,
    voiceDuration,
  }: {
    text: string;
    type?: MessageType;
    mediaUrl?: string;
    voiceDuration?: number;
  }) => {
    if (!currentUser || !activeConversationId) return;

    const newMessage: Message = {
      id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId: activeConversationId,
      senderId: currentUser.id,
      senderName: currentUser.name || currentUser.username,
      senderAvatar: currentUser.avatar,
      text: text.trim(),
      type,
      mediaUrl,
      voiceDuration,
      reactions: {},
      status: 'sent',
      createdAt: new Date().toISOString(),
    };

    // Optimistic UI update
    setAllMessagesRecord((prev) => ({
      ...prev,
      [activeConversationId]: [...(prev[activeConversationId] || []), newMessage],
    }));

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? {
              ...c,
              unreadCount: 0,
              lastMessage: {
                text: text.trim() || (type === 'voice' ? 'Voice memo' : 'Photo'),
                senderId: currentUser.id,
                senderName: currentUser.name || currentUser.username,
                createdAt: newMessage.createdAt,
                status: 'sent',
                type,
              },
            }
          : c
      )
    );

    playSendSound(true);

    // Send to server REST API to persist in permanent DB
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMessage),
      });
    } catch (err) {
      console.error('Error saving message to server:', err);
    }

    // Broadcast over WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'new_message',
          payload: newMessage,
        })
      );
    }
  };

  const deleteMessage = (messageId: string) => {
    if (!activeConversationId) return;
    setAllMessagesRecord((prev) => ({
      ...prev,
      [activeConversationId]: (prev[activeConversationId] || []).filter((m) => m.id !== messageId),
    }));
  };

  const reactToMessage = async (messageId: string, emoji: string) => {
    if (!currentUser || !activeConversationId) return;

    // Optimistic update
    setAllMessagesRecord((prev) => {
      const list = prev[activeConversationId] || [];
      return {
        ...prev,
        [activeConversationId]: list.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = { ...m.reactions };
          const users = reactions[emoji] || [];
          if (users.includes(currentUser.id)) {
            reactions[emoji] = users.filter((u) => u !== currentUser.id);
            if (reactions[emoji].length === 0) delete reactions[emoji];
          } else {
            reactions[emoji] = [...users, currentUser.id];
          }
          return { ...m, reactions };
        }),
      };
    });

    // Send to server
    try {
      await fetch(`/api/messages/${messageId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emoji,
          userId: currentUser.id,
          conversationId: activeConversationId,
        }),
      });
    } catch (err) {
      console.error('Error saving reaction to server:', err);
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'reaction',
          messageId,
          conversationId: activeConversationId,
          emoji,
          userId: currentUser.id,
        })
      );
    }
  };

  const toggleLikeMessage = (messageId: string) => {
    reactToMessage(messageId, '❤️');
  };

  const startDirectChat = async (targetUsername: string, targetUser?: User): Promise<Conversation> => {
    const clean = targetUsername.replace(/^@/, '').toLowerCase().trim();

    // Check if conversation already exists
    const existing = conversations.find(
      (c) =>
        c.type === 'direct' &&
        (c.name.toLowerCase() === `@${clean}` ||
          c.name.toLowerCase() === clean ||
          (targetUser && c.participantIds.includes(targetUser.username)))
    );
    if (existing) {
      setActiveConversationId(existing.id);
      return existing;
    }

    const displayName = targetUser?.name ? `${targetUser.name}` : `@${clean}`;
    const avatar = targetUser?.avatar || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${clean}`;

    const newConvData = {
      type: 'direct',
      name: displayName,
      avatar,
      description: targetUser?.bio,
      participantIds: [clean, currentUser?.username || ''],
    };

    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConvData),
      });
      if (res.ok) {
        const data = await res.json();
        const conv = data.conversation;
        setConversations((prev) => [conv, ...prev.filter((c) => c.id !== conv.id)]);
        setActiveConversationId(conv.id);
        return conv;
      }
    } catch (err) {
      console.error('Error creating conversation on server:', err);
    }

    // Fallback
    const fallbackConv: Conversation = {
      id: `c_${Date.now()}_${clean}`,
      type: 'direct',
      name: displayName,
      avatar,
      participantIds: [clean],
      isPinned: false,
      isMuted: false,
      unreadCount: 0,
      createdAt: new Date().toISOString(),
    };
    setConversations((prev) => [fallbackConv, ...prev]);
    setActiveConversationId(fallbackConv.id);
    return fallbackConv;
  };

  const createGroupChat = async (groupName: string, memberUsernames: string[], avatar?: string): Promise<Conversation> => {
    const cleanMembers = memberUsernames.map((u) => u.replace(/^@/, '').toLowerCase().trim());
    if (currentUser && !cleanMembers.includes(currentUser.username)) {
      cleanMembers.push(currentUser.username);
    }

    const groupAvatar =
      avatar ||
      `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(groupName)}`;

    const groupData = {
      type: 'group',
      name: groupName.trim(),
      avatar: groupAvatar,
      participantIds: cleanMembers,
    };

    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData),
      });
      if (res.ok) {
        const data = await res.json();
        const conv = data.conversation;
        setConversations((prev) => [conv, ...prev.filter((c) => c.id !== conv.id)]);
        setActiveConversationId(conv.id);
        return conv;
      }
    } catch (err) {
      console.error('Error creating group chat on server:', err);
    }

    const fallbackConv: Conversation = {
      id: `grp_${Date.now()}`,
      type: 'group',
      name: groupName.trim(),
      avatar: groupAvatar,
      participantIds: cleanMembers,
      isPinned: false,
      isMuted: false,
      unreadCount: 0,
      createdAt: new Date().toISOString(),
    };
    setConversations((prev) => [fallbackConv, ...prev]);
    setActiveConversationId(fallbackConv.id);
    return fallbackConv;
  };

  const updateGroupProfile = async (
    conversationId: string,
    updates: { name?: string; avatar?: string; description?: string }
  ) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, ...updates } : c))
    );
    try {
      await fetch(`/api/conversations/${conversationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error('Error updating group profile:', err);
    }
  };

  const addMemberToGroup = async (conversationId: string, username: string) => {
    const clean = username.replace(/^@/, '').toLowerCase().trim();
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;
        if (c.participantIds.includes(clean)) return c;
        return {
          ...c,
          participantIds: [...c.participantIds, clean],
        };
      })
    );
    try {
      await fetch(`/api/conversations/${conversationId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: clean }),
      });
    } catch (err) {
      console.error('Error adding member to group:', err);
    }
  };

  const removeMemberFromGroup = async (conversationId: string, username: string) => {
    const clean = username.replace(/^@/, '').toLowerCase().trim();
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== conversationId) return c;
        return {
          ...c,
          participantIds: c.participantIds.filter((p) => p !== clean),
        };
      })
    );
    try {
      await fetch(`/api/conversations/${conversationId}/members/${encodeURIComponent(clean)}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Error removing member from group:', err);
    }
  };

  const deleteConversation = async (convId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConversationId === convId) {
      setActiveConversationId(null);
    }
    try {
      await fetch(`/api/conversations/${convId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Error deleting conversation:', err);
    }
  };

  const clearConversation = (convId: string) => {
    setAllMessagesRecord((prev) => ({ ...prev, [convId]: [] }));
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, lastMessage: undefined } : c))
    );
  };

  const sendTyping = () => {
    if (!currentUser || !activeConversationId) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'typing',
          conversationId: activeConversationId,
          userName: currentUser.username,
        })
      );
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        activeConversationId,
        setActiveConversationId,
        messages,
        allMessagesRecord,
        searchQuery,
        setSearchQuery,
        sendMessage,
        deleteMessage,
        reactToMessage,
        startDirectChat,
        createGroupChat,
        updateGroupProfile,
        addMemberToGroup,
        removeMemberFromGroup,
        deleteConversation,
        clearConversation,
        toggleLikeMessage,
        typingUsers,
        sendTyping,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};
