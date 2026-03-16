import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { formatDistanceToNow } from 'date-fns'
import { Send, Trash2, Lock, Users, AtSign, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ChatPage() {
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [users, setUsers] = useState([])
  const [text, setText] = useState('')
  const [isWhisper, setIsWhisper] = useState(false)
  const [tagUser, setTagUser] = useState(null)
  const [tagPublic, setTagPublic] = useState(true)
  const [showTagMenu, setShowTagMenu] = useState(false)
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef()
  const tagMenuRef = useRef()

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from('chat')
      .select('*, sender:profiles!chat_sender_id_fkey(*), receiver:profiles!chat_receiver_id_fkey(*), tagged:profiles!chat_tag_user_id_fkey(*)')
      .order('created_at', { ascending: true })
      .limit(100)

    if (data) {
      // Filter: hide whispers not for this user
      const visible = data.filter(m => {
        if (!m.is_whisper) return true
        return m.sender_id === user.id || m.receiver_id === user.id
      })
      setMessages(visible)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchMessages()
    supabase.from('profiles').select('id, display_name, avatar_url')
      .neq('id', user.id).then(({ data }) => { if (data) setUsers(data) })

    const channel = supabase
      .channel('chat-room')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat' },
        async (payload) => {
          const { data } = await supabase
            .from('chat')
            .select('*, sender:profiles!chat_sender_id_fkey(*), receiver:profiles!chat_receiver_id_fkey(*), tagged:profiles!chat_tag_user_id_fkey(*)')
            .eq('id', payload.new.id).single()
          if (data) {
            const visible = !data.is_whisper || data.sender_id === user.id || data.receiver_id === user.id
            if (visible) setMessages(prev => [...prev, data])
          }
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat' },
        (payload) => {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m))
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchMessages, user.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close tag menu on outside click
  useEffect(() => {
    function h(e) { if (tagMenuRef.current && !tagMenuRef.current.contains(e.target)) setShowTagMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  async function send(e) {
    e.preventDefault()
    if (!text.trim()) return
    setSending(true)
    try {
      const msg = {
        sender_id: user.id,
        content: text.trim(),
        is_whisper: isWhisper,
        is_deleted: false,
        receiver_id: isWhisper && tagUser ? tagUser.id : null,
        tag_user_id: tagUser ? tagUser.id : null,
        tag_public: tagUser ? tagPublic : null,
      }
      const { data: inserted, error } = await supabase
        .from('chat').insert(msg).select('id').single()
      if (error) throw error

      // Notify
      if (isWhisper && tagUser) {
        await supabase.from('notifications').insert({
          user_id: tagUser.id,
          chat_message_id: inserted.id,
          type: 'whisper',
          message: `💬 ${profile?.display_name} sent you a whisper`,
          is_read: false,
        })
      } else if (tagUser && tagPublic) {
        await supabase.from('notifications').insert({
          user_id: tagUser.id,
          chat_message_id: inserted.id,
          type: 'tag',
          message: `🏷️ ${profile?.display_name} mentioned you in chat`,
          is_read: false,
        })
      }

      setText('')
      setTagUser(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  async function deleteMessage(id) {
    await supabase.from('chat').update({ is_deleted: true }).eq('id', id).eq('sender_id', user.id)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] py-4">
      {/* Header */}
      <div className="card p-4 mb-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center">
          <Users size={18} className="text-brand-600" />
        </div>
        <div>
          <p className="font-display font-bold text-slate-800">Class Chat</p>
          <p className="text-xs text-slate-400">{users.length + 1} members</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-xs text-slate-400">Live</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin text-brand-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map(m => (
            <MessageBubble key={m.id} msg={m} currentUserId={user.id} onDelete={deleteMessage} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div className="card p-3 mt-3">
        {/* Tag preview */}
        {tagUser && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-2 text-xs font-medium ${
            isWhisper ? 'bg-violet-50 text-violet-700' : 'bg-brand-50 text-brand-700'
          }`}>
            {isWhisper ? <Lock size={12} /> : <AtSign size={12} />}
            <span>{isWhisper ? 'Whisper to' : 'Tagging'} @{tagUser.display_name}</span>
            {!isWhisper && (
              <button
                onClick={() => setTagPublic(!tagPublic)}
                className="ml-1 underline"
              >
                {tagPublic ? '(public)' : '(private)'}
              </button>
            )}
            <button onClick={() => setTagUser(null)} className="ml-auto text-slate-400 hover:text-slate-600">×</button>
          </div>
        )}

        <form onSubmit={send} className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              rows={1}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e) } }}
              placeholder={isWhisper ? 'Send a whisper…' : 'Message the class…'}
              className="textarea pr-10 resize-none"
              style={{ minHeight: 42, maxHeight: 120 }}
            />
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            {/* Tag user */}
            <div className="relative" ref={tagMenuRef}>
              <button
                type="button"
                onClick={() => setShowTagMenu(!showTagMenu)}
                className={`p-2 rounded-xl transition-colors ${tagUser ? 'bg-brand-100 text-brand-600' : 'text-slate-400 hover:bg-slate-100'}`}
              >
                <AtSign size={16} />
              </button>
              {showTagMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-52 bg-white rounded-2xl shadow-modal border border-slate-100 py-1.5 z-50 animate-slide-up">
                  <p className="text-xs text-slate-400 px-3 py-1.5 font-medium">Tag someone</p>
                  {users.map(u => (
                    <button key={u.id} type="button"
                      onClick={() => { setTagUser(u); setShowTagMenu(false) }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors text-left">
                      <img src={u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.display_name}`}
                        className="w-6 h-6 rounded-lg" alt="" />
                      <span className="text-sm text-slate-700">{u.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Whisper toggle */}
            <button
              type="button"
              onClick={() => setIsWhisper(!isWhisper)}
              title="Toggle whisper"
              className={`p-2 rounded-xl transition-colors ${isWhisper ? 'bg-violet-100 text-violet-600' : 'text-slate-400 hover:bg-slate-100'}`}
            >
              <Lock size={16} />
            </button>
          </div>

          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="btn-primary flex-shrink-0 px-3 py-2.5"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </div>
  )
}

function MessageBubble({ msg, currentUserId, onDelete }) {
  const isOwn = msg.sender_id === currentUserId

  if (msg.is_deleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <span className="text-xs text-slate-400 italic px-3 py-2 bg-slate-100 rounded-xl">
          {isOwn ? 'You' : msg.sender?.display_name} deleted a message
        </span>
      </div>
    )
  }

  const isWhisper = msg.is_whisper

  return (
    <div className={`flex gap-2.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}>
      {!isOwn && (
        <img
          src={msg.sender?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${msg.sender?.display_name || 'U'}`}
          className="w-7 h-7 rounded-lg object-cover flex-shrink-0 mt-auto"
          alt=""
        />
      )}
      <div className={`max-w-[72%] group`}>
        {!isOwn && (
          <p className="text-[11px] text-slate-400 font-medium mb-1 ml-1">{msg.sender?.display_name}</p>
        )}
        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed relative ${
          isWhisper
            ? isOwn ? 'bg-violet-600 text-white rounded-br-sm' : 'bg-violet-100 text-violet-900 rounded-bl-sm'
            : isOwn ? 'bg-brand-600 text-white rounded-br-sm' : 'bg-white text-slate-800 rounded-bl-sm border border-slate-100'
        }`}>
          {isWhisper && (
            <div className={`flex items-center gap-1 text-[10px] font-semibold mb-1 ${isOwn ? 'text-violet-200' : 'text-violet-500'}`}>
              <Lock size={9} /> Whisper
            </div>
          )}
          {msg.tag_user_id && (
            <span className={`text-[11px] font-semibold ${isOwn ? 'text-brand-200' : 'text-brand-500'} mr-1`}>
              @{msg.tagged?.display_name}
            </span>
          )}
          {msg.content}
        </div>
        <div className={`flex items-center gap-2 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px] text-slate-400">
            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
          </span>
          {isOwn && (
            <button
              onClick={() => onDelete(msg.id)}
              className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-400 transition-all"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
