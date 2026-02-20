export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark transition-colors duration-500">
      <main className="mx-auto w-full max-w-6xl p-6 md:p-10">{children}</main>
    </div>
  );
}