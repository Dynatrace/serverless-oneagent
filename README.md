# Dynatrace OneAgent serverless plugin

This plugin for [serverless framework](https://github.com/serverless/serverless) will add Dynatrace OneAgent automatically to serverless deployments.

## Configuration

The Dynatrace OneAgent serverless plugin will configure serverless and serverless-webpack to bundle [Dynatrace npm module for PaaS](https://github.com/Dynatrace/agent-nodejs).

Enabling your serverless project for Dynatrace OneAgent involves two steps:

1. add the plugin to the serverless project
2. specify OneAgent options

### Add `@dynatrace/serverless-oneagent` to `serverless.yml`

Extend the `plugins` list of the projects `serverless.yml` file with `@dynatrace/serverless-oneagent` plugin.

```yaml {.line-numbers}
service: dynatrace-oneagent-sample

plugins:
  - '@dynatrace/serverless-oneagent'

provider:
  name: aws
  runtime: nodejs6.10

functions:
  hello:
    handler: index.hello
    events:
      - http:
          method: GET
          path: hello
```

### Specify OneAgent options

OneAgent monitoring your serverless function expects its options in `DT_LAMBDA_OPTIONS` environment variable.

> The option string can be obtained from serverless configuration screen (Deploy Dynatrace > Setup Serverless integration).

Thus, the options can be added by extending the `environment` list entries in the projects `serverless.yml`. The option string must be enclosed with single quotes.

```yaml
  environment:
      DT_LAMBDA_OPTIONS: '{"dynatraceTagPropertyPath":"headers.x-dynatrace","server":"...","tenant":"...","tenanttoken":"..."}'
```

If you do not want to add OneAgent options to the `serverless.yml` , the options can be specified as a command line argument to serverless (sls) command.

```shell
serverless deploy --dt-oneagent-options='{"dynatraceTagPropertyPath":"headers.x-dynatrace","server":"...","tenant":"...","tenanttoken":"..."}'
```

## Samples

+ AWS Lambda with Node.js runtime [serverless](samples/aws-lambda-node.js/README.md)
+ AWS Lambda with Node.js runtime and serverless-webpack [serverless](samples/aws-lambda-node.js-webpack/README.md)

## Limitations

+ Dynatrace AWS Lambda support is in Early Access phase. Please contact a Dynatrace representative to apply for early access.
+ This plugin supports AWS Lambda with Node.js runtime deployments only.