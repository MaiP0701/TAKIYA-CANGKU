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
              TAKIYA Stock Management
            </p>
            <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl">
              TAKIYA仓库管理系统
            </h1>
            <p className="mt-6 text-base leading-7 text-white/80 sm:text-lg">
              亲爱的伙伴：请及时填写情况、更新库存哦～
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ["多地点库存", "请注意地点、单位、数量填写准确"],
              ["低库存预警", "避免库存情况延迟，记得及时更新哦"],
              ["变更可追溯", "谁操作，就登录谁的账号，绝不可混用"]
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

