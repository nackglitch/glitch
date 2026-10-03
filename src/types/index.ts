export type UserStatus = 'online' | 'offline' | 'away';

export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio?: string;
  phone?: string;
  status: UserStatus;
  lastSeen: string;
  createdAt: string;
  blockedUserIds: string[];
}

export type MessageType = 'text' | 'image' | 'voice' | 'file';
export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  type: MessageType;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: string;
  voiceDuration?: number;
  reactions: Record<string, string[]>;
  isPinned?: boolean;
  status: MessageDeliveryStatus;
  createdAt: string;
}

export type ConversationType = 'direct' | 'group';

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string;
  avatar: string;
  description?: string;
  participantIds: string[];
  isPinned: boolean;
  isMuted: boolean;
  unreadCount: number;
  lastMessage?: {
    text: string;
    senderId: string;
    senderName: string;
    createdAt: string;
    status?: MessageDeliveryStatus;
    type?: MessageType;
  };
  createdAt: string;
}

export interface Contact {
  id: string;
  username: string;
  name: string;
  avatar: string;
  bio?: string;
  isOnline: boolean;
}
