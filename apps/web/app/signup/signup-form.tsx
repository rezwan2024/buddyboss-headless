"use client";

import { useActionState } from "react";
import { type SignUpState, signupAction } from "../auth-actions";

const initialState: SignUpState = {};

const inputClass =
  "mt-1 w-full rounded border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10";
const errorClass = "mt-1 text-xs text-red-700 dark:text-red-400";

export default function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, initialState);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium">
            First name
          </label>
          <input id="firstName" name="firstName" type="text" required className={inputClass} />
          {state.fieldErrors?.firstName && (
            <p className={errorClass}>{state.fieldErrors.firstName}</p>
          )}
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium">
            Last name
          </label>
          <input id="lastName" name="lastName" type="text" required className={inputClass} />
          {state.fieldErrors?.lastName && (
            <p className={errorClass}>{state.fieldErrors.lastName}</p>
          )}
        </div>
      </div>
      <div>
        <label htmlFor="username" className="block text-sm font-medium">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          required
          autoComplete="username"
          className={inputClass}
        />
        {state.fieldErrors?.username && <p className={errorClass}>{state.fieldErrors.username}</p>}
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
        {state.fieldErrors?.email && <p className={errorClass}>{state.fieldErrors.email}</p>}
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className={inputClass}
        />
        {state.fieldErrors?.password && <p className={errorClass}>{state.fieldErrors.password}</p>}
      </div>
      {state.error && <p className="text-sm text-red-700 dark:text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Creating account…" : "Sign up"}
      </button>
    </form>
  );
}
