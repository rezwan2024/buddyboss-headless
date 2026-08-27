<?php
/**
 * Minimal stand-ins for the WordPress functions our classes call, so unit
 * tests can exercise the actual production code (Auth::determine_current_user,
 * Tokens::*) without a full WP bootstrap. Per DECISIONS.md, this project
 * deliberately has no local WordPress install — running the real WP PHPUnit
 * integration suite would require one. These stubs are a scope adjustment
 * from "PHPUnit proving get_current_user_id() is right" (PLAN.md) to
 * "PHPUnit proving the filter that feeds it is right" — verified for real
 * against the live site instead (see PROGRESS.md session log).
 */

define( 'ABSPATH', __DIR__ . '/' );
define( 'HOUR_IN_SECONDS', 3600 );
define( 'DAY_IN_SECONDS', 86400 );

$GLOBALS['__test_options'] = array();
$GLOBALS['__test_users']   = array();
$GLOBALS['__test_usermeta'] = array();

function wp_json_encode( $data ) {
	return json_encode( $data );
}

function wp_generate_password( $length = 12, $special_chars = true, $extra_special_chars = false ) {
	return bin2hex( random_bytes( (int) ceil( $length / 2 ) ) );
}

function get_option( $key ) {
	return $GLOBALS['__test_options'][ $key ] ?? false;
}

function add_option( $key, $value ) {
	$GLOBALS['__test_options'][ $key ] = $value;
	return true;
}

function get_user_meta( $user_id, $key, $single = false ) {
	return $GLOBALS['__test_usermeta'][ $user_id ][ $key ] ?? '';
}

function update_user_meta( $user_id, $key, $value ) {
	$GLOBALS['__test_usermeta'][ $user_id ][ $key ] = $value;
	return true;
}

class Test_WP_User {
	public $ID;
	public $display_name;
	public $user_login;

	public function __construct( $id, $display_name, $user_login ) {
		$this->ID           = $id;
		$this->display_name = $display_name;
		$this->user_login   = $user_login;
	}
}

function get_user_by( $field, $value ) {
	if ( $field !== 'id' ) {
		return false;
	}
	return $GLOBALS['__test_users'][ (int) $value ] ?? false;
}

/** Test helper — not a WP stub. Registers a fake user for get_user_by(). */
function test_register_user( $id, $display_name = 'Test User', $user_login = 'testuser' ) {
	$GLOBALS['__test_users'][ $id ] = new Test_WP_User( $id, $display_name, $user_login );
}

require_once __DIR__ . '/../includes/class-jwt.php';
require_once __DIR__ . '/../includes/class-tokens.php';
require_once __DIR__ . '/../includes/class-auth.php';
