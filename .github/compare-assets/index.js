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
					const currentChanges = dependencies.filter(
						( dependency ) =>
							! oldDependencies.includes( dependency )
					);
					return currentChanges.length
						? [ key, currentChanges ]
						: null;
				} )
				.filter( Boolean )
		);

		console.log( changes );
	} catch ( error ) {
		core.setFailed( error.message );
	}
};

runner();
