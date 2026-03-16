import { useState } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { FileText, Download, Calendar, BookOpen, Megaphone, Heart, MessageCircle, Share2 } from 'lucide-react'

export default function PostCard({ post, currentUserId }) {
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const isAnnouncement = post.post_type === 'announcement'

  function toggleLike() {
    setLiked(l => !l)
    setLikeCount(c => liked ? c - 1 : c + 1)
  }

  return (
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

      <div className="p-4">
        {/* Author row */}
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

        {/* Caption */}
        {post.caption && (
          <p className="text-sm text-slate-700 leading-relaxed mb-3 whitespace-pre-wrap">{post.caption}</p>
        )}

        {/* Photo */}
        {post.photo_url && (
          <div className="mb-3 -mx-0 rounded-xl overflow-hidden bg-slate-100">
            <img
              src={post.photo_url}
              alt="post"
              className="w-full max-h-80 object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* File attachment */}
        {post.file_url && (
          <a
            href={post.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors mb-3"
          >
            <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
              <FileText size={16} className="text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">
                {post.file_name || 'Attachment'}
              </p>
              <p className="text-xs text-slate-400">Click to open</p>
            </div>
            <Download size={15} className="text-slate-400 flex-shrink-0" />
          </a>
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
  )
}
