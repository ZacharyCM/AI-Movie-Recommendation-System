export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <h1 className="text-3xl font-bold text-red-600 mb-8">NetflixRecs</h1>
      {children}
    </div>
  );
}
