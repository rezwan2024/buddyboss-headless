<?php
/**
 * REST routes under headless-auth/v1. Called server-to-server from the
 * Next.js BFF — never from a browser — so no CORS handling is needed.
 */

namespace Headless\Auth;

class REST_Controller {

	const NAMESPACE = 'headless-auth/v1';

	public static function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/login',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'login' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'username' => array( 'required' => true, 'type' => 'string' ),
					'password' => array( 'required' => true, 'type' => 'string' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/refresh',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'refresh' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'refresh_token' => array( 'required' => true, 'type' => 'string' ),
				),
			)
		);

		register_rest_route(
			self::NAMESPACE,
			'/revoke',
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'revoke' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'refresh_token' => array( 'required' => true, 'type' => 'string' ),
				),
			)
		);
	}

	public static function login( \WP_REST_Request $request ) {
		$username = (string) $request->get_param( 'username' );
		$password = (string) $request->get_param( 'password' );

		$user = wp_authenticate( $username, $password );
		if ( is_wp_error( $user ) ) {
			// Generic message — don't leak whether the username exists.
			return new \WP_Error( 'invalid_credentials', 'Incorrect username or password.', array( 'status' => 401 ) );
		}

		return self::issue_token_response( $user );
	}

	public static function refresh( \WP_REST_Request $request ) {
		$refresh_token = (string) $request->get_param( 'refresh_token' );
		$user_id       = Tokens::extract_user_id( $refresh_token );

		if ( ! $user_id || ! Tokens::consume_refresh_token( $user_id, $refresh_token ) ) {
			return new \WP_Error( 'invalid_refresh_token', 'Refresh token is invalid or expired.', array( 'status' => 401 ) );
		}

		$user = get_user_by( 'id', $user_id );
		if ( ! $user ) {
			return new \WP_Error( 'invalid_refresh_token', 'Refresh token is invalid or expired.', array( 'status' => 401 ) );
		}

		return self::issue_token_response( $user );
	}

	public static function revoke( \WP_REST_Request $request ) {
		$refresh_token = (string) $request->get_param( 'refresh_token' );
		$user_id       = Tokens::extract_user_id( $refresh_token );

		if ( $user_id ) {
			Tokens::revoke_refresh_token( $user_id, $refresh_token );
		}

		// Always succeed — revoking an already-invalid token isn't an error
		// from the client's point of view (it's already logged out).
		return array( 'success' => true );
	}

	private static function issue_token_response( \WP_User $user ) {
		return array(
			'access_token'  => Tokens::issue_access_token( $user->ID ),
			'refresh_token' => Tokens::issue_refresh_token( $user->ID ),
			'expires_in'    => Tokens::ACCESS_TOKEN_TTL,
			'user'          => array(
				'id'           => $user->ID,
				'name'         => $user->display_name,
				'mention_name' => $user->user_login,
			),
		);
	}
}
