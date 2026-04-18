export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-9 w-48 bg-slate-200 rounded" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="h-4 w-24 bg-slate-200 rounded" />
            <div className="h-7 w-32 bg-slate-300 rounded" />
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="h-5 w-40 bg-slate-200 rounded" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 bg-slate-100 rounded" />
        ))}
      </div>
    </div>
  );
}
