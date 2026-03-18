import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import PostCard from '../components/PostCard'
import { PostSkeleton } from '../components/Skeletons'
import { Megaphone } from 'lucide-react'

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past Due' },
]

export default function AnnouncementsPage() {
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    async function fetch() {
      const { data: enrolled } = await supabase
        .from('user_subjects').select('subject_id').eq('user_id', user.id)
      const subjectIds = enrolled?.map(e => e.subject_id) || []

      let query = supabase
        .from('posts').select('*, profiles(*), subjects(*)')
        .eq('post_type', 'announcement')
        .order('created_at', { ascending: false })

      if (subjectIds.length > 0) {
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
    if (filter === 'upcoming') return !a.due_date || new Date(a.due_date) >= now
    if (filter === 'past') return a.due_date && new Date(a.due_date) < now
    return true
  })

  return (
    <div style={{ paddingTop: 12 }}>

      {/* ── Header card ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0D7377 0%, #0A5C60 100%)',
        borderRadius: 12, padding: '20px 20px 18px',
        marginBottom: 8, display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Megaphone size={24} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 800, fontSize: 20, color: 'white' }}>
            Announcements
          </p>
          <p style={{ margin: '2px 0 0', fontFamily: '"Instrument Sans", system-ui', fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
            From your enrolled subjects
          </p>
        </div>
        {!loading && (
          <span style={{
            background: 'rgba(255,255,255,0.2)', color: 'white',
            fontFamily: '"Instrument Sans", system-ui', fontWeight: 700, fontSize: 13,
            padding: '4px 12px', borderRadius: 20,
          }}>
            {filtered.length}
          </span>
        )}
      </div>

      {/* ── Filter tabs ── */}
      <div style={{
        background: 'white', borderRadius: 12,
        border: '1px solid #DADDE1', marginBottom: 8,
        display: 'flex', padding: 6, gap: 4,
      }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontFamily: '"Instrument Sans", system-ui', fontWeight: 600, fontSize: 14,
              background: filter === f.key ? '#0D7377' : 'transparent',
              color: filter === f.key ? 'white' : '#65676B',
              transition: 'all 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[0, 1].map(i => <PostSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          emoji="📭"
          title="No announcements"
          subtitle={announcements.length === 0
            ? 'Enroll in subjects to see their announcements'
            : 'No announcements match this filter'}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(post => <PostCard key={post.id} post={post} currentUserId={user?.id} />)}
        </div>
      )}
    </div>
  )
}

function EmptyState({ emoji, title, subtitle }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12, border: '1px solid #DADDE1',
      padding: '48px 24px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 44, marginBottom: 10 }}>{emoji}</div>
      <p style={{ margin: '0 0 6px', fontFamily: '"Bricolage Grotesque", system-ui', fontWeight: 700, fontSize: 17, color: '#050505' }}>
        {title}
      </p>
      <p style={{ margin: 0, fontFamily: '"Instrument Sans", system-ui', fontSize: 14, color: '#65676B' }}>
        {subtitle}
      </p>
    </div>
  )
}
