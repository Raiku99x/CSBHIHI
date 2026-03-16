import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import PostCard from '../components/PostCard'
import { PostSkeleton, SubjectSkeleton } from '../components/Skeletons'
import {
  BookMarked, BookOpen, Plus, Minus, FileText, Image, Layers,
  ChevronLeft, File, AppWindow, Loader2, Search
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function EnrolledSubjectsPage() {
  const { user } = useAuth()
  const [allSubjects, setAllSubjects] = useState([])
  const [enrolledIds, setEnrolledIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(null)
  const [selected, setSelected] = useState(null) // open subject detail
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: subjects }, { data: enrolled }] = await Promise.all([
        supabase.from('subjects').select('*').order('name'),
        supabase.from('user_subjects').select('subject_id').eq('user_id', user.id),
      ])
      if (subjects) setAllSubjects(subjects)
      if (enrolled) setEnrolledIds(new Set(enrolled.map(e => e.subject_id)))
      setLoading(false)
    }
    if (user) load()
  }, [user])

  async function toggle(subjectId, enrolled) {
    setToggling(subjectId)
    try {
      if (enrolled) {
        await supabase.from('user_subjects').delete()
          .eq('user_id', user.id).eq('subject_id', subjectId)
        setEnrolledIds(prev => { const s = new Set(prev); s.delete(subjectId); return s })
        toast.success('Unenrolled from subject')
        if (selected?.id === subjectId) setSelected(null)
      } else {
        await supabase.from('user_subjects').insert({ user_id: user.id, subject_id: subjectId })
        setEnrolledIds(prev => new Set([...prev, subjectId]))
        toast.success('Enrolled!')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setToggling(null)
    }
  }

  const filtered = allSubjects.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  )

  if (selected) {
    return (
      <SubjectDetail
        subject={selected}
        isEnrolled={enrolledIds.has(selected.id)}
        userId={user.id}
        onBack={() => setSelected(null)}
        onToggle={() => toggle(selected.id, enrolledIds.has(selected.id))}
      />
    )
  }

  return (
    <div className="py-4 space-y-4">
      {/* Header */}
      <div className="card p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
            <BookMarked size={20} className="text-brand-600" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-slate-800">Subjects</h1>
            <p className="text-sm text-slate-400">{enrolledIds.size} enrolled</p>
          </div>
        </div>
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search subjects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
      </div>

      {/* Enrolled */}
      {enrolledIds.size > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">Enrolled</p>
          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => <SubjectSkeleton key={i} />)
            ) : (
              filtered.filter(s => enrolledIds.has(s.id)).map(s => (
                <SubjectCard
                  key={s.id} subject={s} enrolled={true}
                  toggling={toggling === s.id}
                  onToggle={() => toggle(s.id, true)}
                  onClick={() => setSelected(s)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Available */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">
          {enrolledIds.size > 0 ? 'Available to Enroll' : 'All Subjects'}
        </p>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SubjectSkeleton key={i} />)
        ) : filtered.filter(s => !enrolledIds.has(s.id)).length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-400">
            {search ? 'No subjects match your search' : 'You are enrolled in all available subjects'}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.filter(s => !enrolledIds.has(s.id)).map(s => (
              <SubjectCard
                key={s.id} subject={s} enrolled={false}
                toggling={toggling === s.id}
                onToggle={() => toggle(s.id, false)}
                onClick={() => setSelected(s)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SubjectCard({ subject, enrolled, toggling, onToggle, onClick }) {
  const colors = ['bg-brand-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500']
  const color = colors[subject.name.charCodeAt(0) % colors.length]

  return (
    <div className={`card p-4 transition-all ${enrolled ? 'ring-1 ring-brand-200' : ''}`}>
      <div className="flex items-center gap-3">
        <button onClick={onClick} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
            <BookOpen size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm text-slate-800 truncate">{subject.name}</p>
              {enrolled && <span className="badge-green text-[10px]">Enrolled</span>}
            </div>
            {subject.description && (
              <p className="text-xs text-slate-400 truncate mt-0.5">{subject.description}</p>
            )}
          </div>
        </button>
        <button
          onClick={onToggle}
          disabled={toggling}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            enrolled
              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
              : 'bg-brand-50 text-brand-600 hover:bg-brand-100'
          }`}
        >
          {toggling ? <Loader2 size={13} className="animate-spin" /> : enrolled ? <Minus size={13} /> : <Plus size={13} />}
          {enrolled ? 'Leave' : 'Join'}
        </button>
      </div>
    </div>
  )
}

function SubjectDetail({ subject, isEnrolled, userId, onBack, onToggle }) {
  const [activeTab, setActiveTab] = useState('posts')
  const [posts, setPosts] = useState([])
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)

  const colors = ['bg-brand-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500']
  const color = colors[subject.name.charCodeAt(0) % colors.length]

  useEffect(() => {
    async function load() {
      const [{ data: postsData }, { data: appsData }] = await Promise.all([
        supabase.from('posts').select('*, profiles(*), subjects(*)')
          .eq('subject_id', subject.id).order('created_at', { ascending: false }),
        supabase.from('apps').select('*').eq('subject_id', subject.id),
      ])
      if (postsData) setPosts(postsData)
      if (appsData) setApps(appsData)
      setLoading(false)
    }
    load()
  }, [subject.id])

  const tabs = [
    { key: 'posts', label: 'Posts', icon: FileText },
    { key: 'materials', label: 'Materials', icon: Layers },
    { key: 'media', label: 'Media', icon: Image },
    { key: 'files', label: 'Files', icon: File },
    { key: 'apps', label: 'Apps', icon: AppWindow },
  ]

  const materials = posts.filter(p => p.file_url)
  const mediaPosts = posts.filter(p => p.photo_url)
  const filePosts = posts.filter(p => p.file_url)

  function renderTab() {
    if (!isEnrolled) {
      return (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-3">🔒</div>
          <p className="font-semibold text-slate-700">Enroll to access subject content</p>
          <p className="text-sm text-slate-400 mt-1">Join this subject to see posts, files, and more</p>
          <button onClick={onToggle} className="btn-primary mt-4">
            <Plus size={15} /> Enroll Now
          </button>
        </div>
      )
    }
    if (loading) return Array.from({ length: 2 }).map((_, i) => <PostSkeleton key={i} />)

    if (activeTab === 'posts') {
      return posts.length === 0
        ? <EmptyState emoji="📝" text="No posts in this subject yet" />
        : posts.map(p => <PostCard key={p.id} post={p} currentUserId={userId} />)
    }
    if (activeTab === 'materials') {
      return materials.length === 0
        ? <EmptyState emoji="📁" text="No materials uploaded yet" />
        : materials.map(p => <MaterialCard key={p.id} post={p} />)
    }
    if (activeTab === 'media') {
      if (mediaPosts.length === 0) return <EmptyState emoji="🖼️" text="No media shared yet" />
      return (
        <div className="grid grid-cols-3 gap-2">
          {mediaPosts.map(p => (
            <div key={p.id} className="aspect-square rounded-xl overflow-hidden bg-slate-100">
              <img src={p.photo_url} className="w-full h-full object-cover" alt="" />
            </div>
          ))}
        </div>
      )
    }
    if (activeTab === 'files') {
      return filePosts.length === 0
        ? <EmptyState emoji="📎" text="No files attached yet" />
        : filePosts.map(p => <MaterialCard key={p.id} post={p} />)
    }
    if (activeTab === 'apps') {
      return apps.length === 0
        ? <EmptyState emoji="🧩" text="No apps linked to this subject" subtext="N/A" />
        : (
          <div className="grid grid-cols-2 gap-3">
            {apps.map(app => (
              <a key={app.id} href={app.url} target="_blank" rel="noopener noreferrer"
                className="card p-4 hover:shadow-card-hover transition-all flex items-center gap-3">
                {app.icon_url
                  ? <img src={app.icon_url} className="w-10 h-10 rounded-xl" alt={app.name} />
                  : <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
                      <AppWindow size={18} className="text-brand-600" />
                    </div>
                }
                <div>
                  <p className="font-semibold text-sm text-slate-800">{app.name}</p>
                  <p className="text-xs text-slate-400">Open app</p>
                </div>
              </a>
            ))}
          </div>
        )
    }
  }

  return (
    <div className="py-4 space-y-4 animate-fade-in">
      {/* Back + header */}
      <div className="card overflow-hidden">
        <div className={`${color} px-4 py-5 text-white`}>
          <button onClick={onBack} className="flex items-center gap-1.5 text-white/80 hover:text-white text-sm mb-3 transition-colors">
            <ChevronLeft size={16} /> All Subjects
          </button>
          <h1 className="font-display font-bold text-xl">{subject.name}</h1>
          {subject.description && <p className="text-white/70 text-sm mt-1">{subject.description}</p>}
          <div className="flex items-center gap-2 mt-3">
            {isEnrolled
              ? <span className="bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">✓ Enrolled</span>
              : <span className="bg-black/20 text-white/80 text-xs px-2.5 py-1 rounded-full">Not enrolled</span>
            }
            <button onClick={onToggle}
              className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${
                isEnrolled ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-white text-brand-600'
              }`}>
              {isEnrolled ? 'Leave' : 'Join'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto border-t border-slate-100 no-scrollbar">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === key
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="space-y-3">{renderTab()}</div>
    </div>
  )
}

function MaterialCard({ post }) {
  return (
    <a href={post.file_url} target="_blank" rel="noopener noreferrer"
      className="card p-4 flex items-center gap-3 hover:shadow-card-hover transition-all">
      <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
        <FileText size={18} className="text-brand-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-slate-700 truncate">{post.file_name || 'Attachment'}</p>
        <p className="text-xs text-slate-400 truncate mt-0.5">{post.caption}</p>
      </div>
      <File size={15} className="text-slate-400 flex-shrink-0" />
    </a>
  )
}

function EmptyState({ emoji, text, subtext }) {
  return (
    <div className="card p-10 text-center">
      <div className="text-4xl mb-3">{emoji}</div>
      <p className="font-semibold text-slate-700">{text}</p>
      {subtext && <p className="text-sm text-slate-400 mt-1">{subtext}</p>}
    </div>
  )
}
