// eslint-disable testing-library/no-dom-import
/**
 * External dependencies
 */
import { getByTestId, waitFor } from '@testing-library/dom';
import { getSettingWithCoercion } from '@woocommerce/settings';

/**
 * Internal dependencies
 */
import {
	getMiniCartTotalsFromLocalStorage,
	getMiniCartTotalsFromServer,
	updateTotals,
} from '../data';

// This is a simplified version of the response of the Cart API endpoint.
const responseMock = {
	ok: true,
	json: async () => ( {
		totals: {
			total_price: '1600',
			total_items: '1400',
			currency_code: 'USD',
			currency_symbol: '$',
			currency_minor_unit: 2,
			currency_decimal_separator: '.',
			currency_thousand_separator: ',',
			currency_prefix: '$',
			currency_suffix: '',
		},
		items_count: 2,
	} ),
} as Response;
const localStorageMock = {
	totals: {
		total_price: '1600',
		total_items: '1400',
		currency_code: 'USD',
		currency_symbol: '$',
		currency_minor_unit: 2,
		currency_decimal_separator: '.',
		currency_thousand_separator: ',',
		currency_prefix: '$',
		currency_suffix: '',
	},
	itemsCount: 2,
};

const initializeLocalStorage = () => {
	Object.defineProperty( window, 'localStorage', {
		value: {
			getItem: jest
				.fn()
				.mockReturnValue( JSON.stringify( localStorageMock ) ),
			setItem: jest.fn(),
		},
		writable: true,
	} );
};

// This is a simplified version of the Mini-Cart DOM generated by MiniCart.php.
const getMiniCartDOM = () => {
	const div = document.createElement( 'div' );
	div.innerHTML = `
	<div class="wc-block-mini-cart">
		<div class="wc-block-mini-cart__amount" data-testid="amount"></div>
		<div class="wc-block-mini-cart__badge" data-testid="quantity"></div>
	</div>`;
	return div;
};

jest.mock( '@woocommerce/settings', () => {
	return {
		...jest.requireActual( '@woocommerce/settings' ),
		getSettingWithCoercion: jest.fn(),
	};
} );

describe( 'Mini-Cart frontend script when "the display prices during cart and checkout" option is set to "Including Tax"', () => {
	beforeAll( () => {
		( getSettingWithCoercion as jest.Mock ).mockReturnValue( true );
	} );

	afterAll( () => {
		jest.resetModules();
	} );
	it( 'updates the cart contents based on the localStorage values', async () => {
		initializeLocalStorage();
		const container = getMiniCartDOM();
		document.body.appendChild( container );

		updateTotals( getMiniCartTotalsFromLocalStorage() );

		// Assert that we are rendering the amount.
		await waitFor( () =>
			expect( getByTestId( container, 'amount' ).textContent ).toBe(
				'$16.00'
			)
		);
		// Assert that we are rendering the quantity.
		await waitFor( () =>
			expect( getByTestId( container, 'quantity' ).textContent ).toBe(
				'2'
			)
		);
	} );

	it( 'updates the cart contents based on the API response', async () => {
		jest.spyOn( window, 'fetch' ).mockResolvedValue( responseMock );
		const container = getMiniCartDOM();
		document.body.appendChild( container );

		getMiniCartTotalsFromServer().then( updateTotals );

		// Assert we called the correct endpoint.
		await waitFor( () =>
			expect( window.fetch ).toHaveBeenCalledWith(
				'/wp-json/wc/store/v1/cart/'
			)
		);

		// Assert we saved the values returned to the localStorage.
		await waitFor( () =>
			expect( window.localStorage.setItem.mock.calls[ 0 ][ 1 ] ).toEqual(
				JSON.stringify( localStorageMock )
			)
		);

		// Assert that we are rendering the amount.
		await waitFor( () =>
			expect( getByTestId( container, 'amount' ).textContent ).toBe(
				'$16.00'
			)
		);
		// Assert that we are rendering the quantity.
		await waitFor( () =>
			expect( getByTestId( container, 'quantity' ).textContent ).toBe(
				'2'
			)
		);
		jest.restoreAllMocks();
	} );
} );

describe( 'Mini-Cart frontend script when "the display prices during cart and checkout" option is set to "Excluding Tax"', () => {
	beforeAll( () => {
		( getSettingWithCoercion as jest.Mock ).mockReturnValue( false );
	} );
	it( 'updates the cart contents based on the localStorage values', async () => {
		initializeLocalStorage();
		const container = getMiniCartDOM();
		document.body.appendChild( container );

		updateTotals( getMiniCartTotalsFromLocalStorage() );

		// Assert that we are rendering the amount.
		await waitFor( () =>
			expect( getByTestId( container, 'amount' ).textContent ).toBe(
				'$14.00'
			)
		);
		// Assert that we are rendering the quantity.
		await waitFor( () =>
			expect( getByTestId( container, 'quantity' ).textContent ).toBe(
				'2'
			)
		);
	} );

	it( 'updates the cart contents based on the API response', async () => {
		jest.spyOn( window, 'fetch' ).mockResolvedValue( responseMock );
		const container = getMiniCartDOM();
		document.body.appendChild( container );

		getMiniCartTotalsFromServer().then( updateTotals );

		// Assert we called the correct endpoint.
		await waitFor( () =>
			expect( window.fetch ).toHaveBeenCalledWith(
				'/wp-json/wc/store/v1/cart/'
			)
		);

		// Assert we saved the values returned to the localStorage.
		await waitFor( () =>
			expect( window.localStorage.setItem.mock.calls[ 0 ][ 1 ] ).toEqual(
				JSON.stringify( localStorageMock )
			)
		);

		// Assert that we are rendering the amount.
		await waitFor( () =>
			expect( getByTestId( container, 'amount' ).textContent ).toBe(
				'$14.00'
			)
		);
		// Assert that we are rendering the quantity.
		await waitFor( () =>
			expect( getByTestId( container, 'quantity' ).textContent ).toBe(
				'2'
			)
		);
		jest.restoreAllMocks();
	} );
} );
