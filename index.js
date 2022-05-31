const core = require('@actions/core');
const {
  CodeartifactClient,
  GetAuthorizationTokenCommand,
  GetRepositoryEndpointCommand,
  // eslint-disable-next-line no-unused-vars
  GetRepositoryEndpointCommandOutput,
  PackageFormat,
} = require('@aws-sdk/client-codeartifact');

async function run() {
  try {
    const repository = core.getInput('domain');
    const domain = core.getInput('domain');
    const domainOwner = core.getInput('domain-owner');
    const durationSeconds = core.getInput('duration-seconds');

    const client = new CodeartifactClient({
      region: 'eu-central-1',
    });

    const getRepositoryEndpointCmd = new GetRepositoryEndpointCommand({
      domain,
      domainOwner,
      repository,
      format: PackageFormat.PYPI,
    });

    /** @type GetRepositoryEndpointCommandOutput */
    const endpointResult = await client.send(getRepositoryEndpointCmd);

    core.exportVariable('CODEARTIFACT_ENDPOINT_PYPI', endpointResult.repositoryEndpoint);
    core.info(`PyPi Repository Endpoint URL: ${endpointResult.repositoryEndpoint}`);
    core.setOutput('endpoint-pypi', endpointResult.repositoryEndpoint);

    const getAuthorizationTokenCmd = new GetAuthorizationTokenCommand({
      domain,
      domainOwner,
      durationSeconds
    });

    const tokenResult = await client.send(getAuthorizationTokenCmd);
    core.exportVariable('CODEARTIFACT_AUTH_TOKEN', tokenResult.authorizationToken);
    core.setSecret(tokenResult.authorizationToken);

  } catch (error) {
    core.setFailed(error.message);
  }
}

exports.run = run;

if (require.main === module) {
  run();
}
