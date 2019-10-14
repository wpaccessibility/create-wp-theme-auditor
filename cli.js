#!/usr/bin/env node
'use strict';
const createWpThemeAuditor = require( '.' );

createWpThemeAuditor( {
	args: process.argv.slice( 2 ),
} );
