
import path from 'path';
import fs from 'fs';
import tempWrite from 'temp-write';
import dotProp from 'dot-prop';
import createWpThemeAuditor from '.';

const { get } = dotProp;

jest.setTimeout( 90000 );

async function run( pkg ) {
	const filepath = tempWrite.sync( JSON.stringify( pkg ), 'package.json' );

	await createWpThemeAuditor( {
		cwd: path.dirname( filepath ),
		skipInstall: true,
		quiet: true,
	} );

	return JSON.parse( fs.readFileSync( filepath, 'utf8' ) );
}

test( 'Scripts added to empty package.json', async () => {
	const pkg = await run( {} );
	expect( get( pkg, 'scripts.create-test-cases' ) ).toBe( 'create-test-cases' );
	expect( get( pkg, 'scripts.test:axe' ) ).toBe( 'wp-scripts test-e2e' );
	expect( get( pkg, 'scripts.test' ) ).toBe( 'npm run -s test:axe' );
} );

test( 'Scripts added to package.json with existing scripts', async () => {
	const pkg = await run( { scripts: {
		lint: 'wp-scripts lint-js',
	} } );
	expect( get( pkg, 'scripts.create-test-cases' ) ).toBe( 'create-test-cases' );
	expect( get( pkg, 'scripts.test:axe' ) ).toBe( 'wp-scripts test-e2e' );
	expect( get( pkg, 'scripts.test' ) ).toBe( 'npm run -s test:axe' );
} );

test( 'Scripts added to package.json with default test', async () => {
	const pkg = await run( {
		scripts: {
			test: 'echo "Error: no test specified" && exit 1',
		},
	} );
	expect( get( pkg, 'scripts.create-test-cases' ) ).toBe( 'create-test-cases' );
	expect( get( pkg, 'scripts.test:axe' ) ).toBe( 'wp-scripts test-e2e' );
	expect( get( pkg, 'scripts.test' ) ).toBe( 'npm run -s test:axe' );
} );

test( 'Scripts added to package.json which already has test:axe', async () => {
	const pkg = await run( {
		scripts: {
			test: 'npm run -s test:axe',
		},
	} );

	expect( get( pkg, 'scripts.create-test-cases' ) ).toBe( 'create-test-cases' );
	expect( get( pkg, 'scripts.test:axe' ) ).toBe( 'wp-scripts test-e2e' );
	expect( get( pkg, 'scripts.test' ) ).toBe( 'npm run -s test:axe' );
} );

test( 'Scripts added to package.json which already has other tests', async () => {
	const pkg = await run( {
		scripts: {
			test: 'npm run -s lint',
		},
	} );

	expect( get( pkg, 'scripts.create-test-cases' ) ).toBe( 'create-test-cases' );
	expect( get( pkg, 'scripts.test:axe' ) ).toBe( 'wp-scripts test-e2e' );
	expect( get( pkg, 'scripts.test' ) ).toBe( 'npm run -s test:axe && npm run -s lint' );
} );

test( 'Installs the wp-theme-auditor dependency', async () => {
	const filepath = tempWrite.sync( JSON.stringify( {} ), 'package.json' );
	await createWpThemeAuditor( {
		cwd: path.dirname( filepath ),
		quiet: true,
	} );
	expect( get( JSON.parse( fs.readFileSync( filepath, 'utf8' ) ), 'devDependencies.wp-theme-auditor' ) ).toBeTruthy();
} );

test( 'Installs the wp-theme-auditor dependency via yarn if there\'s a lockfile', async () => {
	const yarnLock = tempWrite.sync( '', 'yarn.lock' );
	await createWpThemeAuditor( {
		cwd: path.dirname( yarnLock ),
		quiet: true,
	} );
	expect( fs.readFileSync( yarnLock, 'utf8' ) ).toMatch( /wp-theme-auditor/ );
} );
