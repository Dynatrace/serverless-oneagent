# Change Log

## Version 1.0.14

- added capability to exclude functions from instrumentation

## Version 1.0.13

- DT_LAMBDA_HANDLER support for WebPack projects

## Version 1.0.12

- fix issue setting DT_LAMBDA_HANDLER in function definition

## Version 1.0.11

- support for DT_LAMBDA_HANDLER environment variable (resolves issues with handlers in subfolders)

## Version 1.0.10

- Node.js 10.x runtime support

## Version 1.0.9

- [do not rewrite function handlers of non Node.js runtime Lambda functions](https://github.com/Dynatrace/serverless-oneagent/issues/8)

## Version 1.0.8

- do not rewrite function handlers of non Node.js runtime Lambda functions
- created this file

## Version 1.0.7

- prevent premature check of OneAgent options (before variables get expanded in serverless.yml)

## Version 1.0.6

- Fixed issue reading plugin configuration before serverless variables have been expanded
- Added verification for OneAgent option string option string
