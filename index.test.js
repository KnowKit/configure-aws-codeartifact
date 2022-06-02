const core = require('@actions/core');
const {mockClient} = require('aws-sdk-client-mock');
const {CodeartifactClient, GetRepositoryEndpointCommand, GetAuthorizationTokenCommand} = require('@aws-sdk/client-codeartifact');
const {run} = require('./index');

jest.mock('@actions/core');

const codeArtifactMock = mockClient(CodeartifactClient);

const CODEARTIFACT_ENDPOINT_PYPI = 'https://endpoint.codeartifact.pypi';
const CODEARTIFACT_AUTH_TOKEN = 'asdfgqwert';

describe('configure-aws-codeartifact', () => {

  beforeEach(() => {
    codeArtifactMock.reset();
  });

  test('exports env vars', async () => {
    codeArtifactMock.on(GetRepositoryEndpointCommand).resolvesOnce({
      repositoryEndpoint: CODEARTIFACT_ENDPOINT_PYPI
    });

    codeArtifactMock.on(GetAuthorizationTokenCommand).resolvesOnce({
      authorizationToken: CODEARTIFACT_AUTH_TOKEN
    });

    await run();
    expect(core.exportVariable).toHaveBeenCalledWith('CODEARTIFACT_ENDPOINT_PYPI', CODEARTIFACT_ENDPOINT_PYPI);
    expect(core.setOutput).toHaveBeenCalledWith('endpoint-pypi', CODEARTIFACT_ENDPOINT_PYPI);
    expect(core.exportVariable).toHaveBeenCalledWith('CODEARTIFACT_AUTH_TOKEN', CODEARTIFACT_AUTH_TOKEN);
    expect(core.setSecret).toHaveBeenCalledWith(CODEARTIFACT_AUTH_TOKEN);
  });
});
