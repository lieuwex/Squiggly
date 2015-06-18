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

const DEBUG = false;

(function () {
	"use strict";

	var _ = require("lodash");

	// TODO:
	//	 ~ Ignore tokens while in string.
	//	 ~ Have an ignore token for whitespace. (this will be ignored in strings,
	//	   see #1) (or at least handle whitespace).
	//	 ~ Default type for normal words.
	//	 ~ Don't ignore escaped strings, instead give them their own token and
	//	   during processing error when they're used outside of a string.
	//	 - Error tolerate parsing.

	var tokensMap = {
		"{": "open_block",
		"?{": "open_block_lazy",
		"??{": "open_block_func",
		"}": "close_block",
		"}&": "close_block_async",
		"[": "open_subscript",
		"]": "close_subscript",
		"(": "open_paren",
		")": "close_paren",
		'"': "string",
		"'": "string",
		":": "key_val_seperator",
		":=": "create_var",
		"=": "set_var",
		"==": "equals",
		"!": "reverse",
		"!=": "not_equals",
		"?": "question_mark",
		"if": "if",
		"try": "try",
		"`": "interpolate_string",

		// ignore tokens

		// these are not used inside strings, we have a sepcial handling for them.
		// but these are for info out of strings, so we can throw an error if we
		// hit one.
		"\\'": "escaped_string",
		'\\"': "escaped_string",

		"\\`": null
	};

	var interpolationStrings = ['"'];

	function findTokens (func, tokens) {
		return _(tokens || tokensMap).pairs().filter(function (pair) {
			return func.apply(this, pair);
		}).value();
	}

	function Tokeniser () {
		var _currentWord = '';

		var error = function (errType, lineNumber, charIndex) {
			var str = "";
			var prefixes = [];
			var errType = errType.toUpperCase();

			if (lineNumber != null) prefixes.push("at line " + lineNumber);
			if (charIndex != null) prefixes.push("at character " + charIndex);

			str += prefixes.join(", ");
			if (prefixes.length) str += ": ";

			switch (errType) {
			case "STRING_NOT_ENDED":
				str += "No corresponding token found for this string.";
				break;
			case "NOT_IN_STRING":
				str += "Not in a string.";
				break;
			case "NOT_IN_INTERPOLATION_STRING":
				str += "You can only interpolate in a string of one of ['" + interpolationStrings.join("', '") + "'] string tokens.";
				break;
			case "INTERPOLATION_NOT_ENDED":
				str += "No corresponding token found for this interpolation.";
				break;
			default:
				str += errType;
				break;
			};

			throw new Error(str);
		};

		return {
			tokens: [],

			walkOverLine: function (str, lineNumber) {
				var _tokens = [];

				for (var currentChar = 0; currentChar < str.length; currentChar++) {
					var char = str[currentChar];

					var tokens = _(tokensMap)
						.pairs()
						.filter(function (pair) {
							var x = true;
							if (/\w/.test(pair[0][0])) { // for keyword type statments we want a non word char before them.
								x = currentChar === 0 ||
									/\W/.test(str[currentChar - 1])
							}
							return x && pair[0][0] === char;
						})
						.sortBy(function (pair) {
							return pair[0].length;
						})
						.reverse()
						.value();

					var anyToken = false;
					_.forEach(tokens, function (token) {
						for (var i = 1; i < token[0].length; i++) {
							if (str[currentChar + i] !== token[0][i]) {
								// can't be this token.
								return;
							}
						}

						if (token[1] === 'interpolate_string') {
							error(
								'not_in_string',
								lineNumber,
								currentChar
							);
						}

						anyToken = true;

						if (token[1] === 'string') {
							var i = currentChar + 1;
							var reachedStringEnd = false;
							while (!reachedStringEnd) {
								var c = str[i];
								if (c === token[0] && str[i-1] != '\\') {
									reachedStringEnd = true;
								} else if (c == null) {
									error(
										'string_not_ended',
										lineNumber,
										currentChar
									);
								}
								i++;
							}
							var begin = currentChar;
							currentChar = i;
							var t = {
								token: 'string',
								content: str.substring(begin + 1, currentChar - 1),
								begin: begin,
								end: currentChar
							};
							var regResult = /\\?`.*\\?`/.exec(t.content);

							if (
								regResult !== null &&
								regResult[0] !== '\\' &&
								regResult[regResult.length - 2] !== '\\'
							) {
								var interpolation = regResult[0];
								var content = interpolation.substring(1, interpolation.length - 1);
								var interpolateStart = str.indexOf(interpolation) + 1;

								t.content = t.content.replace(interpolation, "");

								var tokeniser = new Tokeniser();
								tokeniser.walkOverLine(content);
								tokeniser.tokens.forEach(function (token) {
									_tokens.push(_.extend(token, {
										// The position of the new tokeniser resets at index 0.
										// This is not inline with the string we're in, adding
										// the starting position of the interpolation to the
										// start and end of every token should fix it.
										begin: token.begin + interpolateStart,
										end: token.end + interpolateStart
									}));
								});
							}

							_tokens.push(t);
						} else {
							var begin = currentChar;
							currentChar = currentChar + token[0].length - 1;
							_tokens.push({
								token: token[1],
								begin: begin,
								end: currentChar
							});
							return false; // break
						}
					});

					if (!anyToken && !/\s/.test(char)) {
						_currentWord += char;
					} else if (_currentWord.length > 0) {
						_tokens.push({
							token: 'word',
							content: _currentWord,
							begin: currentChar - _currentWord.length,
							end: currentChar
						});

						_currentWord = '';
					}
				}
				this.tokens = this.tokens.concat(_tokens);
				this.tokens = _.sortBy(this.tokens, "begin");
			}
		}
	}

	module.exports = Tokeniser;
})();
