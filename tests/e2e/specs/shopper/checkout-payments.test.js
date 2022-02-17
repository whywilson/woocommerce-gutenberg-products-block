/**
 * Internal dependencies
 */
import {
	getNormalPagePermalink,
	merchant,
	shopper,
	visitPostOfType,
} from '../../../utils';

const block = {
	name: 'Checkout',
};

const simpleProductName = 'Woo Single #1';
const cod = 'Cash on delivery';
const bacs = 'Direct bank transfer';
const cheque = 'Check payments';

if ( process.env.WOOCOMMERCE_BLOCKS_PHASE < 2 )
	// eslint-disable-next-line jest/no-focused-tests
	test.only( `skipping ${ block.name } tests`, () => {} );

describe( 'Shopper → Checkout → Can choose payment option', () => {
	let productPermalink;

	beforeAll( async () => {
		// prevent CartCheckoutCompatibilityNotice from appearing
		await merchant.preventCompatibilityNotice();
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
		await merchant.reactivateCompatibilityNotice();
	} );

	it( 'allows customer to pay using Direct bank transfer', async () => {
		await page.goto( productPermalink );
		await shopper.addToCart();
		await shopper.goToCheckoutBlock();

		await shopper.selectPayment( bacs );
		await shopper.placeOrder();
		await expect( page ).toMatch( bacs );
	} );

	it( 'allows customer to pay using Cash on delivery', async () => {
		await page.goto( productPermalink );
		await shopper.addToCart();
		await shopper.goToCheckoutBlock();

		await shopper.selectPayment( cod );
		await shopper.placeOrder();
		await expect( page ).toMatch( cod );
	} );

	it( 'allows customer to pay using Check payments', async () => {
		await page.goto( productPermalink );
		await shopper.addToCart();
		await shopper.goToCheckoutBlock();

		await shopper.selectPayment( cheque );
		await shopper.placeOrder();
		await expect( page ).toMatch( cheque );
	} );
} );
