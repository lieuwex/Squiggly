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
	//	 - Have an ignore token for whitspace. (this will be ignored in strings,
	//	   see #1) (or at least handle whitespace).
	//	 - Default type for normal words.
	//	 - Don't ignore escaped strings, instead give them their own token and
	//	   during processing error when they're used outside of a string.

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

		// ignore tokens
		"\\'": null,
		'\\"': null
	};

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

		var _inString = false;
		var _currentStringContent = "";

		function resetCurrentWalk () {
			_currentWalkPossibleTokens = tokensMap;
			_currentWalkedOn = [];
			_currentWalkIndex = 0;
			_currentWalkStart = 0;
		}

		function error (errtype, lineNumber, charIndex) {
			var str = "";
			if (lineNumber) str += "Error at line " + lineNumber;
			if (charIndex) str += ", character " + charIndex;
			if (lineNumber || charIndex) str += " ";

			switch (errtype) {
			case "string_not_ended":
				str += "String not ended correctly.";
			}

			throw new Error(str);
		}

		return {
			tokens: [],

			walkOverString: function (str, lineNumber) {
				var _tokens = this.tokens;
				// This will be hint when an unknown symbol or EOL is hit.
				function tryFinishCurrentWalk (line, char) {
					if (_inString) {
						error("string_not_ended", line, char);
					} else if (_currentWalkIndex === 0) {
						// We aren't in a walk.
						return false;
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

					if (tokens.length === 1 &&
						tokens[0][0] === _currentWalkedOn.concat([ char ]).join("")) {

						token = tokens[0];
					}

					if (DEBUG) console.log(i, char, _currentWalkIndex, tokens, (token&&token[1]), _currentWalkedOn);

					if (token != null) {
						if (token[1] === "string") {
							if (_inString) {
								_inString = false;
								this.tokens.push({
									token: "string",
									content: _currentStringContent,
									start: i - _currentStringContent.length - 1,
									end: i
								});
							} else {
								_inString = true;
							}
						} else if (!_inString) {
							this.tokens.push({
								token: token[1],
								start: i - _currentWalkIndex,
								end: i
							});
						}
						resetCurrentWalk();
					} else if (_inString) {
						_currentStringContent += char;
					} else {
						if (!tryFinishCurrentWalk()) {
							if (_currentWalkIndex === 0) {
								_currentWalkStart = i;
							}
							if (tokenStartsWith(char)) {
								_currentWalkIndex++;
								_currentWalkPossibleTokens = _.zipObject(tokens);
								_currentWalkedOn.push(char);
							}
						} else {
							resetCurrentWalk();
						}
					}
				}

				tryFinishCurrentWalk(lineNumber, str.length-1);
				_currentStringContent = "";
				_inString = false;
				_.remove(this.tokens, function (token) {
					return _.isEmpty(token.token);
				});
			}
		}
	}

	module.exports = Tokeniser;
})();
