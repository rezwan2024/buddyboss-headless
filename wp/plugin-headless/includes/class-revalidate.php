<?php
/**
 * Notifies the Next.js frontend to purge its ISR cache immediately on
 * `save_post`, instead of leaving it to wait out the per-route revalidate
 * window (30s-3600s depending on the route — see apps/web's api-client).
 * Scoped to the post types that frontend actually caches (blog posts,
 * bbPress forums/topics/replies) — everything else (activity, groups,
 * members) isn't stored as a WP post at all, so save_post never fires for
 * it; those already rely on their own short revalidate windows instead.
 */

namespace Headless\Auth;

class Revalidate {

	const CACHED_POST_TYPES = array( 'post', 'forum', 'topic', 'reply' );

	public static function init(): void {
		add_action( 'save_post', array( __CLASS__, 'handle_save_post' ), 10, 2 );
	}

	public static function handle_save_post( int $post_id, \WP_Post $post ): void {
		if ( wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) ) {
			return;
		}
		if ( ! in_array( $post->post_type, self::CACHED_POST_TYPES, true ) ) {
			return;
		}
		// Only a real publish/unpublish actually changes what the frontend
		// shows — skip drafts and every other transient status.
		if ( ! in_array( $post->post_status, array( 'publish', 'trash' ), true ) ) {
			return;
		}

		self::notify( $post->post_type );
	}

	private static function notify( string $post_type ): void {
		$frontend_url = get_option( 'headless_frontend_url' );
		if ( ! $frontend_url ) {
			return; // Not configured yet — silently no-op rather than erroring on every save.
		}

		wp_remote_post(
			trailingslashit( $frontend_url ) . 'api/revalidate',
			array(
				// Best-effort and fire-and-forget: this must never slow down
				// or block a real editor's save, and nothing here needs the
				// response — if it fails, the route's own revalidate window
				// still catches up on its own within a few minutes.
				'timeout'  => 3,
				'blocking' => false,
				'headers'  => array(
					'Content-Type'        => 'application/json',
					'X-Revalidate-Secret' => self::secret(),
				),
				'body'     => wp_json_encode( array( 'postType' => $post_type ) ),
			)
		);
	}

	/** Same auto-generate-once, non-autoloaded pattern as Tokens::secret(). */
	public static function secret(): string {
		$secret = get_option( 'headless_revalidate_secret' );
		if ( ! $secret ) {
			$secret = wp_generate_password( 64, true, true );
			add_option( 'headless_revalidate_secret', $secret, '', false );
		}
		return $secret;
	}
}
