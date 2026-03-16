import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { X, Image, Paperclip, ChevronDown, Loader2, Megaphone, FileText } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CreatePostModal({ onClose, onCreated, subjects }) {
  const { user, profile } = useAuth()
  const [form, setForm] = useState({
    caption: '', subject_id: '', post_type: 'status', due_date: ''
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [attachFile, setAttachFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const photoRef = useRef()
  const fileRef = useRef()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function handlePhoto(e) {
    const f = e.target.files[0]
    if (!f) return
    setPhotoFile(f)
    setPhotoPreview(URL.createObjectURL(f))
  }

  function handleFile(e) {
    const f = e.target.files[0]
    if (f) setAttachFile(f)
  }

  async function uploadFile(file, bucket) {
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(path, file)
    if (error) throw error
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.caption.trim() && !photoFile) {
      toast.error('Add a caption or photo')
      return
    }
    setLoading(true)
    try {
      let photo_url = null
      let file_url = null
      let file_name = null

      if (photoFile) photo_url = await uploadFile(photoFile, 'post-media')
      if (attachFile) {
        file_url = await uploadFile(attachFile, 'post-media')
        file_name = attachFile.name
      }

      const postData = {
        author_id: user.id,
        subject_id: form.subject_id || null,
        caption: form.caption.trim(),
        photo_url,
        file_url,
        file_name,
        post_type: form.post_type,
        due_date: form.post_type === 'announcement' && form.due_date ? form.due_date : null,
      }

      const { data: post, error } = await supabase
        .from('posts')
        .insert(postData)
        .select('*, profiles(*), subjects(*)')
        .single()

      if (error) throw error

      // If announcement, notify enrolled users
      if (form.post_type === 'announcement' && form.subject_id) {
        const { data: enrolled } = await supabase
          .from('user_subjects')
          .select('user_id')
          .eq('subject_id', form.subject_id)
          .neq('user_id', user.id)

        if (enrolled?.length) {
          const notifs = enrolled.map(e => ({
            user_id: e.user_id,
            post_id: post.id,
            type: 'announcement',
            message: `📢 New announcement in ${post.subjects?.name || 'a subject'}: "${form.caption.slice(0, 60)}${form.caption.length > 60 ? '…' : ''}"`,
            is_read: false,
          }))
          await supabase.from('notifications').insert(notifs)
        }
      }

      toast.success(form.post_type === 'announcement' ? 'Announcement posted!' : 'Post shared!')
      onCreated(post)
      onClose()
    } catch (err) {
      toast.error(err.message || 'Failed to post')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-display font-bold text-lg text-slate-800">Create Post</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Author row */}
          <div className="flex items-center gap-3">
            <img
              src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=U`}
              className="w-10 h-10 rounded-xl object-cover bg-slate-100"
              alt="you"
            />
            <div>
              <p className="font-semibold text-sm text-slate-800">{profile?.display_name}</p>
              <p className="text-xs text-slate-400">Sharing to feed</p>
            </div>
          </div>

          {/* Post type toggle */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => set('post_type', 'status')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                form.post_type === 'status' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
              }`}
            >
              <FileText size={14} /> Status
            </button>
            <button
              type="button"
              onClick={() => set('post_type', 'announcement')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                form.post_type === 'announcement' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              <Megaphone size={14} /> Announcement
            </button>
          </div>

          {/* Caption */}
          <textarea
            className="textarea"
            placeholder={form.post_type === 'announcement' ? "What's the announcement?" : "What's on your mind?"}
            rows={4}
            value={form.caption}
            onChange={e => set('caption', e.target.value)}
          />

          {/* Subject selector */}
          <div className="relative">
            <select
              className="input appearance-none pr-9"
              value={form.subject_id}
              onChange={e => set('subject_id', e.target.value)}
            >
              <option value="">No subject (General)</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Due date (announcements only) */}
          {form.post_type === 'announcement' && (
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Due Date (optional)</label>
              <input
                type="date"
                className="input"
                value={form.due_date}
                onChange={e => set('due_date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}

          {/* Photo preview */}
          {photoPreview && (
            <div className="relative rounded-xl overflow-hidden">
              <img src={photoPreview} className="w-full max-h-48 object-cover" alt="preview" />
              <button
                type="button"
                onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}
                className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* File attachment preview */}
          {attachFile && (
            <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <FileText size={16} className="text-brand-600" />
              <span className="text-sm text-slate-600 flex-1 truncate">{attachFile.name}</span>
              <button type="button" onClick={() => setAttachFile(null)}>
                <X size={14} className="text-slate-400" />
              </button>
            </div>
          )}

          {/* Media buttons */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
            <button
              type="button"
              onClick={() => photoRef.current.click()}
              className="btn-ghost text-emerald-600 hover:bg-emerald-50"
            >
              <Image size={16} /> Photo
            </button>
            <button
              type="button"
              onClick={() => fileRef.current.click()}
              className="btn-ghost text-brand-600 hover:bg-brand-50"
            >
              <Paperclip size={16} /> File
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary ml-auto"
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
