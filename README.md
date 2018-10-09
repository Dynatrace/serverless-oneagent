# Dynatrace OneAgent Serverless plugin

![Dynatrace Logo](res/Dynatrace_Logo.png)

dynatrace-oneagent is a plugin for [serverless framework](https://github.com/serverless/serverless) which will add Dynatrace monitoring automatically to serverless deployments.

> Enable Dynatrace monitoring of your serverless functions in a jiffy.

## Configuration

The Dynatrace OneAgent serverless plugin will configure serverless and serverless-webpack to bundle [Dynatrace npm module for PaaS](https://github.com/Dynatrace/agent-nodejs).

Enabling your serverless project for Dynatrace OneAgent is a two steps process:

1. add plugin to `serverless.yml`
2. specify OneAgent options

### Add plugin to `serverless.yml`

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

OneAgent options can be specified in `serverless.yml` file or serverless (sls) command line.

> The option string can be obtained from serverless configuration screen (Deploy Dynatrace > Setup Serverless integration).

Add following to `serverless.yml`:

```yaml
custom:
  serverless-oneagent:
    options: '{"server":"...","tenant":"...", "tenanttoken":"..."}'
```

If you do not want to add OneAgent options to the `serverless.yml` , the options can be specified as a command line argument to serverless (sls) command.

```shell
serverless deploy --dt-oneagent-options='{"dynatraceTagPropertyPath":"headers.x-dynatrace","server":"...","tenant":"...","tenanttoken":"..."}'
```

### Options summary

| `serverless.yml`| command line | description |
| ---| ---| --- |
| options | --dt-oneagent-options=\<option string\> | Specifies OneAgent options |
| npmModuleVersion | --dt-oneagent-module-version=\<version\> | specifies the version of OneAgent for PaaS module. Specify next for @next version.|
| verbose | --verbose | enables extended output of plugin processing. --verbose enables verbose mode for all plugins, while verbose option in `serverless.yml` enables verbose output for this plugin only.

```yaml
custom:
  serverless-oneagent:
    # enable serverless-oneagent plugin verbose mode
    verbose: true
    # specify @next Dynatrace OneAgent npm module
    npmModuleVersion: next
```

```shell
serverless deploy --dt-oneagent-module-version=next --dt-oneagent-options='{"dynatraceTagPropertyPath":"headers.x-dynatrace","server":"...","tenant":"...","tenanttoken":"..."}' --verbose
```

## Samples

The samples folder contains ready to go serverless projects.

+ AWS Lambda with Node.js runtime [serverless](samples/aws-lambda-node.js/README.md)
+ AWS Lambda with Node.js runtime and serverless-webpack [serverless](samples/aws-lambda-node.js-webpack/README.md)

## Supported provider and runtime environments

+ The current plugin version supports following deployments
  + AWS Lambda with Node.js runtime version 4.x, 6.x, and 8.x
+ Dynatrace AWS Lambda support is in Early Access phase. Please contact a Dynatrace representative to register for program participation.

## Support

In case of problems, feature requests, or questions submit a [ticket](https://github.com/Dynatrace/serverless-oneagent/issues).