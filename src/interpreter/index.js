/*
	{} is a programming language.
	Copyright (C) 2015 by Lieuwe Rooijakkers

	This file is part of {}.

	{} is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	{} is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.

	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
function getPrecedence (type) {
	switch (type) {
	case PAREN:
		return Infinity;

	case NUMBER:
	case INVALID:
	default:
		return -1;
	}
}

var stringChars = ["'", '"'];
var mapOfBlockThings = {
	"string": { open: stringChars, close: stringChars  },
	"block": { open: ['{'], close: ['}'] },
	"parens": { open: ['('] , close: [')'] }
};

function findBlockThings (str) {
	var blockThings = [];

	for (var i = 0; i < str.length; i++) {
		var char = str[i];

		for (key in mapOfBlockThings) {
			var val = mapOfBlockThings[key];
			if (_.contains(val.open, char)) {
				blockThings.push({
					type: key,
					begin: i,
					end: -1
				});
			} else {
				var x = _.findLast(blockThings, function (thing) {
					return thing.end === -1;
				});

				if (x) x.end = i;
				else throw new Error("Ending found for '" + key + "', though we're not currently in an open one.");
			}
		}
	}

	return blockThings;
}

function findTheHeckOutWhatWeAreTryingToDoHere (str) {
	var strings = [];
	var insideString = false;

	// Find strings.
	for (var i = 0; i < str.length; i++) {
		var char = str[i];

		if (_.contains(stringChars, char)) { // hit string char.
			if (!insideString) {
				strings.push({
					open: i,
					close: -1
				});
			} else if(str[i - 1] !== "\\") {
				strings[strings.length - 1].close = i;
			}

			insideString = !insideString;
		}
	}

}

module.exports = function (lines) {
	lines.forEach(function (line) {

	});
}
*/
var Tokeniser = require("./parser/tokeniser.js");

module.exports = function (lines) {
	var tokeniser = new Tokeniser();

	lines.forEach(function (line) {
		tokeniser.walkOverString(line);
	});

	console.log(tokeniser.tokens);
}
