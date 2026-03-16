import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNotifications } from '../hooks/useNotifications'
import {
  BookOpen, Home, MessageSquare, Bell, BookMarked, Grid3X3,
  LogOut, Settings, ChevronDown, Check, X
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function Layout({ children }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const menuRef = useRef(null)
  const notifRef = useRef(null)
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications()

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(false)
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    await signOut()
    navigate('/auth')
  }

  const navItems = [
    { to: '/', icon: Home, label: 'Feed', exact: true },
    { to: '/chat', icon: MessageSquare, label: 'Chat' },
    { to: '/announcements', icon: Bell, label: 'Announce' },
    { to: '/subjects', icon: BookMarked, label: 'Subjects' },
    { to: '/apps', icon: Grid3X3, label: 'Apps' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm shadow-brand-600/30">
              <BookOpen size={16} className="text-white" />
            </div>
            <span className="font-display font-bold text-lg text-slate-800 tracking-tight">EduBoard</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setShowNotifs(!showNotifs); setShowUserMenu(false) }}
                className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <Bell size={20} className="text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-modal border border-slate-100 overflow-hidden animate-slide-up">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <span className="font-semibold text-sm text-slate-800">Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-brand-600 hover:underline font-medium flex items-center gap-1">
                        <Check size={12} /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-10 text-center text-sm text-slate-400">No notifications yet</div>
                    ) : notifications.map(n => (
                      <NotifItem key={n.id} notif={n} onRead={markRead} onClose={() => setShowNotifs(false)} navigate={navigate} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifs(false) }}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <img
                  src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=U`}
                  alt="avatar"
                  className="w-7 h-7 rounded-lg object-cover bg-slate-100"
                />
                <span className="text-sm font-medium text-slate-700 hidden sm:block max-w-[100px] truncate">
                  {profile?.display_name || 'User'}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-modal border border-slate-100 py-1.5 animate-slide-up">
                  <div className="px-4 py-2 border-b border-slate-100 mb-1">
                    <p className="font-semibold text-sm text-slate-800 truncate">{profile?.display_name}</p>
                    <p className="text-xs text-slate-400 truncate">{profile?.email}</p>
                  </div>
                  <button onClick={() => { navigate('/profile'); setShowUserMenu(false) }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                    <Settings size={15} /> Profile Settings
                  </button>
                  <button onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors">
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-2xl mx-auto w-full pb-24 px-4">
        {children}
      </main>

      {/* Footer nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-100"
        style={{ boxShadow: '0 -1px 0 rgba(0,0,0,0.06), 0 -8px 24px rgba(0,0,0,0.04)' }}>
        <div className="max-w-2xl mx-auto px-2 h-16 flex items-center">
          {navItems.map(({ to, icon: Icon, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-brand-600'
                    : 'text-slate-400 hover:text-slate-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1 rounded-lg transition-all ${isActive ? 'bg-brand-50' : ''}`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

function NotifItem({ notif, onRead, onClose, navigate }) {
  const icons = { announcement: '📢', tag: '🏷️', whisper: '💬' }
  function handleClick() {
    onRead(notif.id)
    onClose()
    if (notif.post_id) navigate(`/?post=${notif.post_id}`)
  }
  return (
    <button onClick={handleClick}
      className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left ${!notif.is_read ? 'bg-brand-50/40' : ''}`}>
      <span className="text-lg mt-0.5">{icons[notif.type] || '🔔'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 leading-snug">{notif.message}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
        </p>
      </div>
      {!notif.is_read && <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />}
    </button>
  )
}
