<?php
/**
 * Plugin Name: Headless Auth
 * Description: JWT auth (issue/refresh/revoke) for the headless Next.js frontend. The only custom PHP this project ships — BuddyBoss's REST API assumes cookie+nonce auth, which doesn't work from a separate Next.js server.
 * Version: 1.0.0
 * Requires PHP: 7.4
 *
 * Deployed via ./scripts/push-plugin, source tracked at wp/plugin-headless/.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once __DIR__ . '/includes/class-jwt.php';
require_once __DIR__ . '/includes/class-tokens.php';
require_once __DIR__ . '/includes/class-auth.php';
require_once __DIR__ . '/includes/class-rest-controller.php';

// Registered here, at plugin-file scope, rather than on any hook. If a
// determine_current_user filter is added even one moment too late — say,
// on `init` — some earlier code path may already have called
// wp_get_current_user() and cached the result as user 0, and BuddyBoss's
// REST permission callbacks would compute visibility against that cached
// user 0 for the rest of the request, ignoring a perfectly valid bearer
// token. Registering at file-load time (during WordPress's plugin-loading
// pass, before `plugins_loaded` even fires) is the earliest point available.
Headless\Auth\Auth::init();

add_action( 'rest_api_init', array( 'Headless\\Auth\\REST_Controller', 'register_routes' ) );
