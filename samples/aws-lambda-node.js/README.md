# Deploy two AWS Lambda functions with serverless

The project will deploy two AWS Lambda functions with Dynatrace OneAgent.

Before packaging or deployment, add OneAgent options to `serverless.yml` file:

```yaml
custom:
  serverless-oneagent:
    options: '{"server":"...","tenant":"...", "tenanttoken":"..."}'
```

Alternatively, options can be specified with `--dt-oneagent-options` command line argument.

```shell
serverless deploy --dt-oneagent-options='{"dynatraceTagPropertyPath":"headers.x-dynatrace","server":"...","tenant":"...","tenanttoken":"..."}'
```
