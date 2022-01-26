/**
 * External dependencies
 */
const github = require( '@actions/github' );
const core = require( '@actions/core' );
const unzipper = require( 'unzipper' );

async function downloadAssetsFromArtifact( octokit, artifactName ) {
	const {
		data: { artifacts },
	} = await octokit.rest.actions.listWorkflowRunArtifacts( {
		...github.context.repo,
		run_id: github.context.payload.workflow_run.id,
	} );

	const matchArtifact = artifacts.find(
		( artifact ) => artifact.name === artifactName
	);

	if ( ! matchArtifact ) {
		// None found in this run.
		return;
	}

	const download = await octokit.rest.actions.downloadArtifact( {
		...github.context.repo,
		artifact_id: matchArtifact.id,
		archive_format: 'zip',
	} );

	const { files } = await unzipper.Open.buffer(
		Buffer.from( download.data )
	);
	const fileBuffers = await Promise.all(
		files.map( ( file ) => file.buffer() )
	);
	const parsedFiles = fileBuffers.map( ( buffer ) =>
		JSON.parse( buffer.toString() )
	);

	return parsedFiles;
}

const runner = async () => {
	try {
		const token = core.getInput( 'repo-token', { required: true } );
		const newArtifactName = core.getInput( 'new-artifact-name', {
			required: true,
		} );
		const oldArtifactName = core.getInput( 'old-artifact-name', {
			required: true,
		} );
		const prNumber = github.context.payload.pull_request.number;
		const owner = github.context.payload.sender.login;
		const repo = github.context.payload.repository.name;
		const octokit = github.getOctokit( token );

		const newAssets = await downloadAssetsFromArtifact(
			octokit,
			newArtifactName
		);

		console.log( newAssets );

		if ( ! newAssets ) {
			return;
		}

		const oldAssets = await downloadAssetsFromArtifact(
			octokit,
			oldArtifactName
		);

		console.log( oldAssets );

		if ( ! oldAssets ) {
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
						added: [],
						removed: [],
					};
					return currentChanges.length
						? [ key, currentChanges ]
						: null;
				} )
				.filter( Boolean )
		);

		console.log( changes );

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

		octokit.issues.createComment( {
			owner,
			repo,
			issue_number: prNumber,
			body: message,
		} );
	} catch ( error ) {
		core.setFailed( error.message );
	}
};

runner();
