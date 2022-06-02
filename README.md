# Configure AWS CodeArtifact

This github action sets the CodeArtifact auth-token so it can be used by later workflow steps.

When AWS CodeArtifact is used as artifactory-store then this actions is useful.

## Usage

Add the following step to your workflow - after the `configure-aws-credentials` step:

```yaml
    - name: Configure AWS CodeArtifact
      uses: KnowKit/configure-aws-codeartifact@v1
      with:
        domain: my-codeartifact-domain
        domain-owner: my-codeartifact-domain-owner-account-id
        duration-seconds: optional-token-duration-in-seconds
```

## Full Example

1. create a IAM Policy with these permission:
    ```json
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Action": [
                    "codeartifact:Describe*",
                    "codeartifact:Get*",
                    "codeartifact:List*",
                    "codeartifact:Read*",
                    "codeartifact:PublishPackageVersion"
                ],
                "Resource": "*",
                "Effect": "Allow"
            },
            {
                "Condition": {
                    "StringEquals": {
                        "sts:AWSServiceName": "codeartifact.amazonaws.com"
                    }
                },
                "Action": "sts:GetServiceBearerToken",
                "Resource": "*",
                "Effect": "Allow"
            }
        ]
    }
    ```
   1. Create an IAM user oder role with this policy, to use in the `configure aws client` workflow-step.
      1. docs: 
         1. https://github.com/aws-actions/configure-aws-credentials
         2. https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
         3. https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html
      2. have a `pyproject.yaml` with a private (AWS CodeArtifact) repository:
         ```toml
         [[tool.poetry.source]]  
         name = "artifact"  
         url = "https://DOMAIN-OWNER.d.codeartifact.REGION.amazonaws.com/pypi/DOMAIN/simple"
         ```
         **⚠️**: The `/simple` at the end of the repo-url is important.

         (see next chapter for details on AWS CodeArtifact)
         
         docs:
         1. https://jasonstitt.com/private-packages-codeartifact-poetry-workflow
         2. https://docs.aws.amazon.com/codeartifact/latest/ug/python-compatibility.html
      3. create a workflow like this: 
       ```yaml
       name: build-pipeline
       on:
         push:
           paths:
             - ...
         workflow_dispatch: {}
       jobs:
         lint:
           runs-on: ubuntu-latest
           permissions:
             contents: read
           steps:
             - name: Checkout
               uses: actions/checkout@v2
             - name: configure aws client
               uses: aws-actions/configure-aws-credentials@v1
               with:
                 aws-region: eu-central-1
                 # using aws-user:
                 aws-access-key-id: ${{ secrets.AWS_CODEARTIACT_ACCESS_KEY }}
                 aws-secret-access-key: ${{ secrets.AWS_CODEARTIFACT_SECRET }}
                 # or github-oidc iam provider: 
                 role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
             - name: Configure AWS CodeArtifact
               uses: KnowKit/configure-aws-codeartifact@v1
               with:
                 domain: ${{ secrets.AWS_CODEARTIACT_DOMAIN }}
                 domain-owner: ${{ secrets.AWS_ACCOUNT_ID }}
             - name: Poetry Install
               run: poetry install
               with:
                 env:
                   POETRY_HTTP_BASIC_ARTIFACT_USERNAME: aws
                   POETRY_HTTP_BASIC_ARTIFACT_PASSWORD: ${{ env.CODEARTIFACT_AUTH_TOKEN }}
       ```

# CodeArtifact Intro

Github Packages supports everything, except `pypi` 😭 

And PyPi itself supports only public packages - but no organisations or private packages. See: https://dustingram.com/articles/2019/04/02/pypi-as-a-service/

What should you do to publish private packages in your org? 

Enter AWS CodeArtifact! (never heard of it before? me neither!)

## Create Repository with CDK

```kotlin
val domain = CfnDomain(  
    this,  
    "code-artifact-domain",  
    CfnDomainProps.builder()  
        .domainName(codeArtifactDomain)  
        .encryptionKey("alias/aws/codeartifact")  
        .build()  
)  
  
val repository = CfnRepository(  
    this,  
    "code-artifact-repository",  
    CfnRepositoryProps.builder()  
        .repositoryName(codeArtifactRepo)
        .domainName(codeArtifactDomain)
        .domainOwner(stageConfig.accountId)  
        .permissionsPolicyDocument(  
            mapOf(  
                "Version" to "2012-10-17",  
                "Statement" to listOf(  
                    mapOf<String, Any>(  
                        "Action" to listOf(  
                            "codeartifact:Describe*",  
                            "codeartifact:Get*",  
                            "codeartifact:List*",  
                            "codeartifact:Read*"  
                        ),  
                        "Resource" to "*",  
                        "Effect" to "Allow",  
                        "Principal" to mapOf(  
                            "AWS" to artifactUser.userArn  
                        ),  
                    )  
                )  
            )  
        )  
        .build()  
)
```

## PyProject.toml

```toml
[[tool.poetry.source]]  
name = "artifact"  
url = "https://DOMAIN-OWNER.d.codeartifact.REGION.amazonaws.com/pypi/DOMAIN/simple"
```

## Get the token (aws cli)

```shell
CODEARTIFACT_TOKEN=$(aws codeartifact get-authorization-token --domain knowkit --query authorizationToken --output text)
```

## Publish Package

```shell
poetry build
poetry publish --repository artifact --username aws --password $CODEARTIFACT_TOKEN
```


## Install Package

```shell
POETRY_HTTP_BASIC_ARTIFACT_USERNAME=aws POETRY_HTTP_BASIC_ARTIFACT_PASSWORD=$CODEARTIFACT_TOKEN poetry add my-private-pkg --source artifact
```

