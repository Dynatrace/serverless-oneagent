// ----------------------------------------------------------------------------
// The MIT License
//
// Copyright (c) 2018 Dynatrace Corporation
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
// ----------------------------------------------------------------------------

import * as Npm from "npm";
import * as ChildProcess from "child_process";
import * as Stream from "stream";
import * as Path from "path";
import * as Util from "util";
import * as FileSystem from "fs";
import * as _ from "lodash";

// ============================================================================

/*
 * set of typings for serverless
 */
namespace Serverless {

	export interface Instance {
		cli: {
			log(str: string): void;
		};

		config: {
			servicePath: string;
		};

		service: Service;

		pluginManager: PluginManager;

		getProvider(name: string): Provider;
	}

	export interface Service {
		provider: Provider;
		functions: { [key: string]: Function };
		plugins: string[];
		getAllFunctions: () => string[];

		custom?: {
			"serverless-oneagent"?: PluginYamlConfig,
			"webpack"?: ServerlessWebPackConfig
		};
	}

	export interface Provider {
		name: string;
		runtime: string;
		environment: {
			[key: string]: string;
		};
	}

	export interface CommandLineOptions {
		v?: boolean;
		verbose?: boolean;
		"dt-oneagent-options"?: string;
		"dt-debug"?: boolean;
		"dt-oneagent-module-version"?: string;
	}

	interface Function {
		handler: string;
	}

	interface PluginManager {
		spawn(command: string): Promise<void>;
		plugins: Plugin[];
	}

	//tslint:disable-next-line:no-empty-interface
	export interface Plugin {
		// intentionally left blank
	}

	interface CompileStatsEntry {
		compilation: {
			compiler: {
				outputPath: string;
			};
		};
	}

	export interface ServerlessWebpackPlugin extends Plugin {
		compileStats: {
			stats: CompileStatsEntry[];
		};
	}
}

// ============================================================================

interface ServerlessWebPackConfig {
	includeModules?: {
		forceInclude?: string[]
	};
}

// ============================================================================

/**
 * options that can be specified serverless.yml
 * custom:
 * 	serverless-oneagent:
 */
interface PluginYamlConfig {
	/**
	 * defines the version of the OneAgent npm module to be required
	 */
	npmModuleVersion?: string;

	/**
	 * OneAgent options
	 * '{"dynatraceTagPropertyPath":"headers.x-dynatrace","server":"...","tenant":"...","tenanttoken":"..."}'
	 */
	options?: string;

	/**
	 * sets DEBUG=dynatrace environment variable in deployed function
	 */
	debug?: boolean;

	/**
	 * verbose output of plugin execution
	 * enables --verbose mode only for this serverless plugin
	 */
	verbose?: boolean;
}

// ============================================================================

/**
 * helper class to suppress npm outputs to console
 * npm outputs clutter partially later log messages.
 */
class LogStream extends Stream.Duplex {
	constructor() {
		super();
	}

	public _write() {
		// intentionally left blank
	}

	public _read() {
		// intentionally left blank
	}
}

// ============================================================================

/**
 * depending on other installed plugins, this plugin will inject the agent
 * differently to the serverless deployment
 */
enum DeploymentMode {
	/**
	 * it is yet undetermined which mode we shall be running
	 */
	Undetermined,

	/**
	 * serverless without other (known) plugins that alter serverless packaging
	 * behavior
	 */
	PlainServerless,

	/**
	 * Webpack operation mode. Webpack preprocess .js files and create the zip
	 * package for serverless.
	 */
	Webpack,

	/**
	 * scopes of hooks can be bound to DeploymentMode. This tells that the the
	 * hook shall be installed disregarding the mode.
	 */
	All
}

// ============================================================================

/**
 * plugin configuration
 */
interface Config {
	/**
	 * set DEBUG=dynatrace in deployed function
	 */
	debug: boolean;

	/**
	 * enables / disables extended logging
	 */
	verbose: boolean;

	/**
	 * NodeAgent npm module version
	 */
	npmModuleVersion?: string;

	/**
	 * OneAgent option string
	 */
	agentOptions: string;
}

// ============================================================================

/**
 * implements a serverless plugin to inject Dynatrace OneAgent into a serverless
 * deployment (packaging)
 */
class DynatraceOneAgentPlugin {
	public readonly commands: { [key: string]: any } = {};
	public readonly hooks: { [key: string]: Function } = {};
	public readonly provider: Serverless.Provider;

	/**
	 * plugin ctor
	 * register for events and determine deployment mode
	 * @param serverless
	 * @param options
	 */
	public constructor(private readonly serverless: Serverless.Instance, options: Serverless.CommandLineOptions) {
		/*
		 * restrict this plugin to supported providers
		 */
		this.provider = this.serverless.getProvider("aws");

		this.initConfig(options);

		this.determineDeploymentMode();

		if (this.deploymentMode === DeploymentMode.Webpack) {
			this.preProcessServerlessWebPackDeployment();
		}

		this.defineEventHook("before:package:createDeploymentArtifacts", this.preProcessPlainServerlessDeployment, DeploymentMode.PlainServerless);
		this.defineEventHook("after:package:createDeploymentArtifacts", this.postProcessPlainServerlessDeployment, DeploymentMode.PlainServerless);

		this.defineEventHook("before:aws:common:validate", this.preProcessServerlessWebPackDeployment, DeploymentMode.Webpack);
		this.defineEventHook("after:webpack:package:packExternalModules", this.postProcessServerlessWebPackDeployment, DeploymentMode.Webpack);
	}

	/**
	 * @returns true if --verbose or -v options are set
	 */
	private get isVerbose() {
		return this.config.verbose;
	}

	/**
	 * @returns the requested Dynatrace OneAgent npm module version to be passed to npm (e.g. next)
	 */
	private get npmModuleVersion() {
		return this.config.npmModuleVersion;
	}

	/**
	 * get module name with optional version tag to be passed to npm install command
	 */
	private get qualifiedNpmModuleName() {
		return `@dynatrace/oneagent${!this.npmModuleVersion ? "" : "@" + this.npmModuleVersion}`;
	}

	/**
	 * Initialize plugin configuration from yaml or command line options
	 * @param options command line options as received from serverless framework
	 */
	private initConfig(options: Serverless.CommandLineOptions) {
		const ymlConfig = (_.get(this.serverless, "service.custom.serverless-oneagent") || {}) as PluginYamlConfig;

		this.config.verbose = ymlConfig.verbose || options.verbose || options.v || false;
		this.config.debug = ymlConfig.debug || options["dt-debug"] || false;
		this.config.agentOptions = options["dt-oneagent-options"] || ymlConfig.options || "";
		this.config.npmModuleVersion = options["dt-oneagent-module-version"] || ymlConfig.npmModuleVersion;
	}

	/**
	 * feed log messages to serverless logging facility
	 * @param msg
	 */
	private log(msg: string) {
		const lines = ("" + msg).split(/\n|\r\n/);
		lines.forEach((l) => {
			if (l.length > 0) {
				this.serverless.cli.log("[Dynatrace OneAgent] " + l);
			}
		});
	}

	/**
	 * conditional logging - log if --verbose / -v option is set
	 * @param msg
	 */
	private logVerbose(msg: string) {
		if (this.isVerbose) {
			this.log(msg);
		}
	}

	/**
	 * determine deployment mode from configured plugins
	 * determines deployment mode dependent on configured plugins
	 */
	private determineDeploymentMode() {
		if (this.serverless.service.plugins.some((p) => p === "serverless-webpack")) {
			this.deploymentMode = DeploymentMode.Webpack;
		} else {
			this.deploymentMode = DeploymentMode.PlainServerless;
		}
		this.logVerbose(`switching to '${DeploymentMode[this.deploymentMode]}' mode`);
	}

	/**
	 * utility function to define event hooks
	 * @param event event name to subscribe for
	 * @param hook method to call upon event
	 * @param appliesTo restrict hook execution to specific deployment mode
	 */
	private defineEventHook(event: string, hook: (this: DynatraceOneAgentPlugin) => void, appliesTo = DeploymentMode.All) {
		this.logVerbose(`installing listener for '${event}' in context of ${DeploymentMode[appliesTo]}`);
		this.hooks[event] = () => {
			if (this.deploymentMode === DeploymentMode.Undetermined) {
				this.determineDeploymentMode();
			}

			if (this.deploymentMode === appliesTo || appliesTo === DeploymentMode.All) {
				this.logVerbose(`executing event '${event}'`);
				return hook.apply(this);
			}
		};
	}

	/**
	 * preprocess a serverless-webpack deployment
	 * extend serverless-webpack configuration to force include the OneAgent npm module
	 * yaml:
	 * custom:
	 * 	webpack:
	 * 	  includeModules:
	 *      forceInclude:
	 *        - "@dynatrace/oneagent"
	 */
	private async preProcessServerlessWebPackDeployment() {
		if (_.has(this.serverless, "service.custom.webpack.includeModules.forceInclude")) {
			this.serverless.service.custom!.webpack!.includeModules!.forceInclude!.push(this.qualifiedNpmModuleName);
		} else {
			_.set(this.serverless, "service.custom.webpack.includeModules.forceInclude", [this.qualifiedNpmModuleName]);
		}

		await this.setDtLambdaOptions();
	}

	/**
	 * post process a serverless-webpack deployment
	 * serverless-webpack will install the OneAgent npm module. before webpack bundles the files to
	 * a zip package, apply following post processing:
	 * - tailor the npm module to the selected Node.js runtime version
	 * - rewrite Lambda function handler definition
	 */
	private async postProcessServerlessWebPackDeployment() {
		let tailoringSucceeded = Array.isArray(this.serverless.pluginManager.plugins);
		if (tailoringSucceeded) {
			try {
				// get ServerlessWebpack class
				const ctor = require("serverless-webpack");
				let slsw: Serverless.ServerlessWebpackPlugin | undefined;

				// search for the slsw plugin instance
				this.serverless.pluginManager.plugins.some((p) => {
					// p.compileStats.stats[0].compilation.compiler.outputPath
					if (p instanceof ctor) {
						slsw = p as Serverless.ServerlessWebpackPlugin;
					}
					return slsw !== undefined;
				});

				if (slsw !== undefined) {
					/*
					 * iterate all compilation results and invoke tailoring in the output folders
					 */
					tailoringSucceeded = _.has(slsw, "compileStats.stats") && Util.isArray(slsw.compileStats.stats);
					if (tailoringSucceeded) {
						const promises = slsw.compileStats.stats.map(async (cs) => {
							if (_.has(cs, "compilation.compiler.outputPath")) {
								await this.tailorOneAgentModule(cs.compilation.compiler.outputPath);
							} else {
								tailoringSucceeded = false;
							}
						});

						// wait for all tailoring scripts to finish
						await Promise.all(promises);
					}

				}
			} catch (e) {
				tailoringSucceeded = false;
			}
		}

		if (!tailoringSucceeded) {
			this.log(this.cannotTailorErrMsg);
		}

		await this.rewriteHandlerDefinitions();
	}

	/**
	 * plain serverless deployment preprocessing
	 * - install Dynatrace OneAgent npm module
	 * - tailor the module
	 * - set options
	 */
	private async preProcessPlainServerlessDeployment() {
		await this.npmInstallOneAgentModule();
		await this.tailorOneAgentModule();
		await this.setDtLambdaOptions();
	}

	/**
	 * plain serverless deployment post processing
	 * - rewrite handler definitions (this could be done in preprocessing, too)
	 * - uninstall npm module installed in preprocessing
	 */
	private async postProcessPlainServerlessDeployment() {
		await this.rewriteHandlerDefinitions();
		await this.npmUninstallOneAgentModule();
	}

	/**
	 * change all function handler definitions to load the agent first
	 * e.g. rewrite
	 *    handler: index.hello
	 * to
	 *    handler: node_modules/@dynatrace/oneagent.index$hello
	 */
	private rewriteHandlerDefinitions() {
		/*
		 * rewrite handler function specifications. do this in the aftermath of deployment artifacts
		 * creation. Rewriting the handler function before would trigger webpack attempt to bundle
		 * the OneAgent files.
		 */
		Object.keys(this.serverless.service.functions).forEach((k) => {
			const fn = this.serverless.service.functions[k];
			const origHandler = fn.handler;
			const splitted = origHandler.split(".");
			fn.handler = `node_modules/@dynatrace/oneagent/index.${splitted[0]}$${splitted[1]}`;
			this.log(`modifying Lambda handler ${k}: ${origHandler} -> ${fn.handler}`);
		});
	}

	/**
	 * The OneAgent npm module includes native extensions for all supported Node.js versions
	 * Lambda function is specified for a specific Node.js version, thus clear the unneeded
	 * binaries from the module to reduce zip package size
	 */
	private tailorOneAgentModule(nodeModulesPath = "./") {
		this.log(`tailoring OneAgent module in ${nodeModulesPath}`);
		return new Promise((resolve, reject) => {

			// determine selected runtime and version
			if (!_.has(this.serverless, "service.provider.runtime")) {
				this.log(this.cannotTailorErrMsg);
				reject();
				return;
			}

			const runtime = this.serverless.service.provider.runtime;
			const tailorArgs: string[] = [];
			const result = /nodejs([0-9]+).[0-9.]+/.exec(runtime);
			if (result !== null) {
				tailorArgs.push(`--AwsLambdaV${result[1]}`);
			} else {
				reject(`unsupported Lambda runtime '${runtime}'`);
				return;
			}

			try {
				// start tailoring script
				const cmd = Path.join(nodeModulesPath, "node_modules/.bin/dt-oneagent-tailor");

				FileSystem.accessSync(cmd);
				this.logVerbose(`executing ${cmd} ${tailorArgs.join(" ")}`);

				const child = ChildProcess.spawn(cmd, tailorArgs, { windowsHide: true });

				child.stdout.on("data", (data) => this.logVerbose(data));
				child.stderr.on("data", (data) => this.logVerbose(data));

				child.on("close", (rc, signal) => {
					if (rc === 0) {
						this.logVerbose("tailoring OneAgent module succeeded");
						resolve();
					} else {
						reject(signal);
					}
				});
			} catch (e) {
				this.log(`tailoring OneAgent module failed: ${e}`);
				reject(e);
			}
		});
	}

	/**
	 * run npm install programmatically to install OneAgent npm module
	 */
	private async npmInstallOneAgentModule() {
		await this.setupNpm();

		return new Promise((resolve, reject) => {
			this.log(`Installing Dynatrace oneagent npm module`);
			const args = [ this.qualifiedNpmModuleName ];

			Npm.commands.install(args, (err) => {
				if (!err) {
					this.logVerbose(`npm install succeeded`);
					resolve();
				} else {
					this.log(`npm install failed: ${err}`);
					reject(err);
				}
			});
		});
	}

	/**
	 * run npm uninstall programmatically to remove previously installed OneAgent npm module
	 */
	private npmUninstallOneAgentModule() {
		return new Promise((resolve, reject) => {
			this.log(`Uninstalling Dynatrace oneagent npm module`);
			const args = [ this.qualifiedNpmModuleName ];

			Npm.commands.uninstall(args, (err) => {
				if (!err) {
					this.logVerbose(`npm uninstall succeeded`);
					resolve();
				} else {
					this.log(`npm uninstall failed: ${err}`);
					reject(err);
				}
			});
		});
	}

	/**
	 * setup npm for module installation
	 */
	private setupNpm() {
		return new Promise((resolve, reject) => {
			// silence npm if not in verbose mode
			const options = {
				logstream: this.isVerbose ? process.stderr : new LogStream()
			};

			Npm.load(options, (err) => {
				// Npm.on("log", this.logVerbose.bind(this));

				if (!err) {
					this.logVerbose(`npm setup`);
					resolve();
				} else {
					this.log(`npm load failed: ${err}`);
					reject(err);
				}
			});
		});
	}

	/**
	 * set OneAgent options in environment
	 * OneAgent options can be passed by command line with --dt-oneagent-options='...'
	 */
	private setDtLambdaOptions() {
		if (this.config.agentOptions) {
			this.logVerbose(`adding environment variable DT_LAMBDA_OPTIONS='${this.config.agentOptions}'`);
			_.set(this.serverless, "service.provider.environment.DT_LAMBDA_OPTIONS", this.config.agentOptions);
		}
		if (this.config.debug) {
			this.logVerbose(`adding environment variable DEBUG=dynatrace`);
			_.set(this.serverless, "service.provider.environment.DEBUG", "dynatrace");
		}
	}

	/**
	 * plugin options
	 */
	private readonly config: Config = {
		verbose: false,
		debug: false,
		agentOptions: ""
	};
	private deploymentMode = DeploymentMode.Undetermined;
	private readonly cannotTailorErrMsg = "could not determine serverless-webpack intermediate files to tailor OneAgent" +
		"npm module(things will work, but zip package will contain files not need for selected Node.js runtime version";
}

module.exports = DynatraceOneAgentPlugin;
