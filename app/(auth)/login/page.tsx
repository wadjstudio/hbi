import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-10">
      <section className="hbi-panel w-full max-w-md p-7 shadow-2xl shadow-black/30">
        <div className="mb-8">
          <div className="hbi-kicker">Handball Intelligence</div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">HBI</h1>
          <p className="hbi-muted mt-2 text-sm">تحليل للمدرب، تدعمه أدلة المباراة.</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
