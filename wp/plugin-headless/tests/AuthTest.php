<?php

use PHPUnit\Framework\TestCase;
use Headless\Auth\Auth;
use Headless\Auth\Tokens;

/**
 * This is the test PLAN.md asks for: proving a valid token yields the
 * right current user, via the exact filter callback WordPress's
 * determine_current_user hook calls (which get_current_user_id() resolves
 * through). See tests/bootstrap.php for why this stubs WP rather than
 * bootstrapping it for real.
 */
final class AuthTest extends TestCase {

	protected function setUp(): void {
		$GLOBALS['__test_options']  = array();
		$GLOBALS['__test_usermeta'] = array();
		$GLOBALS['__test_users']    = array();
		unset( $_SERVER['HTTP_AUTHORIZATION'], $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] );
	}

	public function test_valid_bearer_token_resolves_to_the_right_user(): void {
		test_register_user( 42, 'Jane Doe', 'jane' );
		$token = Tokens::issue_access_token( 42 );
		$_SERVER['HTTP_AUTHORIZATION'] = "Bearer $token";

		$this->assertSame( 42, Auth::determine_current_user( 0 ) );
	}

	public function test_no_authorization_header_falls_through_unchanged(): void {
		$this->assertSame( 0, Auth::determine_current_user( 0 ) );
		$this->assertSame( 7, Auth::determine_current_user( 7 ) ); // e.g. cookie auth already resolved this
	}

	public function test_non_bearer_authorization_header_falls_through(): void {
		$_SERVER['HTTP_AUTHORIZATION'] = 'Basic dXNlcjpwYXNz';
		$this->assertSame( 0, Auth::determine_current_user( 0 ) );
	}

	public function test_expired_token_falls_through_instead_of_erroring(): void {
		$expired = \Headless\Auth\JWT::encode( array( 'sub' => 42, 'exp' => time() - 1 ), Tokens::secret() );
		$_SERVER['HTTP_AUTHORIZATION'] = "Bearer $expired";

		$this->assertSame( 0, Auth::determine_current_user( 0 ) );
	}

	public function test_token_for_a_deleted_user_falls_through(): void {
		// User 999 was never registered via test_register_user() — simulates a deleted account.
		$token = Tokens::issue_access_token( 999 );
		$_SERVER['HTTP_AUTHORIZATION'] = "Bearer $token";

		$this->assertSame( 0, Auth::determine_current_user( 0 ) );
	}

	public function test_tampered_token_falls_through(): void {
		test_register_user( 42, 'Jane Doe', 'jane' );
		$token = Tokens::issue_access_token( 42 );
		$_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . substr( $token, 0, -1 ) . 'x';

		$this->assertSame( 0, Auth::determine_current_user( 0 ) );
	}
}
