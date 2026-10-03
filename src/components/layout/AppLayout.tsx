import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { useTheme } from '../../context/ThemeContext';
import {
  Zap,
  Plus,
  Search,
  ArrowLeft,
  Send,
  Smile,
  Image as ImageIcon,
  MoreVertical,
  Trash2,
  Check,
  CheckCheck,
  Play,
  Pause,
  AtSign,
  Bookmark,
  Sun,
  Moon,
  Info,
  Heart,
  Users,
  MessageSquare,
  Globe,
  User as UserIcon,
} from 'lucide-react';
import { NewChatModal } from '../modals/NewChatModal';
import { ProfileModal } from '../modals/ProfileModal';
import { GroupInfoModal } from '../modals/GroupInfoModal';
import { UserProfileModal } from '../modals/UserProfileModal';
import { Message, User } from '../../types';

export const AppLayout: React.FC = () => {
  const { currentUser, registeredUsers } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  const {
    conversations,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    messages,
    sendMessage,
    reactToMessage,
    toggleLikeMessage,
    deleteConversation,
    clearConversation,
    startDirectChat,
    typingUsers,
    sendTyping,
  } = useChat();

  const [sidebarTab, setSidebarTab] = useState<'chats' | 'users'>('chats');
  const [search, setSearch] = useState('');
  const [inputText, setInputText] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Real Local Image Upload ref
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Audio Playback state
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Handle local image file upload
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, GIF, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      sendMessage({
        text: file.name.replace(/\.[^/.]+$/, ''),
        type: 'image',
        mediaUrl: dataUrl,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Play audio
  const handleTogglePlayAudio = (messageId: string, audioUrl?: string) => {
    if (!audioUrl) return;

    if (playingMessageId === messageId) {
      activeAudioRef.current?.pause();
      setPlayingMessageId(null);
      return;
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
    }

    const audio = new Audio(audioUrl);
    activeAudioRef.current = audio;
    setPlayingMessageId(messageId);

    audio.play().catch((err) => {
      console.error('Playback error:', err);
      setPlayingMessageId(null);
    });

    audio.onended = () => {
      setPlayingMessageId(null);
    };

    audio.onerror = () => {
      setPlayingMessageId(null);
    };
  };

  const handleSendText = () => {
    if (!inputText.trim()) return;
    sendMessage({ text: inputText.trim(), type: 'text' });
    setInputText('');
    setShowEmojiPicker(false);
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  // Filter registered users present in Glitch
  const filteredUsers = registeredUsers.filter((u) => {
    const q = search.toLowerCase().replace(/^@/, '').trim();
    if (!q) return true;
    return (
      u.username.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      (u.bio && u.bio.toLowerCase().includes(q))
    );
  });

  const activeTyping = activeConversationId
    ? typingUsers[activeConversationId] || []
    : [];

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '';
    }
  };

  const handleOpenUserChat = (user: User) => {
    startDirectChat(user.username, user);
    setSelectedUser(null);
  };

  // Determine if other participant in active direct chat is online
  const isDirectPartnerOnline = () => {
    if (!activeConversation || activeConversation.type === 'group') return false;
    const partnerId = activeConversation.participantIds.find(
      (p) => p.toLowerCase() !== currentUser?.username.toLowerCase() && p !== currentUser?.id
    );
    if (!partnerId) return false;
    const partner = registeredUsers.find(
      (u) => u.username.toLowerCase() === partnerId.toLowerCase() || u.id === partnerId
    );
    return partner?.status === 'online';
  };

  const getDirectPartnerUser = (): User | null => {
    if (!activeConversation || activeConversation.type === 'group') return null;
    const partnerId = activeConversation.participantIds.find(
      (p) => p.toLowerCase() !== currentUser?.username.toLowerCase() && p !== currentUser?.id
    );
    if (!partnerId) return null;
    return (
      registeredUsers.find(
        (u) => u.username.toLowerCase() === partnerId.toLowerCase() || u.id === partnerId
      ) || null
    );
  };

  return (
    <div
      className={`h-screen w-screen flex overflow-hidden select-none transition-colors duration-150 ${
        isLight ? 'bg-neutral-50 text-neutral-900' : 'bg-neutral-950 text-neutral-100'
      }`}
    >
      {/* Hidden Real Local Image Upload Input */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileChange}
        className="hidden"
      />

      {/* 1. CHAT & USERS SIDEBAR */}
      <div
        className={`${
          activeConversation ? 'hidden md:flex' : 'flex'
        } w-full md:w-80 lg:w-96 h-full flex-col border-r shrink-0 transition-colors duration-150 ${
          isLight ? 'bg-white border-neutral-200' : 'bg-neutral-950 border-neutral-800/80'
        }`}
      >
        {/* Top Header */}
        <div
          className={`p-3.5 border-b flex items-center justify-between ${
            isLight ? 'border-neutral-200 bg-white/90' : 'border-neutral-800/80 bg-neutral-950'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center">
              <Zap className="w-4 h-4 fill-emerald-500" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight block leading-none">
                Glitch
              </span>
              <span className="text-[10px] text-emerald-500 font-mono font-medium flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Everywhere
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Theme Switcher */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition-colors ${
                isLight ? 'hover:bg-neutral-100 text-neutral-600' : 'hover:bg-neutral-800 text-neutral-400'
              }`}
              title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            >
              {isLight ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-emerald-400" />
              )}
            </button>

            {/* New Chat Button */}
            <button
              type="button"
              onClick={() => setShowNewChat(true)}
              className="p-2 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-600/20 transition-colors"
              title="New Chat / New Group"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Profile Button */}
            <button
              type="button"
              onClick={() => setShowProfile(true)}
              className={`p-1 rounded-xl transition-colors ${
                isLight ? 'hover:bg-neutral-100' : 'hover:bg-neutral-800'
              }`}
              title="Profile & Settings"
            >
              <img
                src={currentUser?.avatar}
                alt={currentUser?.username}
                className="w-8 h-8 rounded-xl object-cover ring-1 ring-emerald-500/40"
              />
            </button>
          </div>
        </div>

        {/* Tab Switcher: Chats vs People Present in Glitch */}
        <div className={`p-2.5 border-b ${isLight ? 'border-neutral-200 bg-neutral-50/50' : 'border-neutral-800/60 bg-neutral-900/40'}`}>
          <div
            className={`flex p-1 rounded-xl text-xs font-semibold ${
              isLight ? 'bg-neutral-200/60' : 'bg-neutral-900 border border-neutral-800'
            }`}
          >
            <button
              type="button"
              onClick={() => setSidebarTab('chats')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                sidebarTab === 'chats'
                  ? isLight
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chats ({conversations.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSidebarTab('users')}
              className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                sidebarTab === 'users'
                  ? isLight
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-emerald-500" />
              <span>In Glitch ({registeredUsers.length})</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className={`p-3 border-b ${isLight ? 'border-neutral-200' : 'border-neutral-800/40'}`}>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={sidebarTab === 'chats' ? 'Search conversations...' : 'Search users in Glitch...'}
              className={`w-full rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors ${
                isLight
                  ? 'bg-neutral-100 border border-neutral-200 text-neutral-900 placeholder:text-neutral-400'
                  : 'bg-neutral-900/80 border border-neutral-800 text-neutral-100 placeholder:text-neutral-500'
              }`}
            />
          </div>
        </div>

        {/* Sidebar Content (Chats or Registered Users in Glitch) */}
        {sidebarTab === 'chats' ? (
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
              <div className="py-12 px-6 text-center text-xs flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-3 ${
                    isLight ? 'bg-neutral-100 border-neutral-200' : 'bg-neutral-900 border-neutral-800'
                  }`}
                >
                  <AtSign className="w-5 h-5 text-emerald-500" />
                </div>
                <h3 className="font-semibold mb-1">
                  No active chats
                </h3>
                <p className={`text-[11px] max-w-xs mb-4 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
                  Tap the + button or open "In Glitch" to message any registered user.
                </p>
                <div className="flex flex-col gap-2 w-full max-w-xs">
                  <button
                    type="button"
                    onClick={() => setSidebarTab('users')}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>See Users in Glitch</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => startDirectChat('Saved Notes')}
                    className={`w-full py-2 border rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                      isLight
                        ? 'bg-white hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                        : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Open Saved Notes</span>
                  </button>
                </div>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isActive = conv.id === activeConversationId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`p-3 rounded-2xl cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                      isActive
                        ? isLight
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-950 font-medium'
                          : 'bg-neutral-900 text-white border border-neutral-800'
                        : isLight
                        ? 'hover:bg-neutral-100 text-neutral-700 border border-transparent'
                        : 'hover:bg-neutral-900/60 text-neutral-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={conv.avatar}
                          alt={conv.name}
                          className={`w-11 h-11 rounded-2xl object-cover ${
                            isLight ? 'bg-neutral-100 ring-1 ring-neutral-200' : 'bg-neutral-900 ring-1 ring-neutral-800'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs truncate flex items-center gap-1.5">
                          <span>{conv.name}</span>
                          {conv.type === 'group' && (
                            <span className="text-[9px] px-1 py-0.2 rounded-md bg-neutral-800/20 text-neutral-500 font-medium">
                              Group
                            </span>
                          )}
                        </div>
                        <div
                          className={`text-[11px] truncate mt-0.5 ${
                            isLight ? 'text-neutral-500' : 'text-neutral-400'
                          }`}
                        >
                          {conv.lastMessage?.text || 'No messages yet'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end">
                      <div className="text-[10px] text-neutral-400 font-mono">
                        {conv.lastMessage ? formatTime(conv.lastMessage.createdAt) : ''}
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="mt-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-[10px] font-bold text-white font-mono">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* USERS PRESENT IN GLITCH (SERVER AUTHORITATIVE LIST) */
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            <div className="px-2 py-1 flex items-center justify-between text-[11px] text-neutral-400 uppercase tracking-wider font-semibold">
              <span>All Registered Accounts</span>
              <span>{registeredUsers.length} total</span>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="py-8 text-center text-xs text-neutral-400">
                No users found matching "{search}".
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isMe = user.username.toLowerCase() === currentUser?.username.toLowerCase();
                const isOnline = user.status === 'online';

                return (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`p-2.5 rounded-2xl border cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                      isLight
                        ? 'bg-neutral-50 hover:bg-emerald-50/60 border-neutral-200 hover:border-emerald-300 text-neutral-900'
                        : 'bg-neutral-900/60 hover:bg-neutral-800 border-neutral-800 hover:border-neutral-700 text-neutral-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="w-10 h-10 rounded-xl object-cover ring-1 ring-emerald-500/20 bg-neutral-900"
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
                            isLight ? 'border-white' : 'border-neutral-950'
                          } ${isOnline ? 'bg-emerald-500' : 'bg-neutral-500'}`}
                          title={isOnline ? 'Online now' : 'Offline'}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="font-semibold text-xs truncate flex items-center gap-1.5">
                          <span>{user.name}</span>
                          {isMe && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-500 font-medium">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-emerald-500 font-mono truncate">
                          @{user.username}
                        </div>
                        {user.bio && (
                          <div
                            className={`text-[10px] truncate mt-0.5 ${
                              isLight ? 'text-neutral-500' : 'text-neutral-400'
                            }`}
                          >
                            {user.bio}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenUserChat(user);
                        }}
                        className="py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        title="Chat with user"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>Chat</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* 2. ACTIVE CHAT CANVAS */}
      {activeConversation ? (
        <div
          className={`flex-1 h-full flex flex-col min-w-0 relative transition-colors duration-150 ${
            isLight ? 'bg-neutral-100/40' : 'bg-neutral-950/60'
          }`}
        >
          {/* Header */}
          <div
            className={`px-4 py-3 border-b flex items-center justify-between z-10 ${
              isLight ? 'bg-white/95 border-neutral-200 shadow-xs' : 'bg-neutral-950/90 border-neutral-800/80'
            }`}
          >
            <div
              onClick={() => {
                if (activeConversation.type === 'group') {
                  setShowGroupInfo(true);
                } else {
                  const partner = getDirectPartnerUser();
                  if (partner) setSelectedUser(partner);
                }
              }}
              className="flex items-center gap-3 min-w-0 cursor-pointer group"
              title={activeConversation.type === 'group' ? 'View and edit group info' : 'View user profile'}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveConversationId(null);
                }}
                className={`p-1.5 -ml-1 rounded-xl transition-colors ${
                  isLight ? 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
                title="Back to Chats"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="relative shrink-0">
                <img
                  src={activeConversation.avatar}
                  alt={activeConversation.name}
                  className="w-9 h-9 rounded-xl object-cover ring-1 ring-emerald-500/30 group-hover:scale-105 transition-transform"
                />
                {activeConversation.type !== 'group' && (
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
                      isLight ? 'border-white' : 'border-neutral-950'
                    } ${isDirectPartnerOnline() ? 'bg-emerald-500' : 'bg-neutral-500'}`}
                  />
                )}
              </div>

              <div className="min-w-0">
                <div className="font-bold text-xs sm:text-sm truncate flex items-center gap-1.5">
                  <span>{activeConversation.name}</span>
                  {activeConversation.type === 'group' && (
                    <span className="text-[10px] text-emerald-500 font-normal">
                      ({activeConversation.participantIds.length} members)
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                  {activeTyping.length > 0 ? (
                    <span className="italic animate-pulse">typing...</span>
                  ) : activeConversation.type === 'group' ? (
                    <span className="text-neutral-400 group-hover:text-emerald-500 transition-colors">
                      tap for group info & members
                    </span>
                  ) : isDirectPartnerOnline() ? (
                    <span className="text-emerald-500 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      online now · tap to view profile
                    </span>
                  ) : (
                    <span className="text-neutral-400 hover:underline">offline · tap to view profile</span>
                  )}
                </div>
              </div>
            </div>

            {/* Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isLight ? 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute right-0 top-10 w-48 rounded-2xl border shadow-xl py-1 z-30 text-xs ${
                    isLight ? 'bg-white border-neutral-200 text-neutral-800' : 'bg-neutral-900 border-neutral-800 text-neutral-200'
                  }`}
                >
                  {activeConversation.type === 'group' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowGroupInfo(true);
                        setShowMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center gap-2 ${
                        isLight ? 'hover:bg-neutral-100' : 'hover:bg-neutral-800'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Group Profile & Members</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const partner = getDirectPartnerUser();
                        if (partner) setSelectedUser(partner);
                        setShowMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center gap-2 ${
                        isLight ? 'hover:bg-neutral-100' : 'hover:bg-neutral-800'
                      }`}
                    >
                      <UserIcon className="w-3.5 h-3.5 text-emerald-500" />
                      <span>View Profile</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      clearConversation(activeConversation.id);
                      setShowMenu(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2 ${
                      isLight ? 'hover:bg-neutral-100' : 'hover:bg-neutral-800'
                    }`}
                  >
                    <span>Clear Messages</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deleteConversation(activeConversation.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-rose-500 hover:bg-rose-500/10 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Chat</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-scroll-area">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-xs text-neutral-400">
                <Info className="w-6 h-6 mb-2 opacity-50" />
                <p>No messages yet in this conversation.</p>
                <p className="text-[11px] text-neutral-500 mt-0.5">Send a message or photo below!</p>
              </div>
            ) : (
              messages.map((msg: Message) => {
                const isMe = msg.senderId === currentUser?.id;
                const isPlayingThis = playingMessageId === msg.id;
                const isLikedByMe = (msg.reactions['❤️'] || []).includes(currentUser?.id || '');
                const likeCount = (msg.reactions['❤️'] || []).length;

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Sender avatar for incoming messages */}
                    {!isMe && (
                      <img
                        src={msg.senderAvatar || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${msg.senderName}`}
                        alt={msg.senderName}
                        onClick={() => {
                          const sender = registeredUsers.find(
                            (u) => u.id === msg.senderId || u.username.toLowerCase() === msg.senderName.toLowerCase()
                          );
                          if (sender) setSelectedUser(sender);
                        }}
                        className="w-7 h-7 rounded-xl object-cover ring-1 ring-emerald-500/20 cursor-pointer hover:opacity-80 transition-opacity mb-1 shrink-0"
                        title={`View ${msg.senderName}'s profile`}
                      />
                    )}

                    <div
                      onDoubleClick={() => toggleLikeMessage(msg.id)}
                      className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-xs relative group ${
                        isMe
                          ? 'bg-emerald-600 text-white rounded-br-xs'
                          : isLight
                          ? 'bg-white border border-neutral-200 text-neutral-900 rounded-bl-xs shadow-xs'
                          : 'bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-bl-xs'
                      }`}
                    >
                      {/* Sender name in group */}
                      {activeConversation.type === 'group' && !isMe && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            const sender = registeredUsers.find(
                              (u) => u.id === msg.senderId || u.username.toLowerCase() === msg.senderName.toLowerCase()
                            );
                            if (sender) setSelectedUser(sender);
                          }}
                          className="text-[10px] font-bold text-emerald-400 mb-1 cursor-pointer hover:underline"
                        >
                          {msg.senderName}
                        </div>
                      )}

                      {/* Real Local Image Attachment */}
                      {msg.type === 'image' && msg.mediaUrl && (
                        <div
                          onClick={() => setExpandedImage(msg.mediaUrl || null)}
                          className="mb-1.5 rounded-xl overflow-hidden cursor-pointer group/img"
                        >
                          <img
                            src={msg.mediaUrl}
                            alt="Uploaded visual asset"
                            className="w-full max-h-72 object-cover rounded-xl group-hover/img:scale-102 transition-transform duration-150"
                          />
                        </div>
                      )}

                      {/* Audio Playback if voice note exists */}
                      {msg.type === 'voice' && (
                        <div className="flex items-center gap-2.5 py-1">
                          <button
                            type="button"
                            onClick={() => handleTogglePlayAudio(msg.id, msg.mediaUrl)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                              isMe
                                ? 'bg-white/20 hover:bg-white/30 text-white'
                                : isLight
                                ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100'
                            }`}
                          >
                            {isPlayingThis ? (
                              <Pause className="w-4 h-4 fill-current" />
                            ) : (
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            )}
                          </button>

                          <div className="flex items-center gap-0.5 h-4 flex-1">
                            {[6, 14, 18, 10, 16, 20, 12, 8, 14, 18, 12, 6, 14, 10].map((h, i) => (
                              <span
                                key={i}
                                style={{ height: `${h}px` }}
                                className={`w-0.5 rounded-full transition-colors ${
                                  isPlayingThis
                                    ? isMe
                                      ? 'bg-white animate-pulse'
                                      : 'bg-emerald-500 animate-pulse'
                                    : isMe
                                    ? 'bg-white/40'
                                    : 'bg-neutral-400'
                                }`}
                              />
                            ))}
                          </div>

                          <span
                            className={`text-[10px] font-mono tabular-nums shrink-0 ${
                              isMe ? 'text-white/80' : 'text-neutral-500'
                            }`}
                          >
                            0:{String(msg.voiceDuration || 2).padStart(2, '0')}
                          </span>
                        </div>
                      )}

                      {/* Text */}
                      {msg.text && (
                        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.text}
                        </p>
                      )}

                      {/* Timestamp & Delivery */}
                      <div
                        className={`mt-1 flex items-center justify-end gap-1 text-[9px] ${
                          isMe ? 'text-white/70' : 'text-neutral-400'
                        }`}
                      >
                        <span className="font-mono tabular-nums">
                          {formatTime(msg.createdAt)}
                        </span>
                        {isMe && (
                          <span>
                            {msg.status === 'read' ? (
                              <CheckCheck className="w-3 h-3 text-emerald-200 inline" />
                            ) : (
                              <Check className="w-3 h-3 text-white/80 inline" />
                            )}
                          </span>
                        )}
                      </div>

                      {/* Quick Reactions & Like Button */}
                      <div className="mt-1.5 flex items-center justify-between gap-1 pt-1 border-t border-white/10">
                        <div className="flex items-center gap-1">
                          {['👍', '🔥'].map((emoji) => {
                            const count = (msg.reactions[emoji] || []).length;
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => reactToMessage(msg.id, emoji)}
                                className={`text-[11px] px-1 py-0.5 rounded-full transition-opacity ${
                                  count > 0 ? 'bg-black/20 text-white font-semibold' : 'opacity-40 hover:opacity-100'
                                }`}
                              >
                                {emoji} {count > 0 ? count : ''}
                              </button>
                            );
                          })}
                        </div>

                        {/* Dedicated Like Button ("add a like") */}
                        <button
                          type="button"
                          onClick={() => toggleLikeMessage(msg.id)}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold transition-transform active:scale-125 ${
                            isLikedByMe
                              ? 'bg-rose-500/20 text-rose-500 font-bold'
                              : isMe
                              ? 'text-white/70 hover:text-white hover:bg-black/10'
                              : 'text-neutral-400 hover:text-rose-500 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                          }`}
                          title="Like this message"
                        >
                          <Heart
                            className={`w-3.5 h-3.5 transition-colors ${
                              isLikedByMe ? 'fill-rose-500 text-rose-500' : ''
                            }`}
                          />
                          {likeCount > 0 && <span>{likeCount}</span>}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Mobile Input Bar */}
          <div
            className={`p-3 border-t relative ${
              isLight ? 'bg-white border-neutral-200' : 'bg-neutral-950/90 border-neutral-800/80'
            }`}
          >
            {/* Quick Emoji Picker */}
            {showEmojiPicker && (
              <div
                className={`absolute bottom-16 left-3 p-2 rounded-2xl border shadow-xl grid grid-cols-6 gap-1 z-20 ${
                  isLight ? 'bg-white border-neutral-200' : 'bg-neutral-900 border-neutral-800'
                }`}
              >
                {['👍', '❤️', '🔥', '🎉', '🚀', '👏', '😂', '✨', '⚡', '👀', '💯', '👌'].map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      setInputText((prev) => prev + e);
                      setShowEmojiPicker(false);
                      inputRef.current?.focus();
                    }}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${
                      isLight ? 'hover:bg-neutral-100' : 'hover:bg-neutral-800'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1.5">
              {/* Emoji button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-2 rounded-xl transition-colors ${
                  isLight ? 'text-neutral-500 hover:text-neutral-900' : 'text-neutral-400 hover:text-white'
                }`}
                title="Emoji"
              >
                <Smile className="w-4 h-4" />
              </button>

              {/* Local Image Upload Trigger */}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className={`p-2 rounded-xl transition-colors ${
                  isLight ? 'text-neutral-500 hover:text-neutral-900' : 'text-neutral-400 hover:text-white'
                }`}
                title="Upload image from device"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              <div
                className={`flex-1 border rounded-xl px-3 py-1.5 focus-within:ring-1 focus-within:ring-emerald-500 transition-colors ${
                  isLight ? 'bg-neutral-100 border-neutral-200' : 'bg-neutral-900 border-neutral-800'
                }`}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    sendTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendText();
                    }
                  }}
                  placeholder="Message..."
                  className={`w-full bg-transparent text-xs focus:outline-none ${
                    isLight ? 'text-neutral-900 placeholder:text-neutral-400' : 'text-white placeholder:text-neutral-500'
                  }`}
                />
              </div>

              {/* Send button */}
              <button
                type="button"
                onClick={handleSendText}
                disabled={!inputText.trim()}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-xl shadow-sm shadow-emerald-600/30 transition-colors"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`hidden md:flex flex-1 h-full items-center justify-center p-8 text-center transition-colors duration-150 ${
            isLight ? 'bg-neutral-100/30 text-neutral-600' : 'bg-neutral-950/40 text-neutral-400'
          }`}
        >
          <div className="max-w-xs flex flex-col items-center">
            <div
              className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-3 ${
                isLight ? 'bg-white border-neutral-200 shadow-sm' : 'bg-neutral-900 border-neutral-800'
              }`}
            >
              <Zap className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className={`font-semibold mb-1 ${isLight ? 'text-neutral-900' : 'text-white'}`}>
              Select or start a chat
            </h3>
            <p className="text-xs text-neutral-400 mb-4">
              Switch to "In Glitch" to see everyone present in the platform, or tap + to start a chat.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSidebarTab('users')}
                className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>People in Glitch</span>
              </button>
              <button
                type="button"
                onClick={() => setShowNewChat(true)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-colors ${
                  isLight ? 'bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-800' : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-800 text-white'
                }`}
              >
                + New Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Lightbox Overlay */}
      {expandedImage && (
        <div
          onClick={() => setExpandedImage(null)}
          className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 cursor-pointer"
        >
          <img
            src={expandedImage}
            alt="Expanded visual asset"
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}

      {/* Modals */}
      <NewChatModal
        isOpen={showNewChat}
        onClose={() => setShowNewChat(false)}
      />

      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
      />

      {activeConversation && activeConversation.type === 'group' && (
        <GroupInfoModal
          isOpen={showGroupInfo}
          onClose={() => setShowGroupInfo(false)}
          conversation={activeConversation}
          onViewUserProfile={(u) => setSelectedUser(u)}
        />
      )}

      {/* User Profile Viewer Modal */}
      <UserProfileModal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        user={selectedUser}
        onStartChat={handleOpenUserChat}
      />
    </div>
  );
};
