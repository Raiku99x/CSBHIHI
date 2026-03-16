import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import PostCard from '../components/PostCard'
import CreatePostModal from '../components/CreatePostModal'
import { PostSkeleton } from '../components/Skeletons'
import { PenSquare, Rss } from 'lucide-react'

export default function FeedPage() {
  const { user, profile } = useAuth()
  const [posts, setPosts] = useState([])
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(*), subjects(*)')
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setPosts(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPosts()
    supabase.from('subjects').select('*').order('name').then(({ data }) => {
      if (data) setSubjects(data)
    })

    // Realtime subscription
    const channel = supabase
      .channel('feed-posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          // Fetch full post with joins
          const { data } = await supabase
            .from('posts')
            .select('*, profiles(*), subjects(*)')
            .eq('id', payload.new.id)
            .single()
          if (data) setPosts(prev => [data, ...prev])
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchPosts])

  return (
    <div className="py-4 space-y-4">
      {/* Create post prompt */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <img
            src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=U`}
            className="w-10 h-10 rounded-xl object-cover bg-slate-100 flex-shrink-0"
            alt="you"
          />
          <button
            onClick={() => setShowCreate(true)}
            className="flex-1 text-left px-4 py-2.5 rounded-xl bg-slate-100 text-slate-400 text-sm hover:bg-slate-200 transition-colors"
          >
            What's on your mind, {profile?.display_name?.split(' ')[0] || 'there'}?
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex-shrink-0">
            <PenSquare size={15} /> Post
          </button>
        </div>
      </div>

      {/* Feed header */}
      <div className="flex items-center gap-2 px-1">
        <Rss size={16} className="text-brand-500" />
        <span className="text-sm font-semibold text-slate-600">All Posts</span>
        {!loading && <span className="badge-slate ml-auto">{posts.length}</span>}
      </div>

      {/* Posts */}
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => <PostSkeleton key={i} />)
      ) : posts.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-semibold text-slate-700">No posts yet</p>
          <p className="text-sm text-slate-400 mt-1">Be the first to share something!</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
            <PenSquare size={15} /> Create Post
          </button>
        </div>
      ) : (
        posts.map(post => (
          <PostCard key={post.id} post={post} currentUserId={user?.id} />
        ))
      )}

      {showCreate && (
        <CreatePostModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {}}
          subjects={subjects}
        />
      )}
    </div>
  )
}
