<?php

use PHPUnit\Framework\TestCase;
use Headless\Auth\JWT;

final class JWTTest extends TestCase {

	public function test_encode_decode_round_trip(): void {
		$token  = JWT::encode( array( 'sub' => 42, 'exp' => time() + 60 ), 'secret' );
		$claims = JWT::decode( $token, 'secret' );

		$this->assertNotNull( $claims );
		$this->assertSame( 42, $claims['sub'] );
	}

	public function test_rejects_wrong_secret(): void {
		$token = JWT::encode( array( 'sub' => 42, 'exp' => time() + 60 ), 'secret' );
		$this->assertNull( JWT::decode( $token, 'wrong-secret' ) );
	}

	public function test_rejects_tampered_payload(): void {
		$token = JWT::encode( array( 'sub' => 42, 'exp' => time() + 60 ), 'secret' );
		list( $header, $payload, $signature ) = explode( '.', $token );

		// Swap in a payload claiming a different user, keeping the original signature.
		$forged_payload = strtr( rtrim( base64_encode( json_encode( array( 'sub' => 1, 'exp' => time() + 60 ) ) ), '=' ), '+/', '-_' );
		$forged_token   = "$header.$forged_payload.$signature";

		$this->assertNull( JWT::decode( $forged_token, 'secret' ) );
	}

	public function test_rejects_expired_token(): void {
		$token = JWT::encode( array( 'sub' => 42, 'exp' => time() - 1 ), 'secret' );
		$this->assertNull( JWT::decode( $token, 'secret' ) );
	}

	public function test_rejects_malformed_token(): void {
		$this->assertNull( JWT::decode( 'not-a-jwt', 'secret' ) );
		$this->assertNull( JWT::decode( 'only.two-parts', 'secret' ) );
	}
}
