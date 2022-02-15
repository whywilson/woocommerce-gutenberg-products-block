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

const simpleProductName = '128GB USB Stick';
const freeShippingName = 'Free Shipping';
const freeShippingPrise = '$0.00';
const normalShippingName = 'Normal Shipping';
const normalShippingPrice = '$20.00';

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

	it( 'allows customer to choose available shipping methods', async () => {
		await page.goto( productPermalink );
		await shopper.addToCart();
		await shopper.goToCheckoutBlock();

		await expect( page ).toClick(
			'.wc-block-components-radio-control__label',
			{
				text: freeShippingName,
			}
		);
		await expect( page ).toMatchElement(
			'.wc-block-components-totals-shipping .wc-block-formatted-money-amount',
			{
				text: freeShippingPrise,
			}
		);

		await expect( page ).toClick(
			'.wc-block-components-radio-control__label',
			{
				text: normalShippingName,
			}
		);
		await page.waitForTimeout( 1000 );
		await expect( page ).toMatchElement(
			'.wc-block-components-totals-shipping .wc-block-formatted-money-amount',
			{
				text: normalShippingPrice,
			}
		);
	} );
} );
