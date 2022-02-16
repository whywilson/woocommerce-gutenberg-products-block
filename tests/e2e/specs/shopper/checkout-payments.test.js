/**
 * External dependencies
 */
import { merchant } from '@woocommerce/e2e-utils';

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

		// Get product page permalink.
		await visitPostOfType( simpleProductName, 'product' );
		productPermalink = await getNormalPagePermalink();

		await merchant.logout();
	} );

	afterAll( async () => {
		// empty cart from shortcode page
		await shopper.goToCart();
		await shopper.removeFromCart( simpleProductName );
		await page.evaluate( () => {
			localStorage.removeItem(
				'wc-blocks_dismissed_compatibility_notices'
			);
		} );
	} );

	it( 'allows customer to choose available payment methods', async () => {
		await page.goto( productPermalink );
		await shopper.addToCart();
		await shopper.goToCheckoutBlock();

		await expect( page ).toClick(
			'.wc-block-components-payment-method-label',
			{
				text: 'Direct bank transfer',
			}
		);
		const bacs = await page.evaluate(
			() =>
				document.querySelector(
					'#radio-control-wc-payment-method-options-bacs'
				).checked
		);
		expect( bacs ).toBe( true );

		await expect( page ).toClick(
			'.wc-block-components-payment-method-label',
			{
				text: 'Cash on delivery',
			}
		);
		const cod = await page.evaluate(
			() =>
				document.querySelector(
					'#radio-control-wc-payment-method-options-cod'
				).checked
		);
		expect( cod ).toBe( true );

		await expect( page ).toClick(
			'.wc-block-components-payment-method-label',
			{
				text: 'Check payments',
			}
		);
		const cheque = await page.evaluate(
			() =>
				document.querySelector(
					'#radio-control-wc-payment-method-options-cheque'
				).checked
		);
		expect( cheque ).toBe( true );
	} );
} );
