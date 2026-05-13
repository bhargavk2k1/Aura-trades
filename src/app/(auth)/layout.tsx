export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {children}
    </div>
  );
}
