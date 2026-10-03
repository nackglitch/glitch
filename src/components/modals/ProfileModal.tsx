import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { X, LogOut, Sun, Moon, Check, AtSign, Camera, Upload, Sparkles } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateProfile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [displayName, setDisplayName] = useState(currentUser?.name || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen || !currentUser) return null;

  const isLight = theme === 'light';

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPEG, PNG, WebP, etc.).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatar(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name: displayName.trim() || currentUser.username,
      bio: bio.trim(),
      avatar: avatar.trim() || currentUser.avatar,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const generatePresetAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(2, 7);
    const newAvatar = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${randomSeed}`;
    setAvatar(newAvatar);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div
        className={`w-full max-w-sm rounded-3xl border shadow-2xl p-5 ${
          isLight
            ? 'bg-white border-neutral-200 text-neutral-900 shadow-neutral-200/50'
            : 'bg-neutral-900 border-neutral-800 text-neutral-100'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm">Profile & Settings</h3>
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

        {/* Profile Picture Uploader */}
        <div className="flex flex-col items-center mb-5">
          <div className="relative group">
            <img
              src={avatar || currentUser.avatar}
              alt={currentUser.name}
              className={`w-20 h-20 rounded-2xl object-cover ring-2 shadow-md ${
                isLight ? 'ring-neutral-200 bg-neutral-100' : 'ring-neutral-700 bg-neutral-950'
              }`}
            />
            {/* Camera Overlay */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-2xl bg-black/40 hover:bg-black/60 text-white flex flex-col items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity"
              title="Upload new photo"
            >
              <Camera className="w-5 h-5 mb-0.5" />
              <span className="text-[9px] font-medium">Change</span>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarFileChange}
            className="hidden"
          />

          <div className="flex items-center gap-2 mt-2.5">
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
              <span>Upload Picture</span>
            </button>
            <button
              type="button"
              onClick={generatePresetAvatar}
              className={`text-[11px] font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
                isLight
                  ? 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400'
              }`}
              title="Generate new avatar"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Random</span>
            </button>
          </div>

          <div className="text-xs font-mono font-medium text-emerald-500 flex items-center gap-1 mt-2">
            <AtSign className="w-3 h-3 inline" />
            <span>{currentUser.username}</span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5">
          <div>
            <label
              className={`block text-[11px] font-semibold uppercase tracking-wider mb-1 ${
                isLight ? 'text-neutral-600' : 'text-neutral-400'
              }`}
            >
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Alex"
              className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors ${
                isLight
                  ? 'bg-neutral-100 border border-neutral-200 text-neutral-900 placeholder:text-neutral-400'
                  : 'bg-neutral-950 border border-neutral-800 text-white placeholder:text-neutral-600'
              }`}
            />
          </div>

          <div>
            <label
              className={`block text-[11px] font-semibold uppercase tracking-wider mb-1 ${
                isLight ? 'text-neutral-600' : 'text-neutral-400'
              }`}
            >
              Bio / About You
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write a short bio or status..."
              rows={2}
              className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none transition-colors ${
                isLight
                  ? 'bg-neutral-100 border border-neutral-200 text-neutral-900 placeholder:text-neutral-400'
                  : 'bg-neutral-950 border border-neutral-800 text-white placeholder:text-neutral-600'
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
              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm shadow-emerald-600/20 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>

        <div className={`h-px my-4 ${isLight ? 'bg-neutral-200' : 'bg-neutral-800'}`} />

        {/* Theme Toggle & Logout */}
        <div className="space-y-2">
          {/* Functional Theme Switcher Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`w-full p-2.5 rounded-xl border text-xs flex items-center justify-between transition-colors ${
              isLight
                ? 'bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-800'
                : 'bg-neutral-950 hover:bg-neutral-800 border-neutral-800 text-neutral-200'
            }`}
          >
            <span className="flex items-center gap-2 font-medium">
              {isLight ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-emerald-400" />
              )}
              <span>Theme: {isLight ? 'Light Mode' : 'Dark Mode'}</span>
            </span>
            <span className="text-[11px] font-semibold text-emerald-500">
              Switch to {isLight ? 'Dark' : 'Light'}
            </span>
          </button>

          {/* Logout */}
          <button
            type="button"
            onClick={() => {
              logout();
              onClose();
            }}
            className="w-full p-2.5 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-xs text-rose-500 font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out (@{currentUser.username})</span>
          </button>
        </div>

      </div>
    </div>
  );
};
