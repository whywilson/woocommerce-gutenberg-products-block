/**
 * Internal dependencies
 */
import {
	getNormalPagePermalink,
	shopper,
	merchant,
	visitPostOfType,
} from '../../../utils';

const block = {
	name: 'Checkout',
};

const simpleProductName = '128GB USB Stick';
const freeShippingName = 'Free Shipping';
const freeShippingPrice = '$0.00';
const normalShippingName = 'Normal Shipping';
const normalShippingPrice = '$20.00';

if ( process.env.WOOCOMMERCE_BLOCKS_PHASE < 2 )
	// eslint-disable-next-line jest/no-focused-tests
	test.only( `skipping ${ block.name } tests`, () => {} );

describe( `Shopper → Checkout → Can choose shipping option`, () => {
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

	it( 'allows customer to choose free shipping', async () => {
		await page.goto( productPermalink );
		await shopper.addToCart();
		await shopper.goToCheckoutBlock();

		await shopper.selectAndVerifyShippingOption(
			freeShippingName,
			freeShippingPrice
		);
		await shopper.placeOrder();
		await expect( page ).toMatch( freeShippingName );
	} );

	it( 'allows customer to choose flat rate shipping', async () => {
		await page.goto( productPermalink );
		await shopper.addToCart();
		await shopper.goToCheckoutBlock();

		await shopper.selectAndVerifyShippingOption(
			normalShippingName,
			normalShippingPrice
		);
		await shopper.placeOrder();
		await expect( page ).toMatch( normalShippingName );
	} );
} );
