import { decodeEntities, timeAgo } from "@/lib/format";
import { getPostBySlug } from "@buddyboss-headless/api-client";
import { postAuthorAvatar, postAuthorName, postFeaturedImage } from "@buddyboss-headless/types";
import Image from "next/image";
import { notFound } from "next/navigation";
import AuthorAvatar from "../../author-avatar";

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const image = postFeaturedImage(post);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold">{decodeEntities(post.title.rendered)}</h1>
      <div className="mt-2 flex items-center gap-2">
        <AuthorAvatar src={postAuthorAvatar(post)} size={24} />
        <p className="text-sm text-black/50 dark:text-white/50">
          {decodeEntities(postAuthorName(post))} · {timeAgo(post.date)}
        </p>
      </div>
      {image && (
        <div className="relative mt-4 h-64 w-full overflow-hidden rounded bg-black/5 dark:bg-white/5">
          <Image
            src={image}
            alt=""
            fill
            sizes="(max-width: 672px) 100vw, 672px"
            className="object-cover"
          />
        </div>
      )}
      <div
        className="prose prose-sm mt-4 max-w-none"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized server-side by WordPress (wp_kses), not raw user input
        dangerouslySetInnerHTML={{ __html: post.content.rendered }}
      />
    </main>
  );
}
