/**
 * External dependencies
 */
const github = require( '@actions/github' );
const core = require( '@actions/core' );

const runner = async () => {
	try {
		const token = core.getInput( 'repo-token', { required: true } );
		const octokit = github.getOctokit( token );
		const oldAssets = require( '../../' +
			core.getInput( 'compare', {
				required: true,
			} ) );

		if ( ! oldAssets ) {
			return;
		}

		const newAssets = require( '../../build/assets.json' );

		if ( ! newAssets ) {
			return;
		}

		const changes = Object.fromEntries(
			Object.entries( newAssets )
				.map( ( [ key, { dependencies = [] } ] ) => {
					const oldDependencies = oldAssets[ key ].dependencies || [];
					/*const added = dependencies.filter(
						( dependency ) =>
							! oldDependencies.includes( dependency )
					);
					const removed = oldDependencies.filter(
						( dependency ) =>
							! dependencies.includes( dependency )
					);*/
					const currentChanges = {
						added: dependencies,
						removed: [],
					};
					return currentChanges.length
						? [ key, currentChanges ]
						: null;
				} )
				.filter( Boolean )
		);

		if ( changes.length === 0 ) {
			return;
		}

		const reportContent = Object.entries( changes ).map(
			( [ handle, { added, removed } ] ) => {
				const addedDeps = added.length
					? '`' + added.implode( '`, `' ) + '`'
					: '';
				const removedDeps = removed.length
					? '`' + removed.implode( '`, `' ) + '`'
					: '';

				let icon = '';

				if ( added.length && removed.length ) {
					icon = '❓';
				} else if ( added.length ) {
					icon = '⚠️';
				} else if ( removed.length ) {
					icon = '🎉';
				}

				return `| \`${ handle }\` | ${ addedDeps } | ${ removedDeps } | ${ icon } |`;
			}
		);

		let message = `
		# Script Dependencies Report

		The \`compare-assets\` action has detected some changed script dependencies between this branch and trunk.
		Please review and confirm the following are correct before merging. Failure to do so may result in reduced
		performance since more scripts will be enqueued by WordPress.

		---

		| Script Handle | Added | Removed | |
		| ------------- | ------| ------- | |
		${ reportContent }

		__This comment was automatically added by the \`./github/compare-assets\` action.__
		`;

		await octokit.issues.createComment( {
			...github.context.repo,
			issue_number: github.context.payload.pull_request.number,
			body: message,
		} );
	} catch ( error ) {
		core.setFailed( error.message );
	}
};

runner();
