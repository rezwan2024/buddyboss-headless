import Image from "next/image";

// Forum/topic authors don't always resolve through the batch member lookup
// (e.g. a deleted user) — src can be "". next/image errors on an empty src,
// so fall back to a plain placeholder circle instead of rendering it.
export default function AuthorAvatar({ src, size }: { src: string; size: number }) {
  if (!src) {
    return (
      <div
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full bg-black/10 dark:bg-white/10"
      />
    );
  }
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
}
