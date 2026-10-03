import React from 'react';
import { User } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  AtSign,
  MessageSquare,
  Calendar,
  ShieldCheck,
  Check,
  Copy,
  Crown,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onStartChat?: (user: User) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onStartChat,
}) => {
  const { theme } = useTheme();
  const { currentUser } = useAuth();
  const isLight = theme === 'light';
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !user) return null;

  const isMe = user.username.toLowerCase() === currentUser?.username.toLowerCase();
  const isOwner = user.username.toLowerCase() === 'glitch';
  const isOnline = user.status === 'online';

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(`@${user.username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatJoined = (isoString?: string) => {
    if (!isoString) return 'Joined recently';
    try {
      const d = new Date(isoString);
      return `Joined ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
    } catch {
      return 'Member of Glitch';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div
        className={`w-full max-w-sm rounded-3xl border shadow-2xl overflow-hidden flex flex-col transition-colors duration-150 ${
          isLight
            ? 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-200/50'
            : 'bg-neutral-900 border-neutral-800 text-neutral-100'
        }`}
      >
        {/* Banner with Close button */}
        <div className="relative h-24 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 flex items-start justify-end p-3">
          {isOwner && (
            <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-md text-amber-300 text-[11px] font-bold border border-amber-300/30">
              <Crown className="w-3.5 h-3.5 fill-amber-300" />
              <span>Glitch Owner</span>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center backdrop-blur-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="p-5 pt-0 relative flex-1 flex flex-col">
          {/* Avatar floating over banner */}
          <div className="-mt-12 mb-3 flex items-end justify-between">
            <div className="relative">
              <img
                src={user.avatar}
                alt={user.name}
                className={`w-20 h-20 rounded-2xl object-cover ring-4 ${
                  isLight ? 'ring-white bg-neutral-100' : 'ring-neutral-900 bg-neutral-950'
                } shadow-lg`}
              />
              <span
                className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 ${
                  isLight ? 'border-white' : 'border-neutral-900'
                } ${isOnline ? 'bg-emerald-500' : 'bg-neutral-500'}`}
                title={isOnline ? 'Online now' : 'Offline'}
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] px-2.5 py-1 rounded-full font-mono font-semibold flex items-center gap-1 ${
                  isOnline
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-500'
                  }`}
                />
                <span>{isOnline ? 'Online Now' : 'Offline'}</span>
              </span>
            </div>
          </div>

          {/* User Name & Handle */}
          <div className="mb-4">
            <div className="flex items-center gap-1.5">
              <h2 className="text-lg font-bold tracking-tight">{user.name}</h2>
              {isOwner && (
                <span title="Verified Owner">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 fill-emerald-500/20" />
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5">
              <button
                type="button"
                onClick={handleCopyUsername}
                className={`text-xs font-mono text-emerald-500 hover:text-emerald-400 flex items-center gap-1 transition-colors ${
                  isLight ? 'hover:bg-neutral-100' : 'hover:bg-neutral-800'
                } px-1.5 py-0.5 rounded-lg -ml-1`}
                title="Click to copy handle"
              >
                <AtSign className="w-3 h-3" />
                <span>{user.username}</span>
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-500 ml-1" />
                ) : (
                  <Copy className="w-3 h-3 text-neutral-400 ml-1 opacity-60" />
                )}
              </button>
            </div>
          </div>

          {/* Bio Section */}
          <div
            className={`p-3 rounded-2xl border mb-4 text-xs ${
              isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-950 border-neutral-800/80'
            }`}
          >
            <div
              className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${
                isLight ? 'text-neutral-500' : 'text-neutral-400'
              }`}
            >
              Bio
            </div>
            <p className="leading-relaxed whitespace-pre-wrap">
              {user.bio || 'No bio written yet.'}
            </p>
          </div>

          {/* Joined date info */}
          <div className="flex items-center gap-2 text-xs text-neutral-400 mb-5 px-1 font-mono">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatJoined(user.createdAt)}</span>
          </div>

          {/* Action button */}
          {!isMe && onStartChat && (
            <button
              type="button"
              onClick={() => {
                onStartChat(user);
                onClose();
              }}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-sm shadow-emerald-600/30 flex items-center justify-center gap-2 transition-colors mt-auto"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Send Message</span>
            </button>
          )}

          {isMe && (
            <div className="text-center text-xs text-neutral-400 py-1 font-medium mt-auto">
              This is your profile card visible to everyone on Glitch.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
