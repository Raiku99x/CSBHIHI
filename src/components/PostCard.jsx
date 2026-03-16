import { useState, useEffect, useRef } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import {
  FileText, Download, Calendar, BookOpen, Megaphone,
  Heart, MessageCircle, Share2, X, ChevronLeft, ChevronRight
} from 'lucide-react'

/* ─── helpers ──────────────────────────────────────────────── */
function parsePhotos(photo_url) {
  if (!photo_url) return []
  try {
    const parsed = JSON.parse(photo_url)
    return Array.isArray(parsed) ? parsed : [photo_url]
  } catch {
    return [photo_url]
  }
}

function parseFiles(file_url, file_name) {
  if (!file_url) return []
  try {
    const urls = JSON.parse(file_url)
    const names = file_name ? JSON.parse(file_name) : []
    if (Array.isArray(urls)) {
      return urls.map((url, i) => ({ url, name: names[i] || 'Attachment' }))
    }
    return [{ url: file_url, name: file_name || 'Attachment' }]
  } catch {
    return [{ url: file_url, name: file_name || 'Attachment' }]
  }
}

/* ─── Lightbox ──────────────────────────────────────────────── */
function Lightbox({ photos, initialIndex, onClose }) {
  const [idx, setIdx] = useState(initialIndex)
  const touchStartX = useRef(null)

  const prev = () => setIdx(i => (i - 1 + photos.length) % photos.length)
  const next = () => setIdx(i => (i + 1) % photos.length)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape')     onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* lock body scroll */
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function onTouchStart(e) { touchStartX.current = e.touches[0].clientX }
  function onTouchEnd(e) {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev()
    touchStartX.current = null
  }

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/96 flex items-center justify-center"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
      >
        <X size={20} />
      </button>

      {/* counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full select-none pointer-events-none">
        {idx + 1} / {photos.length}
      </div>

      {/* main image */}
      <div
        className="relative max-w-4xl w-full h-full flex items-center justify-center p-4 sm:p-12"
        onClick={e => e.stopPropagation()}
      >
        <img
          key={idx}
          src={photos[idx]}
          className="max-h-[80vh] max-w-full object-contain rounded-xl select-none animate-fade-in"
          alt={`Photo ${idx + 1}`}
          draggable={false}
        />

        {/* prev / next */}
        {photos.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={next}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>

      {/* thumbnail strip */}
      {photos.length > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 px-2 max-w-sm overflow-x-auto"
          onClick={e => e.stopPropagation()}
        >
          {photos.map((url, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`flex-shrink-0 w-11 h-11 rounded-lg overflow-hidden border-2 transition-all ${
                i === idx ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-75'
              }`}
            >
              <img src={url} className="w-full h-full object-cover" alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Facebook-style Photo Grid ─────────────────────────────── */
const MAX_DISPLAY = 5

function PhotoGrid({ photos, onPhotoClick }) {
  const display   = photos.slice(0, MAX_DISPLAY)
  const remaining = photos.length - MAX_DISPLAY
  const count     = display.length

  const imgCls = 'w-full h-full object-cover cursor-pointer hover:brightness-90 transition-[filter] duration-200'

  /* ── 1 photo ── */
  if (count === 1) {
    return (
      <div
        className="overflow-hidden bg-slate-100 cursor-pointer"
        onClick={() => onPhotoClick(0)}
      >
        <img src={display[0]} alt="post" className="w-full max-h-80 object-cover hover:brightness-90 transition-[filter] duration-200" loading="lazy" />
      </div>
    )
  }

  /* ── 2 photos ── equal columns */
  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5 bg-slate-100" style={{ height: 260 }}>
        {display.map((url, i) => (
          <div key={i} className="overflow-hidden" onClick={() => onPhotoClick(i)}>
            <img src={url} className={imgCls} loading="lazy" alt={`Photo ${i + 1}`} />
          </div>
        ))}
      </div>
    )
  }

  /* ── 3 photos ── 1 large left, 2 stacked right */
  if (count === 3) {
    return (
      <div
        className="bg-slate-100"
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gridTemplateRows: 'repeat(2, 1fr)',
          gap: 2,
          height: 280,
        }}
      >
        <div style={{ gridRow: '1 / 3' }} className="overflow-hidden" onClick={() => onPhotoClick(0)}>
          <img src={display[0]} className={imgCls} loading="lazy" alt="Photo 1" />
        </div>
        {display.slice(1).map((url, i) => (
          <div key={i} className="overflow-hidden" onClick={() => onPhotoClick(i + 1)}>
            <img src={url} className={imgCls} loading="lazy" alt={`Photo ${i + 2}`} />
          </div>
        ))}
      </div>
    )
  }

  /* ── 4 photos ── 2×2 grid */
  if (count === 4) {
    return (
      <div
        className="grid grid-cols-2 gap-0.5 bg-slate-100"
        style={{ height: 300, gridTemplateRows: '1fr 1fr' }}
      >
        {display.map((url, i) => (
          <div key={i} className="overflow-hidden" onClick={() => onPhotoClick(i)}>
            <img src={url} className={imgCls} loading="lazy" alt={`Photo ${i + 1}`} />
          </div>
        ))}
      </div>
    )
  }

  /* ── 5+ photos ── 2 top row, 3 bottom row; last slot shows +N */
  return (
    <div className="bg-slate-100 flex flex-col gap-0.5" style={{ height: 360 }}>
      {/* top 2 */}
      <div className="grid grid-cols-2 gap-0.5" style={{ flex: '1.3' }}>
        {display.slice(0, 2).map((url, i) => (
          <div key={i} className="overflow-hidden" onClick={() => onPhotoClick(i)}>
            <img src={url} className={imgCls} loading="lazy" alt={`Photo ${i + 1}`} />
          </div>
        ))}
      </div>
      {/* bottom 3 */}
      <div className="grid grid-cols-3 gap-0.5" style={{ flex: '1' }}>
        {display.slice(2, 5).map((url, i) => (
          <div
            key={i}
            className="overflow-hidden relative"
            onClick={() => onPhotoClick(i + 2)}
          >
            <img src={url} className={imgCls} loading="lazy" alt={`Photo ${i + 3}`} />
            {i === 2 && remaining > 0 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer">
                <span className="text-white font-bold text-2xl select-none">+{remaining}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── PostCard ───────────────────────────────────────────────── */
export default function PostCard({ post, currentUserId }) {
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState(null)

  const isAnnouncement = post.post_type === 'announcement'
  const photos = parsePhotos(post.photo_url)
  const files  = parseFiles(post.file_url, post.file_name)

  function toggleLike() {
    setLiked(l => !l)
    setLikeCount(c => liked ? c - 1 : c + 1)
  }

  return (
    <>
      <article className={`card animate-fade-in overflow-hidden ${isAnnouncement ? 'ring-1 ring-brand-200' : ''}`}>
        {/* Announcement banner */}
        {isAnnouncement && (
          <div className="bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-2 flex items-center gap-2">
            <Megaphone size={14} className="text-white/90" />
            <span className="text-white text-xs font-semibold tracking-wide uppercase">Announcement</span>
            {post.due_date && (
              <span className="ml-auto text-white/80 text-xs flex items-center gap-1">
                <Calendar size={11} /> Due: {format(new Date(post.due_date), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        )}

        {/* Author + caption */}
        <div className="p-4 pb-0">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={post.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${post.profiles?.display_name || 'U'}&backgroundColor=4f46e5&textColor=ffffff`}
              alt={post.profiles?.display_name}
              className="w-9 h-9 rounded-xl object-cover bg-slate-100 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-800">{post.profiles?.display_name || 'Unknown'}</span>
                {post.subjects && (
                  <span className="badge-indigo flex items-center gap-1">
                    <BookOpen size={10} />{post.subjects.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
            {!isAnnouncement && <span className="badge-slate">Status</span>}
          </div>

          {post.caption && (
            <p className="text-sm text-slate-700 leading-relaxed mb-3 whitespace-pre-wrap">{post.caption}</p>
          )}
        </div>

        {/* Photo grid — full card width, no side padding */}
        {photos.length > 0 && (
          <div className="mb-3 overflow-hidden">
            <PhotoGrid photos={photos} onPhotoClick={setLightboxIndex} />
          </div>
        )}

        {/* Files + actions */}
        <div className="px-4 pb-4">
          {files.length > 0 && (
            <div className="space-y-2 mb-3">
              {files.map((file, i) => (
                <a
                  key={i}
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">Click to open</p>
                  </div>
                  <Download size={15} className="text-slate-400 flex-shrink-0" />
                </a>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1 pt-1 border-t border-slate-100 mt-1">
            <button
              onClick={toggleLike}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                liked ? 'text-rose-500 bg-rose-50' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
              {likeCount > 0 && <span className="text-xs font-medium">{likeCount}</span>}
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:bg-slate-100 transition-colors">
              <MessageCircle size={15} />
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:bg-slate-100 transition-colors ml-auto">
              <Share2 size={15} />
            </button>
          </div>
        </div>
      </article>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  )
}
