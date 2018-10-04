# Sample project with two AWS Lambda functions and serverless-webpack

The project will deploy two AWS Lambda functions with serverless-webpack and Dynatrace OneAgent.

Please modify value of `DT_LAMBDA_OPTIONS` environment variable in `serverless.yml` according the options for your environment.

```yaml
  environment:
      DT_LAMBDA_OPTIONS: '{"dynatraceTagPropertyPath":"headers.x-dynatrace","server":"...","tenant":"...","tenanttoken":"..."}'
```

Alternatively, options can be specified with `--dt-oneagent-options` command line argument.

```shell
serverless deploy --dt-oneagent-options='{"dynatraceTagPropertyPath":"headers.x-dynatrace","server":"...","tenant":"...","tenanttoken":"..."}'
```
