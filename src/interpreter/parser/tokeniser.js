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
	//	 ~ Have an ignore token for whitspace. (this will be ignored in strings,
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
		var _currentWalkPossibleTokens = tokensMap;
		var _currentWalkedOn = [];
		var _currentWalkIndex = 0;
		var _currentWalkStart = 0;
		var _currentWalkUnknown = false;

		var _currentStringInfo = {
			inInterpolation: false,
			// The string token that started this string. If null we're not in a string.
			token: null,
			content: "",
			start: null,
			end: null,

			reset: function () {
				this.inInterpolation = false;
				this.token = null;
				this.content = "";
				this.start = null;
				this.end = null;
			}
		}

		var resetCurrentWalk = function () {
			_currentWalkPossibleTokens = tokensMap;
			_currentWalkedOn = [];
			_currentWalkIndex = 0;
			_currentWalkStart = 0;
			_currentWalkUnknown = false;
		}

		var inString = function () {
			return _currentStringInfo.token != null;
		}

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
			default:
				str += errType;
				break;
			};

			throw new Error(str);
		}

		return {
			tokens: [],

			walkOverLine: function (str, lineNumber) {
				var _tokens = this.tokens;

				// This will be hint when an unknown symbol or EOL is hit.
				var tryFinishCurrentWalk = function (char) {
					if (inString() && !_currentStringInfo.inInterpolation) {
						error(
							"string_not_ended",
							lineNumber,
							_currentStringInfo.start
						);
					} else if (_currentWalkIndex === 0) {
						// We aren't in a walk.
						if (_currentWalkUnknown) {
							_tokens.push({
								token: "word",
								content: _currentWalkedOn.join(""),
								start: char - _currentWalkedOn.length,
								end: char
							})
						} else {
							return false;
						}
					} else {
						var tokens = findTokens(function (token, tokenType) {
							return _currentWalkedOn.join("") === token;
						});

						if (tokens.length === 1) {
							_tokens.push({
								token: tokens[0][1],
								start: _currentWalkStart,
								end: _currentWalkStart + _currentWalkIndex - 1
							});
							return true;
						}
						return false;
					}
				}

				function tokenStartsWith (str) {
					return _(tokensMap).keys().any(function (token) {
						return token.indexOf(str) === 0;
					});
				}

				for (var i = 0; i < str.length; i++) {
					var char = str[i];
					var token = null;

					var tokens = findTokens(function (token, tokenType) {
						return char === token[_currentWalkIndex];
					}, _currentWalkPossibleTokens);

					if (
						tokens.length === 1 &&
						(_currentWalkUnknown ||
						tokens[0][0] === _currentWalkedOn.concat([ char ]).join(""))
					) {
						token = tokens[0];
					}

					if (DEBUG) {
						console.log(
							i,
							char,
							_currentWalkIndex,
							tokens,
							(token && token[1]),
							_currentWalkedOn
						);
					}

					if (token != null) { // Token found
						if (token[1] === "interpolate_string") {
							if (_.contains(interpolationStrings, _currentStringInfo.token)) {
								_currentStringInfo.inInterpolation = !_currentStringInfo.inInterpolation;
							} else if (inString()) {
								error("not_in_interpolation_string", lineNumber, i);
							} else {
								error("not_in_string", lineNumber, i);
							}
						} else if (token[1] === "string" && !_currentStringInfo.inInterpolation) {
							if (_currentStringInfo.token === char) { // We were in a string and token is the same as the current string's token -> string ended.
								_currentStringInfo.token = null;
								_currentStringInfo.end;
								this.tokens.push({
									token: "string",
									content: _currentStringInfo.content,
									start: _currentStringInfo.start,
									end: i
								});
							} else { // We weren't in a string, token is string -> string started.
								_currentStringInfo.token = char;
								_currentStringInfo.start = i;
							}
						} else if (!inString() || _currentStringInfo.inInterpolation) { // Non-string token.
							this.tokens.push({
								token: token[1],
								start: i - _currentWalkIndex,
								end: i
							});
						}

						resetCurrentWalk();
						continue;
					} else if (inString() && !_currentStringInfo.inInterpolation) { // Add string content
						if (char === '\\') {
							var nextChar = str[i + 1];

							if (nextChar === '\\') {
								_currentStringInfo.content += '\\';
							} else if (nextChar === 'n') {
								_currentStringInfo.content += '\n';
							} else if (nextChar === 't') {
								_currentStringInfo.content += '\t';
							} else if (nextChar === '"') {
								_currentStringInfo.content += '"';
							} else if (nextChar === "'") {
								_currentStringInfo.content += "'";
							} else {
								continue;
							}

							i++;
						} else {
							_currentStringInfo.content += char;
						}
						continue;
					} else if (tokens.length === 0 && !_currentWalkUnknown) { // No token.
						// Try to finish previous walk.
						var walkEnded = tryFinishCurrentWalk(i);
						if (walkEnded) {
							resetCurrentWalk();
							continue;
						}
					}

					if (_currentWalkIndex === 0) {
						_currentWalkStart = i;
					}
					if (tokenStartsWith(char)) {
						if (_currentWalkUnknown) {
							tryFinishCurrentWalk(i);
							resetCurrentWalk();
						}

						_currentWalkIndex++;
						_currentWalkPossibleTokens = _.zipObject(tokens);
						_currentWalkedOn.push(char);
					} else if (char.trim() === char) {
						_currentWalkedOn.push(char);
						_currentWalkUnknown = true;
					}
				}

				tryFinishCurrentWalk(str.length - 1);
				_currentStringInfo.reset();
				_.remove(this.tokens, function (token) {
					return _.isEmpty(token.token);
				});
			}
		}
	}

	module.exports = Tokeniser;
})();
