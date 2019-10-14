/* eslint-disable no-console */
'use strict';
const ora = require( 'ora' );
const path = require( 'path' );
const readPkgUp = require( 'read-pkg-up' );
const writePkg = require( 'write-pkg' );
const execa = require( 'execa' );
const shell = require( 'shelljs' );
const hasYarn = require( 'has-yarn' );

const DEFAULT_TEST_SCRIPT = 'echo "Error: no test specified" && exit 1';

const buildTestScript = ( test ) => {
	if ( test && test !== DEFAULT_TEST_SCRIPT ) {
		// Don't add if it's already there
		if ( ! /^npm run -s test:axe( |$)/.test( test ) ) {
			return `npm run -s test:axe && ${ test }`;
		}

		return test;
	}

	return 'npm run -s test:axe';
};

const copyFiles = ( cwd ) => {
	const sourceDir = `${ cwd }/node_modules/wp-theme-auditor`;
	const destinationDir = cwd;
	shell.cp( '-u', `${ sourceDir }/babel.config.js`, destinationDir );
	shell.cp( '-u', `${ sourceDir }/jest.config.js`, destinationDir );
	shell.mkdir( '-p', `${ destinationDir }/test/support` );
	shell.cp( `${ sourceDir }/test/*.js`, `${ destinationDir }/test/` );
	shell.cp( `${ sourceDir }/test/support/*`, `${ destinationDir }/test/support/` );
	return destinationDir;
};

module.exports = async ( options = {} ) => {
	const packageResult = readPkgUp.sync( {
		cwd: options.cwd,
		normalize: false,
	} ) || {};
	const packageJson = packageResult.packageJson || {};
	const packagePath = packageResult.path || path.resolve( options.cwd || '', 'package.json' );
	const packageCwd = path.dirname( packagePath );

	const scriptsSpinner = ora( 'Adding test scripts...' );
	const configSpinner = ora( 'Installing test files...' );

	packageJson.scripts = packageJson.scripts || {};
	packageJson.scripts[ 'test:axe' ] = 'wp-scripts test-e2e';
	packageJson.scripts[ 'create-test-cases' ] = 'create-test-cases';
	packageJson.scripts.test = buildTestScript( packageJson.scripts.test );

	if ( ! options.quiet ) {
		scriptsSpinner.start();
	}

	writePkg.sync( packagePath, packageJson );

	if ( ! options.quiet ) {
		scriptsSpinner.succeed();
	}

	const post = () => {
		if ( ! options.quiet ) {
			configSpinner.start();
		}
		copyFiles( packageCwd );
		if ( ! options.quiet ) {
			configSpinner.succeed();
		}
	};

	if ( options.skipInstall ) {
		return;
	}

	const depsSpinner = ora( 'Adding wp-theme-auditor to dependencies...' );

	if ( ! options.quiet ) {
		depsSpinner.start();
	}

	if ( hasYarn( packageCwd ) ) {
		try {
			await execa( 'yarn', [ 'add', '--dev', '--ignore-workspace-root-check', 'wpaccessibility/wp-theme-auditor' ], { cwd: packageCwd } );

			if ( ! options.quiet ) {
				depsSpinner.succeed();
			}

			post();
		} catch ( error ) {
			if ( error.code === 'ENOENT' ) {
				console.error( 'This project uses Yarn but you don\'t seem to have Yarn installed.\nRun `npm install --global yarn` to install it.' );
				return;
			}

			throw error;
		}

		return;
	}

	await execa( 'npm', [ 'install', '--save-dev', 'wpaccessibility/wp-theme-auditor' ], { cwd: packageCwd } );

	if ( ! options.quiet ) {
		depsSpinner.succeed();
	}

	post();
};
