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
    const urls  = JSON.parse(file_url)
    const names = file_name ? JSON.parse(file_name) : []
    if (Array.isArray(urls)) {
      return urls.map((url, i) => ({ url, name: names[i] || 'Attachment' }))
    }
    return [{ url: file_url, name: file_name || 'Attachment' }]
  } catch {
    return [{ url: file_url, name: file_name || 'Attachment' }]
  }
}

/* ─── Lightbox — vertical scroll, Facebook-style ───────────── */
function Lightbox({ photos, initialIndex, onClose }) {
  const [activeIdx, setActiveIdx] = useState(initialIndex)
  const scrollRef = useRef(null)
  const itemRefs  = useRef([])

  /* lock body scroll */
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  /* jump to clicked photo instantly on open */
  useEffect(() => {
    const el = itemRefs.current[initialIndex]
    if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' })
  }, [initialIndex])

  /* track which photo is most centred as user scrolls */
  function handleScroll() {
    if (!scrollRef.current) return
    const center = scrollRef.current.scrollTop + scrollRef.current.clientHeight / 2
    let closest = 0, closestDist = Infinity
    itemRefs.current.forEach((el, i) => {
      if (!el) return
      const dist = Math.abs(el.offsetTop + el.offsetHeight / 2 - center)
      if (dist < closestDist) { closestDist = dist; closest = i }
    })
    setActiveIdx(closest)
  }

  function goTo(idx) {
    const el = itemRefs.current[idx]
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    setActiveIdx(idx)
  }

  /* keyboard nav */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape')    onClose()
      if (e.key === 'ArrowDown') goTo(Math.min(activeIdx + 1, photos.length - 1))
      if (e.key === 'ArrowUp')   goTo(Math.max(activeIdx - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeIdx, photos.length])

  return (
    <div className="fixed inset-0 z-[200] flex bg-slate-50">

      {/* Close */}
      <button onClick={onClose}
        className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors">
        <X size={20} />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white border border-slate-200 text-slate-600 text-sm font-medium px-3 py-1 rounded-full pointer-events-none select-none shadow-sm">
        {activeIdx + 1} / {photos.length}
      </div>

      {/* Up / Down arrows */}
      {photos.length > 1 && (
        <>
          <button onClick={() => goTo(Math.max(activeIdx - 1, 0))}
            disabled={activeIdx === 0}
            className="absolute left-1/2 -translate-x-1/2 top-14 z-20 p-2.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 shadow-sm transition-colors disabled:opacity-20">
            <ChevronLeft size={20} style={{ transform: 'rotate(90deg)' }} />
          </button>
          <button onClick={() => goTo(Math.min(activeIdx + 1, photos.length - 1))}
            disabled={activeIdx === photos.length - 1}
            className="absolute left-1/2 -translate-x-1/2 bottom-6 z-20 p-2.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 shadow-sm transition-colors disabled:opacity-20">
            <ChevronLeft size={20} style={{ transform: 'rotate(270deg)' }} />
          </button>
        </>
      )}

      {/* ── Vertically scrollable photo list ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto flex flex-col items-center gap-4 py-16 px-4"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,0,0,0.15) transparent' }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        {photos.map((url, i) => (
          <div
            key={i}
            ref={el => (itemRefs.current[i] = el)}
            className="w-full max-w-2xl flex-shrink-0 transition-all duration-300"
            style={{
              opacity:   i === activeIdx ? 1    : 0.4,
              transform: i === activeIdx ? 'scale(1)' : 'scale(0.96)',
            }}
          >
            <img
              src={url}
              alt={`Photo ${i + 1}`}
              className="w-full rounded-2xl object-contain select-none shadow-md border border-slate-100"
              style={{ maxHeight: '80vh' }}
              draggable={false}
              loading="lazy"
            />
          </div>
        ))}
        {/* bottom padding so last photo can centre */}
        <div style={{ height: '40vh', flexShrink: 0 }} />
      </div>

      {/* ── Thumbnail sidebar (visible on sm+) ── */}
      {photos.length > 1 && (
        <div
          className="hidden sm:flex flex-col gap-2 w-[72px] py-16 pr-2 overflow-y-auto flex-shrink-0"
          style={{ scrollbarWidth: 'none' }}
        >
          {photos.map((url, i) => (
            <button key={i} onClick={() => goTo(i)}
              className={`flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden border-2 transition-all mx-auto block ${
                i === activeIdx
                  ? 'border-brand-500 opacity-100 scale-105'
                  : 'border-slate-200 opacity-50 hover:opacity-80'
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

  if (count === 1) {
    return (
      <div className="overflow-hidden bg-slate-100 cursor-pointer" onClick={() => onPhotoClick(0)}>
        <img src={display[0]} alt="post" className="w-full max-h-80 object-cover hover:brightness-90 transition-[filter] duration-200" loading="lazy" />
      </div>
    )
  }

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

  if (count === 3) {
    return (
      <div className="bg-slate-100" style={{
        display: 'grid', gridTemplateColumns: '2fr 1fr',
        gridTemplateRows: 'repeat(2, 1fr)', gap: 2, height: 280,
      }}>
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

  if (count === 4) {
    return (
      <div className="grid grid-cols-2 gap-0.5 bg-slate-100" style={{ height: 300, gridTemplateRows: '1fr 1fr' }}>
        {display.map((url, i) => (
          <div key={i} className="overflow-hidden" onClick={() => onPhotoClick(i)}>
            <img src={url} className={imgCls} loading="lazy" alt={`Photo ${i + 1}`} />
          </div>
        ))}
      </div>
    )
  }

  /* 5+ */
  return (
    <div className="bg-slate-100 flex flex-col gap-0.5" style={{ height: 360 }}>
      <div className="grid grid-cols-2 gap-0.5" style={{ flex: '1.3' }}>
        {display.slice(0, 2).map((url, i) => (
          <div key={i} className="overflow-hidden" onClick={() => onPhotoClick(i)}>
            <img src={url} className={imgCls} loading="lazy" alt={`Photo ${i + 1}`} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-0.5" style={{ flex: '1' }}>
        {display.slice(2, 5).map((url, i) => (
          <div key={i} className="overflow-hidden relative" onClick={() => onPhotoClick(i + 2)}>
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
  const [liked, setLiked]               = useState(false)
  const [likeCount, setLikeCount]       = useState(0)
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

        {photos.length > 0 && (
          <div className="mb-3 overflow-hidden">
            <PhotoGrid photos={photos} onPhotoClick={setLightboxIndex} />
          </div>
        )}

        <div className="px-4 pb-4">
          {files.length > 0 && (
            <div className="space-y-2 mb-3">
              {files.map((file, i) => (
                <a key={i} href={file.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
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

          <div className="flex items-center gap-1 pt-1 border-t border-slate-100 mt-1">
            <button onClick={toggleLike}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                liked ? 'text-rose-500 bg-rose-50' : 'text-slate-500 hover:bg-slate-100'
              }`}>
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
