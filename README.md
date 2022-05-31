# Configure AWS CodeArtifact

This github action sets the CodeArtifact auth-token so it can be used by later workflow steps.

When AWS CodeArtifact is used as artifactory-store then this actions is useful.

## Usage

Add the following step to your workflow:

```yaml
    - name: Configure AWS CodeArtifact
      uses: KnowKit/configure-aws-codeartifact@v1
      with:
        domain: my-codeartifact-domain
        domain-owner: my-codeartifact-domain-owner-account-id
        duration-seconds: optional-token-duration-in-seconds
```

