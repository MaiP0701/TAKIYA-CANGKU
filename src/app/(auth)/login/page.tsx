import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms/login-form";
import { getSessionUser } from "@/lib/auth/session";

export default async function LoginPage() {
  const user = await getSessionUser();

  if (user) {
    redirect("/");
  }

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[36px] border border-white/60 bg-gradient-to-br from-stone-900 via-tea-700 to-tea-500 p-8 text-white shadow-panel sm:p-10">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/70">
              Responsive Web App
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl">
              适合门店与仓库协同的奶茶店库存管理系统
            </h1>
            <p className="mt-6 text-base leading-7 text-white/80 sm:text-lg">
              第一版聚焦库存台账、出入库、调拨、盘点和预警。手机端可快速操作，桌面端可集中查看整体库存。
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ["多地点库存", "神田店 / 上野店 / 总仓"],
              ["低库存预警", "按地点高亮缺货风险"],
              ["完整流水", "所有库存变更可追溯"]
            ].map(([title, description]) => (
              <div
                key={title}
                className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur"
              >
                <p className="text-base font-semibold">{title}</p>
                <p className="mt-2 text-sm text-white/70">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-center lg:justify-end">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}

