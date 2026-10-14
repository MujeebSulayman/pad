import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="glass max-w-[420px] rounded-[30px] p-8 text-center" data-lg="surface" data-lg-r="30" data-lg-tint="card">
        <p className="label">404</p>
        <h1 className="mt-3 text-[32px] leading-tight">Nothing launched here.</h1>
        <Link href="/" className="btn btn-white mt-6">
          Back to MirrorPad
        </Link>
      </div>
    </main>
  );
}
