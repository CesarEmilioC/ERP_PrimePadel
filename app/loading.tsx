export default function Loading() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="flex items-center gap-3 text-muted-foreground">
        <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.2" strokeWidth="4" />
          <path d="M22 12a10 10 0 0 1-10 10" stroke="#FF8C42" strokeWidth="4" strokeLinecap="round" />
        </svg>
        <span className="text-sm">Cargando...</span>
      </div>
    </div>
  );
}
