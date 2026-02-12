import Navbar from "@/components/layout/Navbar";

export default function BrowseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="pt-16 px-4 md:px-8 py-6">{children}</main>
    </>
  );
}
