/* eslint-disable no-console */
'use strict';
const path = require( 'path' );
const readPkgUp = require( 'read-pkg-up' );
const writePkg = require( 'write-pkg' );
const execa = require( 'execa' );
const hasYarn = require( 'has-yarn' );

const DEFAULT_TEST_SCRIPT = 'echo "Error: no test specified" && exit 1';

const buildTestScript = ( test ) => {
	if ( test && test !== DEFAULT_TEST_SCRIPT ) {
		// Don't add if it's already there
		if ( ! /^test:axe( |$)/.test( test ) ) {
			return `test:axe && ${ test }`;
		}

		return test;
	}

	return 'test:axe';
};

module.exports = async ( options = {} ) => {
	const packageResult = readPkgUp.sync( {
		cwd: options.cwd,
		normalize: false,
	} ) || {};
	const packageJson = packageResult.package || {};
	const packagePath = packageResult.path || path.resolve( options.cwd || '', 'package.json' );

	packageJson.scripts = packageJson.scripts || {};
	packageJson.scripts[ 'test:axe' ] = 'wp-scripts test-e2e';
	packageJson.scripts.test = buildTestScript( packageJson.scripts.test );

	writePkg.sync( packagePath, packageJson );

	const post = () => {
		// Post install commands.
	};

	if ( options.skipInstall ) {
		post();
		return;
	}

	const packageCwd = path.dirname( packagePath );

	if ( hasYarn( packageCwd ) ) {
		try {
			await execa( 'yarn', [ 'add', '--dev', '--ignore-workspace-root-check', 'wpaccessibility/wp-theme-auditor' ], { cwd: packageCwd } );
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
	post();
};
