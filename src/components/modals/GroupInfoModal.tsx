import React, { useState, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  X,
  Camera,
  Upload,
  UserPlus,
  Users,
  Trash2,
  Check,
  AtSign,
  Sparkles,
} from 'lucide-react';
import { Conversation, User } from '../../types';

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  onViewUserProfile?: (user: User) => void;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  isOpen,
  onClose,
  conversation,
  onViewUserProfile,
}) => {
  const { currentUser, registeredUsers } = useAuth();
  const { updateGroupProfile, addMemberToGroup, removeMemberFromGroup, deleteConversation } = useChat();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [groupName, setGroupName] = useState(conversation.name);
  const [description, setDescription] = useState(conversation.description || '');
  const [avatar, setAvatar] = useState(conversation.avatar);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Local image upload for group avatar
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatar(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    updateGroupProfile(conversation.id, {
      name: groupName.trim(),
      avatar: avatar.trim(),
      description: description.trim(),
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  // Find all registered users present on data
  // Current member users
  const memberUsers: { username: string; user?: User }[] = conversation.participantIds.map((idOrUsername) => {
    const matched = registeredUsers.find(
      (u) => u.username.toLowerCase() === idOrUsername.toLowerCase() || u.id === idOrUsername
    );
    return {
      username: matched ? matched.username : idOrUsername,
      user: matched,
    };
  });

  // Non-member registered users who can be added
  const nonMembers = registeredUsers.filter((u) => {
    return !conversation.participantIds.some(
      (p) => p.toLowerCase() === u.username.toLowerCase() || p === u.id
    );
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div
        className={`w-full max-w-sm rounded-3xl border shadow-2xl p-5 flex flex-col max-h-[90vh] ${
          isLight
            ? 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-200/50'
            : 'bg-neutral-900 border-neutral-800 text-neutral-100'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-sm">Group Info & Members</h3>
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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarFileChange}
          className="hidden"
        />

        <div className="flex-1 overflow-y-auto space-y-4 pr-0.5">
          {/* Group Profile Picture Section */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <img
                src={avatar}
                alt={groupName}
                className="w-20 h-20 rounded-2xl object-cover ring-2 ring-emerald-500/30 shadow-md bg-neutral-950"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-2xl bg-black/50 hover:bg-black/60 text-white flex flex-col items-center justify-center transition-opacity"
                title="Change group profile picture"
              >
                <Camera className="w-5 h-5 mb-0.5" />
                <span className="text-[9px] font-semibold">Change</span>
              </button>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`text-[11px] font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
                  isLight
                    ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                }`}
              >
                <Upload className="w-3 h-3 text-emerald-500" />
                <span>Upload Photo</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const seed = Math.random().toString(36).substring(2, 7);
                  setAvatar(`https://api.dicebear.com/7.x/identicon/svg?seed=${seed}`);
                }}
                className={`text-[11px] font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
                  isLight
                    ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Random</span>
              </button>
            </div>
          </div>

          {/* Group Profile Form */}
          <form onSubmit={handleSaveProfile} className="space-y-3">
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
                required
                className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors ${
                  isLight
                    ? 'bg-neutral-100 border border-neutral-200 text-neutral-900'
                    : 'bg-neutral-950 border border-neutral-800 text-white'
                }`}
              />
            </div>

            <div>
              <label
                className={`block text-[11px] font-semibold uppercase tracking-wider mb-1 ${
                  isLight ? 'text-neutral-600' : 'text-neutral-400'
                }`}
              >
                Description / Purpose
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this group about?"
                className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors ${
                  isLight
                    ? 'bg-neutral-100 border border-neutral-200 text-neutral-900'
                    : 'bg-neutral-950 border border-neutral-800 text-white'
                }`}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              {savedSuccess ? (
                <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Saved!
                </span>
              ) : (
                <div />
              )}
              <button
                type="submit"
                className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
              >
                Save Group Profile
              </button>
            </div>
          </form>

          <div className={`h-px ${isLight ? 'bg-neutral-200' : 'bg-neutral-800'}`} />

          {/* Members List Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-[11px] font-semibold uppercase tracking-wider ${
                  isLight ? 'text-neutral-600' : 'text-neutral-400'
                }`}
              >
                Members ({memberUsers.length})
              </span>
              <button
                type="button"
                onClick={() => setShowAddMembers(!showAddMembers)}
                className="text-xs text-emerald-500 font-semibold hover:underline flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{showAddMembers ? 'Close Add' : '+ Add User'}</span>
              </button>
            </div>

            {/* Add member drawer */}
            {showAddMembers && (
              <div
                className={`p-3 rounded-2xl border mb-3 space-y-2 ${
                  isLight ? 'bg-neutral-100 border-neutral-200' : 'bg-neutral-950 border-neutral-800'
                }`}
              >
                <div className="text-[11px] font-semibold text-neutral-400">
                  Users Present on Data to Add:
                </div>
                {nonMembers.length === 0 ? (
                  <div className="text-xs text-neutral-500 py-1">
                    All registered users are already in this group!
                  </div>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-1.5">
                    {nonMembers.map((user) => (
                      <div
                        key={user.id}
                        className={`p-2 rounded-xl flex items-center justify-between border ${
                          isLight ? 'bg-white border-neutral-200' : 'bg-neutral-900 border-neutral-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-7 h-7 rounded-lg object-cover"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate">{user.name}</div>
                            <div className="text-[10px] text-emerald-500 font-mono">@{user.username}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => addMemberToGroup(conversation.id, user.username)}
                          className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>Add</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Current members list */}
            <div className="space-y-1.5">
              {memberUsers.map(({ username, user }) => {
                const isMe = username.toLowerCase() === currentUser?.username.toLowerCase();
                const displayName = user?.name || username;
                const userAvatar = user?.avatar || `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${username}`;

                return (
                  <div
                    key={username}
                    onClick={() => {
                      if (user && onViewUserProfile) {
                        onViewUserProfile(user);
                      }
                    }}
                    className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                      isLight
                        ? 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200'
                        : 'bg-neutral-950/60 hover:bg-neutral-900 border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={userAvatar}
                        alt={displayName}
                        className="w-7 h-7 rounded-lg object-cover ring-1 ring-emerald-500/20"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate flex items-center gap-1">
                          <span>{displayName}</span>
                          {isMe && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-500 font-medium">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-neutral-400 font-mono">@{username}</div>
                      </div>
                    </div>

                    {!isMe && (
                      <button
                        type="button"
                        onClick={() => removeMemberFromGroup(conversation.id, username)}
                        className="p-1 text-neutral-400 hover:text-rose-500 rounded-lg transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Delete Group Button */}
        <div className="pt-3 border-t border-neutral-800/80 mt-3">
          <button
            type="button"
            onClick={() => {
              deleteConversation(conversation.id);
              onClose();
            }}
            className="w-full py-2 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Leave & Delete Group</span>
          </button>
        </div>

      </div>
    </div>
  );
};
