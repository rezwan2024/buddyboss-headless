"use client";

import { useQueryClient } from "@tanstack/react-query";
import { type ChangeEvent, useActionState, useEffect, useRef, useState } from "react";
import { type PostActivityState, postActivityAction } from "./post-activity-action";

const initialState: PostActivityState = {};

type AttachmentKind = "image" | "video" | "document";

const ATTACHMENT_FIELDS: { kind: AttachmentKind; label: string; accept: string }[] = [
  { kind: "image", label: "Photo", accept: "image/*" },
  { kind: "video", label: "Video", accept: "video/*" },
  {
    kind: "document",
    label: "Document",
    accept: ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip",
  },
];

/** Only rendered when a session exists — see page.tsx. */
export default function ActivityComposer() {
  const [state, formAction, pending] = useActionState(postActivityAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const queryClient = useQueryClient();
  // Only one attachment is supported per post (see post-activity-action.ts
  // for why) — tracking which slot is filled lets the other two stay
  // disabled instead of letting the user fill all three and hit a server
  // error on submit.
  const [activeKind, setActiveKind] = useState<AttachmentKind | null>(null);

  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
    setActiveKind(null);
    // Refetches page 1 of the feed so the new post shows up immediately —
    // the feed's own no-store fetch already covers reads, this is just
    // getting the already-mounted useInfiniteQuery to notice. Depending on
    // `state` (not `state.success`) matters: useActionState returns a new
    // object each dispatch, but `.success` stays `true` across two
    // consecutive successful posts in the same mount — a boolean dependency
    // wouldn't change value the second time, so the effect would silently
    // skip and the second post wouldn't show up without a full reload.
    queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
  }, [state, queryClient]);

  function onFileChange(kind: AttachmentKind, e: ChangeEvent<HTMLInputElement>) {
    setActiveKind(e.target.files && e.target.files.length > 0 ? kind : null);
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-6 rounded border border-black/10 p-3 dark:border-white/10"
    >
      <textarea
        name="content"
        rows={3}
        placeholder="What's new?"
        className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-black/40 dark:placeholder:text-white/40"
      />
      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-3">
          {ATTACHMENT_FIELDS.map(({ kind, label, accept }) => (
            <label
              key={kind}
              className="inline-flex cursor-pointer items-center gap-1 text-xs text-black/50 hover:text-black/80 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 dark:text-white/50 dark:hover:text-white/80"
              aria-disabled={activeKind !== null && activeKind !== kind}
            >
              {label}
              {activeKind === kind && <span className="text-black/60 dark:text-white/60">(1)</span>}
              <input
                type="file"
                name={kind}
                accept={accept}
                disabled={activeKind !== null && activeKind !== kind}
                onChange={(e) => onFileChange(kind, e)}
                className="hidden"
              />
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {pending ? "Posting…" : "Post"}
        </button>
      </div>
      {state.error && <p className="mt-2 text-sm text-red-700 dark:text-red-400">{state.error}</p>}
    </form>
  );
}
