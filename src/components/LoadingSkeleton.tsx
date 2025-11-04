export default function LoadingSkeleton() {
  return (
    <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl animate-pulse">
      <div className="h-8 bg-slate-700 rounded w-3/4 mb-4"></div>
      <div className="space-y-3 mb-8">
        <div className="h-4 bg-slate-700 rounded w-full"></div>
        <div className="h-4 bg-slate-700 rounded w-5/6"></div>
        <div className="h-4 bg-slate-700 rounded w-4/6"></div>
      </div>
      <div className="h-12 bg-slate-700 rounded w-full"></div>
    </div>
  );
}
