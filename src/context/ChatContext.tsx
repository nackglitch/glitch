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
  startDirectChat: (targetUsername: string, targetUser?: User) => Conversation;
  createGroupChat: (groupName: string, memberUsernames: string[], avatar?: string) => Conversation;
  updateGroupProfile: (conversationId: string, updates: { name?: string; avatar?: string; description?: string }) => void;
  addMemberToGroup: (conversationId: string, username: string) => void;
  removeMemberFromGroup: (conversationId: string, username: string) => void;
  deleteConversation: (convId: string) => void;
  clearConversation: (convId: string) => void;
  toggleLikeMessage: (messageId: string) => void;
  
  // Typing
  typingUsers: Record<string, string[]>;
  sendTyping: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  
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

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    localStorage.setItem('glitch_conversations', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem('glitch_messages', JSON.stringify(allMessagesRecord));
  }, [allMessagesRecord]);

  // Connect to real-time WebSocket server
  useEffect(() => {
    if (!currentUser) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'identify', userId: currentUser.id, userName: currentUser.username }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleIncomingSocketEvent(data);
        } catch {
          // ignore
        }
      };
    } catch {
      // offline/fallback
    }

    return () => {
      if (ws) ws.close();
    };
  }, [currentUser?.id]);

  const handleIncomingSocketEvent = useCallback((event: any) => {
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

      setConversations((prev) => {
        const exists = prev.some((c) => c.id === msg.conversationId);
        if (!exists) {
          // Add newly incoming conversation automatically
          const newConv: Conversation = {
            id: msg.conversationId,
            type: 'direct',
            name: msg.senderName,
            avatar: msg.senderAvatar,
            participantIds: [msg.senderId],
            isPinned: false,
            isMuted: false,
            unreadCount: activeConversationId === msg.conversationId ? 0 : 1,
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
                unreadCount: activeConversationId === msg.conversationId ? 0 : c.unreadCount + 1,
              }
            : c
        );
      });
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
  }, [currentUser?.id, currentUser?.username, activeConversationId]);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;
  const messages = activeConversationId ? allMessagesRecord[activeConversationId] || [] : [];

  const sendMessage = ({
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
      id: `m_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
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

    setAllMessagesRecord((prev) => ({
      ...prev,
      [activeConversationId]: [...(prev[activeConversationId] || []), newMessage],
    }));

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? {
              ...c,
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
    setAllMessagesRecord((prev) => {
      const list = prev[activeConversationId] || [];
      return {
        ...prev,
        [activeConversationId]: list.filter((m) => m.id !== messageId),
      };
    });
  };

  const reactToMessage = (messageId: string, emoji: string) => {
    if (!currentUser || !activeConversationId) return;
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
  };

  const startDirectChat = (targetUsername: string, targetUser?: User): Conversation => {
    const clean = targetUsername.replace(/^@/, '').toLowerCase().trim();
    
    // Check if conversation already exists
    const existing = conversations.find(
      (c) => c.type === 'direct' && (c.name.toLowerCase() === `@${clean}` || c.name.toLowerCase() === clean || (targetUser && c.participantIds.includes(targetUser.id)))
    );
    if (existing) {
      setActiveConversationId(existing.id);
      return existing;
    }

    const displayName = targetUser?.name ? `${targetUser.name}` : `@${clean}`;
    const avatar = targetUser?.avatar || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${clean}`;

    const newConv: Conversation = {
      id: `c_${Date.now()}_${clean}`,
      type: 'direct',
      name: displayName,
      avatar,
      description: targetUser?.bio,
      participantIds: [targetUser?.id || clean],
      isPinned: false,
      isMuted: false,
      unreadCount: 0,
      createdAt: new Date().toISOString(),
    };

    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
    return newConv;
  };

  const createGroupChat = (groupName: string, memberUsernames: string[], avatar?: string): Conversation => {
    const cleanMembers = memberUsernames.map((u) => u.replace(/^@/, '').toLowerCase().trim());
    if (currentUser && !cleanMembers.includes(currentUser.username)) {
      cleanMembers.push(currentUser.username);
    }

    const groupAvatar =
      avatar ||
      `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(groupName)}`;

    const newConv: Conversation = {
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

    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
    return newConv;
  };

  const updateGroupProfile = (
    conversationId: string,
    updates: { name?: string; avatar?: string; description?: string }
  ) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, ...updates } : c))
    );
  };

  const addMemberToGroup = (conversationId: string, username: string) => {
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
  };

  const removeMemberFromGroup = (conversationId: string, username: string) => {
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
  };

  const toggleLikeMessage = (messageId: string) => {
    reactToMessage(messageId, '❤️');
  };

  const deleteConversation = (convId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConversationId === convId) {
      setActiveConversationId(null);
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
