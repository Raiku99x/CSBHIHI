import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Grid3X3, ExternalLink, AppWindow } from 'lucide-react'

export default function AppsPage() {
  const { user } = useAuth()
  const [grouped, setGrouped] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: enrolled } = await supabase
        .from('user_subjects')
        .select('subject_id, subjects(*)')
        .eq('user_id', user.id)

      if (!enrolled?.length) { setLoading(false); return }

      const subjectIds = enrolled.map(e => e.subject_id)
      const { data: apps } = await supabase
        .from('apps')
        .select('*, subjects(*)')
        .in('subject_id', subjectIds)

      // Group by subject
      const groups = enrolled.map(e => ({
        subject: e.subjects,
        apps: apps?.filter(a => a.subject_id === e.subject_id) || [],
      }))
      setGrouped(groups)
      setLoading(false)
    }
    if (user) load()
  }, [user])

  const totalApps = grouped.reduce((n, g) => n + g.apps.length, 0)

  return (
    <div className="py-4 space-y-4">
      {/* Header */}
      <div className="card p-4 bg-gradient-to-r from-slate-800 to-slate-700 text-white border-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Grid3X3 size={20} />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg">Apps</h1>
            <p className="text-white/60 text-sm">Tools from your subjects</p>
          </div>
          {!loading && (
            <span className="ml-auto bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {totalApps} apps
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card p-4 space-y-3">
              <div className="h-4 w-1/3 rounded-full shimmer" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-16 rounded-xl shimmer" />
                <div className="h-16 rounded-xl shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-3">🧩</div>
          <p className="font-semibold text-slate-700">No apps available</p>
          <p className="text-sm text-slate-400 mt-1">Enroll in subjects to see their linked apps</p>
        </div>
      ) : (
        grouped.map(({ subject, apps }) => (
          <div key={subject.id} className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <p className="font-semibold text-sm text-slate-700">{subject.name}</p>
            </div>
            {apps.length === 0 ? (
              <p className="text-sm text-slate-400 px-4 py-4 italic">N/A — No apps linked to this subject</p>
            ) : (
              <div className="p-4 grid grid-cols-2 gap-3">
                {apps.map(app => (
                  <a
                    key={app.id}
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all group"
                  >
                    {app.icon_url
                      ? <img src={app.icon_url} className="w-9 h-9 rounded-xl flex-shrink-0" alt={app.name} />
                      : <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center flex-shrink-0">
                          <AppWindow size={18} className="text-brand-600" />
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-800 truncate">{app.name}</p>
                    </div>
                    <ExternalLink size={13} className="text-slate-300 group-hover:text-brand-400 transition-colors flex-shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
