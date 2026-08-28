import { decodeEntities, timeAgo } from "@/lib/format";
import { postAuthorName, postFeaturedImage } from "@buddyboss-headless/types";
import type { Post } from "@buddyboss-headless/types";
import Image from "next/image";
import Link from "next/link";

export default function PostCard({ post }: { post: Post }) {
  const image = postFeaturedImage(post);

  return (
    <li>
      <Link
        href={`/blog/${post.slug}`}
        className="block overflow-hidden rounded border border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
      >
        {image && (
          <div className="relative h-40 w-full bg-black/5 dark:bg-white/5">
            <Image
              src={image}
              alt=""
              fill
              sizes="(max-width: 672px) 100vw, 336px"
              className="object-cover"
            />
          </div>
        )}
        <div className="p-3">
          <p className="text-sm font-medium text-black/80 dark:text-white/80">
            {decodeEntities(post.title.rendered)}
          </p>
          <p className="mt-1 text-xs text-black/60 dark:text-white/60">
            {decodeEntities(postAuthorName(post))} · {timeAgo(post.date)}
          </p>
        </div>
      </Link>
    </li>
  );
}
