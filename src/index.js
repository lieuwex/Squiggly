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

(function () {
	"use strict";

	var minimist = require("minimist");
	var interpreter = require("./interpreter/");
	var argv = minimist(process.argv.slice(2));
	var fs = require("fs");

	function printHelp () {
		console.log(
			"'{}' [options] <arguments>\n" +
			"Flags:\n" +
			"\t--command/-c <str> | Executes `str` as {} code."
		);
	}

	function prompt () {
		// readline?
	}

	var help = argv.h || argv.help;
	var command = argv.c || argv.command;
	var runner;

	if (help) { // help
		printHelp();
	} else if (command) { // inline commands
		if (typeof command === "string") {
			var lines = command.split("\\n");
			runner = interpreter(lines);
		} else {
			printHelp();
		}
	} else if (argv._.length > 0) {
		argv._.forEach(function (arg) {
			fs.readFile(arg, function (file) {
				runner = interpreter(file.split("\n"));
			});
		});
	} else { //repl
		while(prompt()) {}
	}
})();
