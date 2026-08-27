import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-8">
      <h1 className="text-xl font-semibold">Log in</h1>
      <LoginForm />
    </main>
  );
}
