import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="panel max-w-md rounded-[32px] border border-white/70 p-8 text-center shadow-panel">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-tea-700">
          Not Found
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-stone-900">页面不存在</h1>
        <p className="mt-3 text-sm leading-7 text-stone-600">
          当前访问的页面不存在，或者你没有权限查看它。
        </p>
        <Link className="mt-6 inline-flex text-sm font-medium text-tea-700 hover:underline" href="/">
          返回首页
        </Link>
      </div>
    </div>
  );
}

