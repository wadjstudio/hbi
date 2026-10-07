import { LoginForm } from "./login-form";
import { BrandLockup } from "@/components/brand/brand-lockup";

export default function LoginPage() {
  return (
    <main className="sesen-login grid min-h-screen place-items-center px-6 py-10">
      <section className="hbi-panel sesen-login-panel w-full max-w-md p-7 shadow-2xl shadow-black/30">
        <div className="mb-8">
          <h1>
            <BrandLockup />
          </h1>
          <div className="hbi-kicker">Handball Intelligence</div>
          <p className="hbi-muted mt-2 text-sm">
            تحليل للمدرب، تدعمه أدلة المباراة.
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
