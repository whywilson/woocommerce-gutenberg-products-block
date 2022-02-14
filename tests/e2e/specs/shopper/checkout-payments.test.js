/**
 * External dependencies
 */
import {
	merchant,
	setCheckbox,
	settingsPageSaveChanges,
	verifyCheckboxIsSet,
} from '@woocommerce/e2e-utils';

/**
 * Internal dependencies
 */
import {
	getNormalPagePermalink,
	shopper,
	visitPostOfType,
} from '../../../utils';

const block = {
	name: 'Checkout',
};

const simpleProductName = 'Woo Single #1';

if ( process.env.WOOCOMMERCE_BLOCKS_PHASE < 2 )
	// eslint-disable-next-line jest/no-focused-tests
	test.only( `skipping ${ block.name } tests`, () => {} );

describe( `${ block.name } Block (frontend)`, () => {
	let productPermalink;

	beforeAll( async () => {
		// prevent CartCheckoutCompatibilityNotice from appearing
		await page.evaluate( () => {
			localStorage.setItem(
				'wc-blocks_dismissed_compatibility_notices',
				'["checkout"]'
			);
		} );
		await merchant.login();

		// Enable BACS payment method
		await merchant.openSettings( 'checkout', 'bacs' );
		await setCheckbox( '#woocommerce_bacs_enabled' );
		await settingsPageSaveChanges();

		// Verify that settings have been saved
		await verifyCheckboxIsSet( '#woocommerce_bacs_enabled' );

		// Enable COD payment method
		await merchant.openSettings( 'checkout', 'cod' );
		await setCheckbox( '#woocommerce_cod_enabled' );
		await settingsPageSaveChanges();

		// Verify that settings have been saved
		await verifyCheckboxIsSet( '#woocommerce_cod_enabled' );

		// Get product page permalink.
		await visitPostOfType( simpleProductName, 'product' );
		productPermalink = await getNormalPagePermalink();

		await merchant.logout();
	} );

	afterAll( async () => {
		// empty cart from shortcode page
		await shopper.goToCart();
		await shopper.removeFromCart( 'Woo Single #1' );
		await page.evaluate( () => {
			localStorage.removeItem(
				'wc-blocks_dismissed_compatibility_notices'
			);
		} );
	} );

	it( 'allows customer to choose available payment methods', async () => {
		await shopper.goToCheckoutBlock();
		await page.goto( productPermalink );
		await shopper.addToCart();
		await shopper.goToCheckoutBlock();

		await expect( page ).toClick(
			'.wc-block-components-payment-method-label',
			{
				text: 'Direct bank transfer',
			}
		);
		await expect( page ).toClick(
			'.wc-block-components-payment-method-label',
			{
				text: 'Cash on delivery',
			}
		);
		await expect( page ).toClick(
			'.wc-block-components-payment-method-label',
			{
				text: 'Check payments',
			}
		);
	} );
} );
