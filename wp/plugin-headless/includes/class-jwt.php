<?php
/**
 * Minimal HS256 JWT encode/verify. No dependency on wp core so it can be
 * unit tested standalone (see tests/test-jwt.php). Not a general-purpose
 * JWT library — just enough for this plugin's access/refresh tokens.
 */

namespace Headless\Auth;

class JWT {

	/**
	 * @param array  $claims Payload claims. Caller is responsible for `exp`/`iat`.
	 * @param string $secret HMAC secret.
	 */
	public static function encode( array $claims, string $secret ): string {
		$header = self::base64url_encode( wp_json_encode_or_json( array( 'alg' => 'HS256', 'typ' => 'JWT' ) ) );
		$payload = self::base64url_encode( wp_json_encode_or_json( $claims ) );
		$signature = self::sign( "$header.$payload", $secret );
		return "$header.$payload.$signature";
	}

	/**
	 * Verifies signature and `exp`. Returns the decoded claims on success,
	 * or null on any failure (malformed token, bad signature, expired).
	 */
	public static function decode( string $token, string $secret ): ?array {
		$parts = explode( '.', $token );
		if ( count( $parts ) !== 3 ) {
			return null;
		}
		list( $header, $payload, $signature ) = $parts;

		$expected = self::sign( "$header.$payload", $secret );
		if ( ! hash_equals( $expected, $signature ) ) {
			return null;
		}

		$claims = json_decode( self::base64url_decode( $payload ), true );
		if ( ! is_array( $claims ) ) {
			return null;
		}

		if ( isset( $claims['exp'] ) && time() >= (int) $claims['exp'] ) {
			return null;
		}

		return $claims;
	}

	private static function sign( string $data, string $secret ): string {
		return self::base64url_encode( hash_hmac( 'sha256', $data, $secret, true ) );
	}

	private static function base64url_encode( string $data ): string {
		return rtrim( strtr( base64_encode( $data ), '+/', '-_' ), '=' );
	}

	private static function base64url_decode( string $data ): string {
		$padded = str_pad( $data, strlen( $data ) % 4 === 0 ? strlen( $data ) : strlen( $data ) + ( 4 - strlen( $data ) % 4 ), '=' );
		return base64_decode( strtr( $padded, '-_', '+/' ) );
	}
}

/**
 * wp_json_encode() isn't available outside a WP bootstrap (needed so
 * class-jwt.php has zero WP dependency for standalone PHPUnit). Falls back
 * to json_encode() when running outside WordPress.
 */
function wp_json_encode_or_json( $data ): string {
	if ( function_exists( 'wp_json_encode' ) ) {
		return wp_json_encode( $data );
	}
	return json_encode( $data );
}
