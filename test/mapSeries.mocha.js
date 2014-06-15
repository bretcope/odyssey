"use strict";

var assert = require('assert');
var odyssey = require('../');

var athena = odyssey.athena;

suite('Map Series', function ()
{
	test('Sync Example', function (done)
	{
		var output = '';
		athena.mapSeries
		(
			{ 0: 'one', 1: 'two', 2: 'three'},
			function (cb, item, index)
			{
				output += item;
				cb(null, 'Hey ' + index + ' ' + item);
			},
			function (hlog, results)
			{
				assert(!hlog.failed);
				assert(results[1] === 'Hey 1 two');
				assert(output === 'onetwothree');

				done();
			}
		);
	});

	test('Async Example', function (done)
	{
		var output = '';
		athena.mapSeries
		(
			[ 'one', 'two', 'three'],
			function (cb, item, index)
			{
				setTimeout(function ()
				{
					output += item;
					cb(null, 'Hey ' + index + ' ' + item);
					
				}, 10 - (3 * index)); // take less time each time - will screw up if not series
			},
			function (hlog, results)
			{
				assert(!hlog.failed);
				assert(results[1] === 'Hey 1 two');
				assert(output === 'onetwothree');

				done();
			}
		);
	});
});
