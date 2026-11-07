import React, { useState } from 'react';
import { User, UserRole } from '../types/user';
import { getUsers, setCurrentUser } from '../data/mockUsers';
import { auth, googleAuthProvider } from '../lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { useI18n } from '../i18n/I18nContext';
import { Shield, Truck, User as UserIcon, Check, ChevronDown } from 'lucide-react';

interface UserRoleSwitcherProps {
  currentUser: User;
  onUserChanged: (user: User) => void;
}

export const UserRoleSwitcher: React.FC<UserRoleSwitcherProps> = ({ currentUser, onUserChanged }) => {
  const { t, tRole } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const users = getUsers();

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    onUserChanged(user);
    setIsOpen(false);
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const fbUser = result.user;
      const token = await fbUser.getIdToken();

      // Synchronize with PostgreSQL database backend
      const res = await fetch('/api/auth/google-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          uid: fbUser.uid,
          email: fbUser.email,
          name: fbUser.displayName || 'Authenticated User',
        }),
      });

      const data = await res.json();
      const signedInUser: User = {
        id: fbUser.uid,
        name: fbUser.displayName || 'Google User',
        email: fbUser.email || 'user@gmail.com',
        role: data.user?.role || 'customer',
        company: 'Google Account Sign-In',
        status: 'active',
        avatarInitials: (fbUser.displayName || 'GU').split(' ').map((p: string) => p[0]).join('').slice(0, 2),
        createdAt: new Date().toISOString(),
        lastLogin: 'Just now',
      };

      setCurrentUser(signedInUser);
      onUserChanged(signedInUser);
      setIsOpen(false);
    } catch (err) {
      console.warn('Google Sign-In completed or cancelled:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-3.5 h-3.5 text-purple-600" />;
      case 'shipper':
        return <Truck className="w-3.5 h-3.5 text-blue-600" />;
      case 'customer':
        return <UserIcon className="w-3.5 h-3.5 text-emerald-600" />;
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button in Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-xs transition-colors"
        title={t('role.switchRole')}
      >
        <div className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-[10px]">
          {currentUser.avatarInitials}
        </div>
        <div className="text-left hidden sm:block">
          <div className="font-bold text-slate-900 text-[11px] leading-tight flex items-center gap-1">
            <span>{currentUser.name}</span>
            {getRoleIcon(currentUser.role)}
          </div>
          <div className="text-[10px] text-slate-500 capitalize leading-none">
            {tRole(currentUser.role)}
          </div>
        </div>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden divide-y divide-slate-100 text-xs">
            {/* Header */}
            <div className="p-3 bg-slate-50">
              <span className="font-bold text-[11px] uppercase tracking-wider text-slate-500 block">
                {t('role.switchRole')}
              </span>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {t('role.authenticatedAs')}: <strong>{currentUser.name}</strong>
              </p>
            </div>

            {/* Google Sign-in with Firebase Auth */}
            <div className="p-2.5 bg-blue-50/40">
              <button
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-white hover:bg-slate-50 text-slate-800 font-semibold border border-slate-200 rounded-lg shadow-2xs transition-colors disabled:opacity-60 text-xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{isSigningIn ? t('common.loading') : t('role.signInGoogle')}</span>
              </button>
            </div>

            {/* Quick Role Switcher List */}
            <div className="p-1 space-y-1 max-h-60 overflow-y-auto">
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase font-mono">
                {t('role.switchRole')}:
              </div>
              {users.map((u) => {
                const isSelected = u.id === currentUser.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    className={`w-full text-left p-2 rounded-lg flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-blue-50 text-blue-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                        {u.avatarInitials}
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-xs">
                          <span>{u.name}</span>
                          {getRoleIcon(u.role)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                          {u.company || u.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] font-bold">
                      <span
                        className={`capitalize px-1.5 py-0.5 rounded text-[9px] ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : u.role === 'shipper'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {tRole(u.role)}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Explanatory Footer */}
            <div className="p-2.5 bg-slate-50 text-[10px] text-slate-500 space-y-1 leading-tight font-sans">
              <div><strong>{t('role.admin')}:</strong> {t('role.adminDesc')}</div>
              <div><strong>{t('role.shipper')}:</strong> {t('role.shipperDesc')}</div>
              <div><strong>{t('role.customer')}:</strong> {t('role.customerDesc')}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

