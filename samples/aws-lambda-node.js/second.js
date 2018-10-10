"use strict";

module.exports.hello = function (event, context, cb) {
	cb(null, {
		message: "Hello World from second.js", event
	});
};
