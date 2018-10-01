# Sample project with two AWS Lambda functions

The project will deploy two AWS Lambda functions with Dynatrace OneAgent.

Please modify value of `DT_LAMBDA_OPTIONS` environment variable in `serverless.yml` according the options for your environment.

```yaml
  environment:
      DT_LAMBDA_OPTIONS: '{"dynatraceTagPropertyPath":"headers.x-dynatrace","server":"...","tenant":"...","tenanttoken":"..."}'
```

Alternatively, options can be specified with `--dt-lambda-options` command line argument.

```shell
serverless deploy --dt-lambda-options='{"dynatraceTagPropertyPath":"headers.x-dynatrace","server":"...","tenant":"...","tenanttoken":"..."}'
```
