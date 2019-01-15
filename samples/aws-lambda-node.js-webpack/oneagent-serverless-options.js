/**
 * export a function which returns the serverless-oneagent options
 */
module.exports = () => {
	return {
		// DYNATRACE serverless- oneagent plugin configuration.
		"serverless-oneagent": {
			// npmModuleVersion: string, optional, valid values are: next
			npmModuleVersion: "next",

			// copy options from serverless configuration screen(Deploy Dynatrace > Setup Serverless integration > Node.js)
			// alternatively, options can be specified on command line with --dt - oneagent - options e.g.
			// $ serverless--dt - oneagent - options='...' package
			options: '{"dynatraceTagPropertyPath":"headers.x-dynatrace","server":"...","tenant":"...","tenanttoken":"..."}',

			// enables extended logging of plugin operations
			// alternatively, --verbose command line option can be set
			verbose: true
		}
	};
}
