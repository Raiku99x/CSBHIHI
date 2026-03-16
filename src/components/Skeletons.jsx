export function PostSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl shimmer flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-32 rounded-full shimmer" />
          <div className="h-2.5 w-20 rounded-full shimmer" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded-full shimmer" />
        <div className="h-3 w-4/5 rounded-full shimmer" />
        <div className="h-3 w-3/5 rounded-full shimmer" />
      </div>
    </div>
  )
}

export function SubjectSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="h-4 w-2/3 rounded-full shimmer" />
      <div className="h-3 w-full rounded-full shimmer" />
      <div className="h-8 w-24 rounded-xl shimmer mt-2" />
    </div>
  )
}
