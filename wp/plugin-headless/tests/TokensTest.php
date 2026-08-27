<?php

use PHPUnit\Framework\TestCase;
use Headless\Auth\Tokens;

final class TokensTest extends TestCase {

	protected function setUp(): void {
		$GLOBALS['__test_options']  = array();
		$GLOBALS['__test_usermeta'] = array();
	}

	public function test_access_token_decodes_to_the_right_user(): void {
		$token  = Tokens::issue_access_token( 42 );
		$claims = Tokens::decode_access_token( $token );

		$this->assertSame( 42, $claims['sub'] );
	}

	public function test_refresh_token_embeds_the_user_id(): void {
		$token = Tokens::issue_refresh_token( 42 );
		$this->assertSame( 42, Tokens::extract_user_id( $token ) );
	}

	public function test_extract_user_id_rejects_malformed_tokens(): void {
		$this->assertNull( Tokens::extract_user_id( 'not-a-refresh-token' ) );
		$this->assertNull( Tokens::extract_user_id( 'abc:randompart' ) );
	}

	public function test_refresh_token_is_consumed_exactly_once(): void {
		$token = Tokens::issue_refresh_token( 42 );

		$this->assertTrue( Tokens::consume_refresh_token( 42, $token ), 'first use should succeed' );
		$this->assertFalse( Tokens::consume_refresh_token( 42, $token ), 'replay of the same token must fail (rotation)' );
	}

	public function test_refresh_token_rejects_wrong_user(): void {
		$token = Tokens::issue_refresh_token( 42 );
		$this->assertFalse( Tokens::consume_refresh_token( 99, $token ) );
	}

	public function test_multiple_issued_tokens_are_independent(): void {
		$a = Tokens::issue_refresh_token( 42 );
		$b = Tokens::issue_refresh_token( 42 );

		$this->assertTrue( Tokens::consume_refresh_token( 42, $a ) );
		// Consuming `a` must not have invalidated `b`.
		$this->assertTrue( Tokens::consume_refresh_token( 42, $b ) );
	}
}
