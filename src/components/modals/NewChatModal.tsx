import React, { useState, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { X, MessageSquare, Users, AtSign, ArrowRight, Search, Check, UserCheck, Camera, Upload, Sparkles } from 'lucide-react';
import { User } from '../../types';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, registeredUsers } = useAuth();
  const { startDirectChat, createGroupChat } = useChat();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [mode, setMode] = useState<'direct' | 'group'>('direct');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupAvatar, setGroupAvatar] = useState('https://api.dicebear.com/7.x/identicon/svg?seed=GlitchGroup');
  const [selectedUsernames, setSelectedUsernames] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const groupAvatarInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Other registered users present on data (excluding yourself)
  const availableUsers = registeredUsers.filter(
    (u) => u.username.toLowerCase() !== currentUser?.username.toLowerCase()
  );

  // Filtered users matching search query
  const filteredUsers = availableUsers.filter((u) => {
    const q = searchQuery.toLowerCase().replace(/^@/, '').trim();
    if (!q) return true;
    return (
      u.username.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      (u.bio && u.bio.toLowerCase().includes(q))
    );
  });

  const handleStartDirectWithUser = (user: User) => {
    startDirectChat(user.username, user);
    onClose();
  };

  const handleStartDirectCustom = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const clean = searchQuery.replace(/^@/, '').toLowerCase().trim();
    if (!clean) {
      setErrorMsg('Please enter a username.');
      return;
    }

    const matchedUser = registeredUsers.find(
      (u) => u.username.toLowerCase() === clean
    );

    startDirectChat(clean, matchedUser);
    onClose();
  };

  const toggleSelectGroupMember = (username: string) => {
    setSelectedUsernames((prev) =>
      prev.includes(username) ? prev.filter((u) => u !== username) : [...prev, username]
    );
  };

  const handleGroupAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setGroupAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!groupName.trim()) {
      setErrorMsg('Please enter a group name.');
      return;
    }

    createGroupChat(groupName.trim(), selectedUsernames, groupAvatar);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div
        className={`w-full max-w-sm rounded-3xl border shadow-2xl p-5 flex flex-col max-h-[85vh] ${
          isLight
            ? 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-200/50'
            : 'bg-neutral-900 border-neutral-800 text-neutral-100'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-sm">New Conversation</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-colors ${
              isLight ? 'hover:bg-neutral-100 text-neutral-500' : 'hover:bg-neutral-800 text-neutral-400'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div
          className={`flex p-1 rounded-xl mb-3 text-xs font-semibold ${
            isLight ? 'bg-neutral-100' : 'bg-neutral-950 border border-neutral-800/80'
          }`}
        >
          <button
            type="button"
            onClick={() => { setMode('direct'); setErrorMsg(null); }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'direct'
                ? isLight
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Direct Chat</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('group'); setErrorMsg(null); }}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'group'
                ? isLight
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'bg-neutral-800 text-white shadow-xs'
                : 'text-neutral-400'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Group Chat</span>
          </button>
        </div>

        {errorMsg && (
          <div className="mb-3 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {mode === 'direct' ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search or Type Username */}
            <form onSubmit={handleStartDirectCustom} className="mb-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search registered users or type username..."
                  autoFocus
                  className={`w-full rounded-xl pl-8 pr-16 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors ${
                    isLight
                      ? 'bg-neutral-100 border border-neutral-200 text-neutral-900 placeholder:text-neutral-400'
                      : 'bg-neutral-950 border border-neutral-800 text-white placeholder:text-neutral-500'
                  }`}
                />
                {searchQuery.trim() && (
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-semibold transition-colors"
                  >
                    Chat
                  </button>
                )}
              </div>
            </form>

            <div
              className={`text-[11px] font-semibold uppercase tracking-wider mb-2 flex items-center justify-between ${
                isLight ? 'text-neutral-500' : 'text-neutral-400'
              }`}
            >
              <span>Users Present on Glitch</span>
              <span className="font-mono text-[10px]">{availableUsers.length}</span>
            </div>

            {/* List of registered users present on data */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
              {availableUsers.length === 0 ? (
                <div
                  className={`py-8 px-4 text-center rounded-2xl border text-xs ${
                    isLight ? 'bg-neutral-50 border-neutral-200 text-neutral-500' : 'bg-neutral-950/60 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <p className="font-medium text-neutral-300">You are the first user registered!</p>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    When someone signs up with their username on this app, they will appear here.
                  </p>
                  {searchQuery.trim() && (
                    <button
                      type="button"
                      onClick={handleStartDirectCustom}
                      className="mt-3 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1 shadow-sm"
                    >
                      <span>Message @{searchQuery.replace(/^@/, '')}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-6 text-center text-xs text-neutral-500">
                  <p>No registered user matches "{searchQuery}".</p>
                  <button
                    type="button"
                    onClick={handleStartDirectCustom}
                    className="mt-2 text-xs font-semibold text-emerald-500 hover:underline inline-flex items-center gap-1"
                  >
                    <span>Start chat with @{searchQuery.replace(/^@/, '')} anyway</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => handleStartDirectWithUser(user)}
                    className={`p-2.5 rounded-2xl border cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                      isLight
                        ? 'bg-neutral-50 hover:bg-emerald-50/50 border-neutral-200 hover:border-emerald-300 text-neutral-900'
                        : 'bg-neutral-950/60 hover:bg-neutral-800 border-neutral-800 hover:border-neutral-700 text-neutral-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-9 h-9 rounded-xl object-cover ring-1 ring-emerald-500/30 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-xs truncate">
                          {user.name}
                        </div>
                        <div className="text-[11px] text-emerald-500 font-mono truncate flex items-center gap-0.5">
                          <AtSign className="w-2.5 h-2.5 inline" />
                          <span>{user.username}</span>
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

                    <ArrowRight className="w-4 h-4 text-emerald-500 shrink-0 opacity-70" />
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateGroup} className="space-y-3 flex-1 flex flex-col min-h-0">
            {/* Group Profile Avatar Picker */}
            <input
              ref={groupAvatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleGroupAvatarFileChange}
              className="hidden"
            />
            <div className="flex items-center gap-3 p-2 rounded-2xl border border-dashed border-emerald-500/30 bg-emerald-500/5">
              <div className="relative group shrink-0">
                <img
                  src={groupAvatar}
                  alt="Group Profile"
                  className="w-12 h-12 rounded-xl object-cover ring-1 ring-emerald-500/40 bg-neutral-900"
                />
                <button
                  type="button"
                  onClick={() => groupAvatarInputRef.current?.click()}
                  className="absolute inset-0 rounded-xl bg-black/40 text-white flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity"
                  title="Upload group picture"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold">Group Profile Picture</div>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => groupAvatarInputRef.current?.click()}
                    className="text-[10px] font-semibold text-emerald-500 hover:underline flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload Image</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const seed = Math.random().toString(36).substring(2, 7);
                      setGroupAvatar(`https://api.dicebear.com/7.x/identicon/svg?seed=${seed}`);
                    }}
                    className="text-[10px] font-semibold text-amber-500 hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Random</span>
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label
                className={`block text-[11px] font-semibold uppercase tracking-wider mb-1 ${
                  isLight ? 'text-neutral-600' : 'text-neutral-400'
                }`}
              >
                Group Name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Project Squad"
                className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  isLight
                    ? 'bg-neutral-100 border border-neutral-200 text-neutral-900'
                    : 'bg-neutral-950 border border-neutral-800 text-white'
                }`}
                required
              />
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <label
                className={`block text-[11px] font-semibold uppercase tracking-wider mb-1 ${
                  isLight ? 'text-neutral-600' : 'text-neutral-400'
                }`}
              >
                Select Members from Data ({selectedUsernames.length})
              </label>

              <div className="flex-1 overflow-y-auto space-y-1 pr-0.5">
                {availableUsers.length === 0 ? (
                  <div className="py-4 text-center text-xs text-neutral-500">
                    No other users registered yet.
                  </div>
                ) : (
                  availableUsers.map((user) => {
                    const isSelected = selectedUsernames.includes(user.username);
                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleSelectGroupMember(user.username)}
                        className={`p-2 rounded-xl border cursor-pointer flex items-center justify-between text-xs transition-colors ${
                          isSelected
                            ? isLight
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium'
                              : 'bg-emerald-950/40 border-emerald-500/50 text-white font-medium'
                            : isLight
                            ? 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'
                            : 'bg-neutral-950/60 hover:bg-neutral-800 border-neutral-800 text-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-7 h-7 rounded-lg object-cover"
                          />
                          <div className="min-w-0">
                            <div className="truncate font-medium">{user.name}</div>
                            <div className="text-[10px] text-emerald-500 font-mono">@{user.username}</div>
                          </div>
                        </div>

                        {isSelected && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={!groupName.trim()}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm shadow-emerald-600/30 mt-1"
            >
              <span>Create Group</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
