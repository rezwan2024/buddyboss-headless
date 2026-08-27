<?php
/**
 * Wires the Authorization: Bearer <token> header into WordPress's user
 * resolution. Must run before REST permission callbacks evaluate — those
 * call wp_get_current_user(), which fires `determine_current_user` lazily
 * on first access, so hooking the filter at all (any reasonable priority)
 * is sufficient; there's no separate "run before REST" step to get right
 * beyond not hooking too late (e.g. on `rest_api_init`, which runs after
 * some permission callbacks may have already resolved the current user).
 */

namespace Headless\Auth;

class Auth {

	public static function init(): void {
		add_filter( 'determine_current_user', array( __CLASS__, 'determine_current_user' ), 10 );
	}

	public static function determine_current_user( $user_id ) {
		$header = self::get_authorization_header();
		if ( ! $header || stripos( $header, 'Bearer ' ) !== 0 ) {
			return $user_id; // no bearer token — leave whatever auth method already resolved (or none)
		}

		$token  = trim( substr( $header, 7 ) );
		$claims = Tokens::decode_access_token( $token );
		if ( ! $claims || empty( $claims['sub'] ) ) {
			return $user_id; // invalid/expired token — fall through rather than hard-erroring here
		}

		$user = get_user_by( 'id', (int) $claims['sub'] );
		return $user ? $user->ID : $user_id;
	}

	private static function get_authorization_header(): ?string {
		if ( ! empty( $_SERVER['HTTP_AUTHORIZATION'] ) ) {
			return $_SERVER['HTTP_AUTHORIZATION'];
		}
		// Some hosts strip the Authorization header from $_SERVER unless
		// redirected via .htaccess into REDIRECT_HTTP_AUTHORIZATION.
		if ( ! empty( $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ) ) {
			return $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
		}
		return null;
	}
}
