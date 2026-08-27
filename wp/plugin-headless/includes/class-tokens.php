<?php
/**
 * Issues and verifies access/refresh tokens, and stores refresh tokens
 * (hashed, never plaintext) in user meta so they can be individually
 * revoked. Access tokens are stateless JWTs — nothing to store for those.
 */

namespace Headless\Auth;

class Tokens {

	const ACCESS_TOKEN_TTL  = HOUR_IN_SECONDS;
	const REFRESH_TOKEN_TTL = 30 * DAY_IN_SECONDS;
	const META_KEY          = '_headless_refresh_tokens';

	public static function secret(): string {
		$secret = get_option( 'headless_jwt_secret' );
		if ( ! $secret ) {
			$secret = wp_generate_password( 64, true, true );
			add_option( 'headless_jwt_secret', $secret, '', false );
		}
		return $secret;
	}

	public static function issue_access_token( int $user_id ): string {
		return JWT::encode(
			array(
				'sub' => $user_id,
				'iat' => time(),
				'exp' => time() + self::ACCESS_TOKEN_TTL,
			),
			self::secret()
		);
	}

	/**
	 * Returns the plaintext refresh token — only ever shown to the client
	 * once. Prefixed with the (non-secret) user ID so refresh/revoke
	 * requests can look up the right user_meta record directly instead of
	 * scanning every user for a matching hash.
	 */
	public static function issue_refresh_token( int $user_id ): string {
		$token = $user_id . ':' . wp_generate_password( 64, false );
		$hash  = self::hash( $token );

		$tokens   = self::get_tokens( $user_id );
		$tokens[] = array(
			'hash'    => $hash,
			'expires' => time() + self::REFRESH_TOKEN_TTL,
		);
		self::prune_and_save( $user_id, $tokens );

		return $token;
	}

	/** Returns the user ID embedded in a refresh token, or null if malformed. */
	public static function extract_user_id( string $refresh_token ): ?int {
		$parts = explode( ':', $refresh_token, 2 );
		if ( count( $parts ) !== 2 || ! ctype_digit( $parts[0] ) ) {
			return null;
		}
		return (int) $parts[0];
	}

	/**
	 * Verifies a refresh token belongs to the user, is unexpired, and
	 * hasn't been used already — then rotates it (removes the old record).
	 * Returns true if the token was valid; false otherwise. Always call
	 * this before issuing a new refresh token for a refresh request, so a
	 * stolen refresh token can't be replayed after rotation.
	 */
	public static function consume_refresh_token( int $user_id, string $token ): bool {
		$hash   = self::hash( $token );
		$tokens = self::get_tokens( $user_id );

		$remaining = array();
		$found     = false;
		foreach ( $tokens as $record ) {
			if ( hash_equals( $record['hash'], $hash ) ) {
				$found = ( $record['expires'] > time() );
				continue; // drop it either way — used or expired, don't keep it
			}
			$remaining[] = $record;
		}

		self::prune_and_save( $user_id, $remaining );
		return $found;
	}

	/** Used by the revoke endpoint (logout) — same as consuming, without issuing a new one. */
	public static function revoke_refresh_token( int $user_id, string $token ): void {
		self::consume_refresh_token( $user_id, $token );
	}

	public static function decode_access_token( string $token ): ?array {
		return JWT::decode( $token, self::secret() );
	}

	private static function get_tokens( int $user_id ): array {
		$tokens = get_user_meta( $user_id, self::META_KEY, true );
		return is_array( $tokens ) ? $tokens : array();
	}

	private static function prune_and_save( int $user_id, array $tokens ): void {
		$now  = time();
		$live = array_values( array_filter( $tokens, fn( $t ) => $t['expires'] > $now ) );
		update_user_meta( $user_id, self::META_KEY, $live );
	}

	private static function hash( string $token ): string {
		return hash( 'sha256', $token );
	}
}
