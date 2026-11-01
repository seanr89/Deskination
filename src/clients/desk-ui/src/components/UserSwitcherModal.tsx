import React, { useState } from 'react';
import { useDeskBooking } from '../context/DeskBookingContext';
import { useAuth } from '../hooks/useAuth';
import { User, Role } from '../types/deskBooking';
import { X, Check, Shield, User as UserIcon, RotateCcw, Plus, KeyRound, LogOut, Copy } from 'lucide-react';

interface UserSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserSwitcherModal: React.FC<UserSwitcherModalProps> = ({ isOpen, onClose }) => {
  const { users, currentUser, setCurrentUser, upsertUser, resetToDefaults } = useDeskBooking();
  const { firebaseUser, idToken, authMode, signOut, refreshIdToken } = useAuth();
  const [showAddUser, setShowAddUser] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newRole, setNewRole] = useState<Role>('employee');

  if (!isOpen) return null;

  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    onClose();
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;

    const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-violet-600', 'bg-amber-600', 'bg-teal-600'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const createdUser: User = {
      id: `usr-${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim(),
      role: newRole,
      department: newDepartment.trim() || 'General Operations',
      jobTitle: newTitle.trim() || 'Team Member',
      avatarColor: randomColor
    };

    upsertUser(createdUser);
    setShowAddUser(false);
    onClose();
  };

  const handleCopyToken = async () => {
    const token = idToken || (await refreshIdToken(false));
    if (token && navigator.clipboard) {
      await navigator.clipboard.writeText(token);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Switch Workspace Persona</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Experience the platform as an employee booking desks, or as an office manager configuring inventory.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Firebase Auth Session Banner */}
          <div
            className={`p-3.5 rounded-xl border text-xs space-y-2 ${
              authMode === 'firebase'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/70 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                {authMode === 'firebase'
                  ? 'Active Firebase Authentication Session'
                  : 'Demo Workspace Session (Fallback Mode)'}
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  void signOut();
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:text-rose-700 hover:border-rose-200 font-medium"
              >
                <LogOut className="w-3 h-3" />
                Sign Out
              </button>
            </div>

            {firebaseUser ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-700 pt-1">
                <div>
                  <span className="text-slate-500">Firebase UID:</span>{' '}
                  <code className="font-mono bg-white/80 px-1 py-0.5 rounded">
                    {firebaseUser.uid.slice(0, 14)}...
                  </code>
                </div>
                <div>
                  <span className="text-slate-500">Email Verified:</span>{' '}
                  <strong>{firebaseUser.emailVerified ? 'Yes' : 'Pending'}</strong>
                </div>
                <div className="sm:col-span-2 flex items-center justify-between pt-1">
                  <span className="text-slate-500">
                    Mapped Role: <strong className="uppercase">{currentUser.role}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleCopyToken()}
                    className="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-medium"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedToken ? 'Copied Bearer JWT!' : 'Copy Firebase ID Token'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-amber-800">
                You are currently exploring the platform in Demo Mode. Click <strong>Sign Out</strong> to return to the Firebase Email/Password login screen.
              </p>
            )}
          </div>

          {!showAddUser ? (
            <>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400 tracking-wider">
                  OFFICE OPERATIONS &amp; ADMIN
                </div>
                {users.filter(u => u.role === 'admin').map(user => {
                  const isSelected = currentUser.id === user.id;
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                        isSelected 
                          ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600' 
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full ${user.avatarColor} text-white flex items-center justify-center text-sm font-semibold`}>
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900 flex items-center gap-2">
                            {user.name}
                            <span className="text-[11px] font-medium text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded">
                              Office Manager
                            </span>
                          </div>
                          <div className="text-xs text-slate-500">
                            {user.jobTitle} · {user.department}
                          </div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2 pt-2">
                <div className="text-xs font-semibold text-slate-400 tracking-wider">
                  STAFF EMPLOYEES
                </div>
                {users.filter(u => u.role === 'employee').map(user => {
                  const isSelected = currentUser.id === user.id;
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleSelectUser(user)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                        isSelected 
                          ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900' 
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full ${user.avatarColor} text-white flex items-center justify-center text-sm font-semibold`}>
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {user.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {user.jobTitle} · {user.department}
                          </div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-slate-900 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  onClick={() => setShowAddUser(true)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 py-1 px-2 rounded hover:bg-indigo-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Custom Employee
                </button>

                <button
                  onClick={() => {
                    if (confirm('Reset all bookings and desk data back to clean factory initial demo state?')) {
                      resetToDefaults();
                      onClose();
                    }
                  }}
                  className="text-xs text-slate-500 hover:text-rose-600 flex items-center gap-1.5 py-1 px-2 rounded hover:bg-rose-50 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Demo Data
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleAddUser} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Smith"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Company Email</label>
                <input
                  type="email"
                  required
                  placeholder="jordan.smith@acme-corp.internal"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Data Science"
                    value={newDepartment}
                    onChange={e => setNewDepartment(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    placeholder="e.g. ML Engineer"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as Role)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="employee">Staff Employee (Book desks, personal dashboard)</option>
                  <option value="admin">Office Operations Admin (Manage locations, desks, master bookings)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUser(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md"
                >
                  Create &amp; Switch
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Current active user: <strong className="text-slate-800">{currentUser.name}</strong></span>
          <button onClick={onClose} className="hover:text-slate-800 font-medium">Done</button>
        </div>

      </div>
    </div>
  );
};
