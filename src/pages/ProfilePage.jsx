import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { User, Camera, Loader2, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, profile, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [saving, setSaving] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    if (!displayName.trim()) { toast.error('Name cannot be empty'); return }
    setSaving(true)
    try {
      const newAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}&backgroundColor=4f46e5&textColor=ffffff`
      await updateProfile({ display_name: displayName.trim(), avatar_url: newAvatar })
      toast.success('Profile updated!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="py-4 space-y-4">
      <button onClick={() => navigate(-1)} className="btn-ghost">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="card p-6">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="relative">
            <img
              src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=U`}
              className="w-20 h-20 rounded-2xl object-cover bg-slate-100"
              alt="avatar"
            />
          </div>
          <div className="text-center">
            <p className="font-display font-bold text-xl text-slate-800">{profile?.display_name}</p>
            <p className="text-sm text-slate-400">{profile?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wide">Display Name</label>
            <input
              type="text"
              className="input"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your display name"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1.5 block uppercase tracking-wide">Email</label>
            <input type="email" className="input bg-slate-50" value={profile?.email || ''} disabled />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
            {saving && <Loader2 size={15} className="animate-spin" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}
