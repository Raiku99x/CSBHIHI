import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  X, Image, Paperclip, ChevronDown, Loader2,
  Megaphone, FileText, Plus
} from 'lucide-react'
import toast from 'react-hot-toast'

const MAX_PHOTOS = 20
const MAX_FILES  = 10

export default function CreatePostModal({ onClose, onCreated, subjects }) {
  const { user, profile } = useAuth()
  const [form, setForm] = useState({
    caption: '', subject_id: '', post_type: 'status', due_date: ''
  })

  /* multi-photo state */
  const [photoFiles,    setPhotoFiles]    = useState([])   // File[]
  const [photoPreviews, setPhotoPreviews] = useState([])   // object URLs[]

  /* multi-file state */
  const [attachFiles, setAttachFiles] = useState([])       // File[]

  const [loading, setLoading] = useState(false)
  const photoRef = useRef()
  const fileRef  = useRef()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  /* ── photo handlers ────────────────────────────────────────── */
  function handlePhoto(e) {
    const chosen    = Array.from(e.target.files || [])
    const remaining = MAX_PHOTOS - photoFiles.length
    if (remaining <= 0) { toast.error(`Max ${MAX_PHOTOS} photos allowed`); return }
    const toAdd = chosen.slice(0, remaining)
    if (chosen.length > remaining) toast(`Only added ${remaining} photo${remaining !== 1 ? 's' : ''} (limit reached)`, { icon: '⚠️' })
    setPhotoFiles(prev  => [...prev, ...toAdd])
    setPhotoPreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))])
    e.target.value = '' // reset so the same file can be re-selected
  }

  function removePhoto(idx) {
    URL.revokeObjectURL(photoPreviews[idx])
    setPhotoFiles(prev    => prev.filter((_, i) => i !== idx))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  function clearPhotos() {
    photoPreviews.forEach(u => URL.revokeObjectURL(u))
    setPhotoFiles([])
    setPhotoPreviews([])
  }

  /* ── file handlers ─────────────────────────────────────────── */
  function handleFile(e) {
    const chosen    = Array.from(e.target.files || [])
    const remaining = MAX_FILES - attachFiles.length
    if (remaining <= 0) { toast.error(`Max ${MAX_FILES} files allowed`); return }
    const toAdd = chosen.slice(0, remaining)
    if (chosen.length > remaining) toast(`Only added ${remaining} file${remaining !== 1 ? 's' : ''} (limit reached)`, { icon: '⚠️' })
    setAttachFiles(prev => [...prev, ...toAdd])
    e.target.value = ''
  }

  function removeFile(idx) {
    setAttachFiles(prev => prev.filter((_, i) => i !== idx))
  }

  /* ── upload helper ─────────────────────────────────────────── */
  async function uploadFile(file, bucket) {
    const ext  = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from(bucket).upload(path, file)
    if (error) throw error
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  /* ── submit ────────────────────────────────────────────────── */
  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.caption.trim() && photoFiles.length === 0) {
      toast.error('Add a caption or at least one photo')
      return
    }
    setLoading(true)
    try {
      /* upload photos in parallel */
      let photo_url  = null
      if (photoFiles.length > 0) {
        const urls = await Promise.all(photoFiles.map(f => uploadFile(f, 'post-media')))
        photo_url  = JSON.stringify(urls)          // JSON array stored in text column
      }

      /* upload attachments in parallel */
      let file_url  = null
      let file_name = null
      if (attachFiles.length > 0) {
        const results = await Promise.all(
          attachFiles.map(f => uploadFile(f, 'post-media').then(url => ({ url, name: f.name })))
        )
        file_url  = JSON.stringify(results.map(r => r.url))
        file_name = JSON.stringify(results.map(r => r.name))
      }

      const postData = {
        author_id:  user.id,
        subject_id: form.subject_id || null,
        caption:    form.caption.trim(),
        photo_url,
        file_url,
        file_name,
        post_type:  form.post_type,
        due_date:   form.post_type === 'announcement' && form.due_date ? form.due_date : null,
      }

      const { data: post, error } = await supabase
        .from('posts')
        .insert(postData)
        .select('*, profiles(*), subjects(*)')
        .single()

      if (error) throw error

      /* announce notifications */
      if (form.post_type === 'announcement' && form.subject_id) {
        const { data: enrolled } = await supabase
          .from('user_subjects')
          .select('user_id')
          .eq('subject_id', form.subject_id)
          .neq('user_id', user.id)

        if (enrolled?.length) {
          const notifs = enrolled.map(e => ({
            user_id:  e.user_id,
            post_id:  post.id,
            type:     'announcement',
            message:  `📢 New announcement in ${post.subjects?.name || 'a subject'}: "${form.caption.slice(0, 60)}${form.caption.length > 60 ? '…' : ''}"`,
            is_read:  false,
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

  /* ── render ────────────────────────────────────────────────── */
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
            rows={3}
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

          {/* ── Photo previews grid ──────────────────────────── */}
          {photoPreviews.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-slate-500">
                  {photoPreviews.length} / {MAX_PHOTOS} photos
                </p>
                <button
                  type="button"
                  onClick={clearPhotos}
                  className="text-xs text-rose-500 hover:text-rose-600 font-medium"
                >
                  Remove all
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {photoPreviews.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                    <img src={url} className="w-full h-full object-cover" alt={`preview ${i + 1}`} />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}

                {/* Add more slot */}
                {photoPreviews.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => photoRef.current.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-brand-400 hover:text-brand-400 transition-colors"
                  >
                    <Plus size={20} />
                    <span className="text-[10px] font-medium">Add</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── File attachment list ─────────────────────────── */}
          {attachFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500">{attachFiles.length} / {MAX_FILES} files</p>
              {attachFiles.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200"
                >
                  <FileText size={15} className="text-brand-600 flex-shrink-0" />
                  <span className="text-sm text-slate-600 flex-1 truncate">{file.name}</span>
                  <button type="button" onClick={() => removeFile(i)}>
                    <X size={14} className="text-slate-400 hover:text-rose-400 transition-colors" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Hidden inputs */}
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhoto}
          />
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFile}
          />

          {/* Media buttons + submit */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            {/* Photo button */}
            <button
              type="button"
              onClick={() => photoRef.current.click()}
              disabled={photoFiles.length >= MAX_PHOTOS}
              className={`btn-ghost transition-colors ${
                photoFiles.length >= MAX_PHOTOS
                  ? 'opacity-40 cursor-not-allowed'
                  : 'text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              <Image size={16} />
              Photos
              {photoFiles.length > 0 && (
                <span className="ml-0.5 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">
                  {photoFiles.length}
                </span>
              )}
            </button>

            {/* File button */}
            <button
              type="button"
              onClick={() => fileRef.current.click()}
              disabled={attachFiles.length >= MAX_FILES}
              className={`btn-ghost transition-colors ${
                attachFiles.length >= MAX_FILES
                  ? 'opacity-40 cursor-not-allowed'
                  : 'text-brand-600 hover:bg-brand-50'
              }`}
            >
              <Paperclip size={16} />
              Files
              {attachFiles.length > 0 && (
                <span className="ml-0.5 text-xs bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full font-semibold">
                  {attachFiles.length}
                </span>
              )}
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
