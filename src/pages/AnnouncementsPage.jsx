import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import PostCard from '../components/PostCard'
import { PostSkeleton } from '../components/Skeletons'
import { Megaphone, Filter } from 'lucide-react'

export default function AnnouncementsPage() {
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | upcoming | past

  useEffect(() => {
    async function fetch() {
      // Get enrolled subject IDs
      const { data: enrolled } = await supabase
        .from('user_subjects')
        .select('subject_id')
        .eq('user_id', user.id)

      const subjectIds = enrolled?.map(e => e.subject_id) || []

      let query = supabase
        .from('posts')
        .select('*, profiles(*), subjects(*)')
        .eq('post_type', 'announcement')
        .order('created_at', { ascending: false })

      if (subjectIds.length > 0) {
        // Show announcements from enrolled subjects OR general (no subject)
        query = query.or(`subject_id.in.(${subjectIds.join(',')}),subject_id.is.null`)
      } else {
        query = query.is('subject_id', null)
      }

      const { data } = await query
      if (data) setAnnouncements(data)
      setLoading(false)
    }
    if (user) fetch()
  }, [user])

  const now = new Date()
  const filtered = announcements.filter(a => {
    if (filter === 'all') return true
    if (filter === 'upcoming') return !a.due_date || new Date(a.due_date) >= now
    if (filter === 'past') return a.due_date && new Date(a.due_date) < now
    return true
  })

  return (
    <div className="py-4 space-y-4">
      {/* Header */}
      <div className="card p-4 bg-gradient-to-r from-brand-600 to-violet-600 text-white border-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Megaphone size={20} />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg">Announcements</h1>
            <p className="text-white/70 text-sm">From your enrolled subjects</p>
          </div>
          {!loading && (
            <span className="ml-auto bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {filtered.length}
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex p-1 bg-white rounded-xl border border-slate-100 shadow-sm">
        {[
          { key: 'all', label: 'All' },
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'past', label: 'Past Due' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f.key ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        Array.from({ length: 2 }).map((_, i) => <PostSkeleton key={i} />)
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-semibold text-slate-700">No announcements</p>
          <p className="text-sm text-slate-400 mt-1">
            {announcements.length === 0
              ? 'Enroll in subjects to see their announcements'
              : 'No announcements match this filter'}
          </p>
        </div>
      ) : (
        filtered.map(post => (
          <PostCard key={post.id} post={post} currentUserId={user?.id} />
        ))
      )}
    </div>
  )
}
