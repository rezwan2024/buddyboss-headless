import Link from "next/link";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold">Log in</h1>
      <LoginForm />
      <p className="mt-4 text-sm text-black/60 dark:text-white/60">
        Don't have an account?{" "}
        <Link href="/signup" className="underline underline-offset-2">
          Sign up
        </Link>
      </p>
    </main>
  );
}
