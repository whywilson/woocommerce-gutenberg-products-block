/* eslint-disable no-console */
/**
 * External dependencies
 */
import { FullConfig, chromium, request } from '@playwright/test';
import { RequestUtils } from '@wordpress/e2e-test-utils-playwright';
import fs from 'fs';
import { cli } from '@woocommerce/e2e-utils';

/**
 * Internal dependencies
 */
import { customer, admin } from './test-data/data/data';

const loginAsCustomer = async ( config: FullConfig ) => {
	const { stateDir, baseURL, userAgent } = config.projects[ 0 ].use;

	// used throughout tests for authentication
	process.env.CUSTOMERSTATE = `${ stateDir }customerState.json`;

	try {
		fs.unlinkSync( process.env.CUSTOMERSTATE );
		console.log( 'Customer state file deleted successfully.' );
	} catch ( err ) {
		if ( err.code === 'ENOENT' ) {
			console.log( 'Customer state file does not exist.' );
		} else {
			console.log( 'Customer state file could not be deleted: ' + err );
		}
	}

	let customerLoggedIn = false;

	// Specify user agent when running against an external test site to avoid getting HTTP 406 NOT ACCEPTABLE errors.
	const contextOptions = { baseURL, userAgent };

	// Create browser, browserContext, and page for customer and admin users
	const browser = await chromium.launch();
	const customerContext = await browser.newContext( contextOptions );
	const customerPage = await customerContext.newPage();

	// Sign in as customer user and save state
	const customerRetries = 5;
	for ( let i = 0; i < customerRetries; i++ ) {
		try {
			await customerPage.goto( `/wp-admin` );
			await customerPage.fill( 'input[name="log"]', customer.username );
			await customerPage.fill( 'input[name="pwd"]', customer.password );
			await customerPage.click( 'text=Log In' );

			await customerPage.goto( `/my-account` );

			await customerPage
				.context()
				.storageState( { path: process.env.CUSTOMERSTATE } );
			console.log( 'Logged-in as customer successfully.' );
			customerLoggedIn = true;
			break;
		} catch ( e ) {
			console.log(
				`Customer log-in failed. Retrying... ${ i }/${ customerRetries }`
			);
			console.log( e );
		}
	}

	if ( ! customerLoggedIn ) {
		console.error(
			'Cannot proceed e2e test, as customer login failed. Please check if the test site has been setup correctly.'
		);
		process.exit( 1 );
	}

	await customerContext.close();
	await browser.close();
};

const prepareAttributes = async ( config: FullConfig ) => {
	const { baseURL, userAgent } = config.projects[ 0 ].use;

	// Specify user agent when running against an external test site to avoid getting HTTP 406 NOT ACCEPTABLE errors.
	const contextOptions = { baseURL, userAgent };

	// Create browser, browserContext, and page for customer and admin users
	const browser = await chromium.launch();
	const context = await browser.newContext( contextOptions );
	const page = await context.newPage();

	await page.goto( `/wp-admin` );
	await page.fill( 'input[name="log"]', admin.username );
	await page.fill( 'input[name="pwd"]', admin.password );
	await page.click( 'text=Log In' );

	/*
	 * Intercept the dialog event.
	 * This is needed because when the regenerate
	 * button is clicked, a dialog is shown.
	 */
	page.on( 'dialog', async ( dialog ) => {
		await dialog.accept();
	} );

	await page.goto( '/wp-admin/admin.php?page=wc-status&tab=tools' );

	await page.click( '.regenerate_product_attributes_lookup_table input' );

	await context.close();
	await browser.close();

	/*
	 * Note that the two commands below are intentionally
	 * duplicated as we need to run the cron task twice as
	 * we need to process more than 1 batch of items.
	 */
	await cli(
		`npm run wp-env run tests-cli wp action-scheduler run --hooks="woocommerce_run_product_attribute_lookup_regeneration_callback"`
	);

	await cli(
		`npm run wp-env run tests-cli wp action-scheduler run --hooks="woocommerce_run_product_attribute_lookup_regeneration_callback"`
	);
};

async function globalSetup( config: FullConfig ) {
	const { storageState, baseURL } = config.projects[ 0 ].use;
	const storageStatePath =
		typeof storageState === 'string' ? storageState : '';

	const requestContext = await request.newContext( {
		baseURL: baseURL ?? '',
	} );

	const requestUtils = new RequestUtils( requestContext, {
		storageStatePath,
	} );

	await requestUtils.setupRest();
	await requestContext.dispose();

	await prepareAttributes( config );
	await loginAsCustomer( config );
}

export default globalSetup;
