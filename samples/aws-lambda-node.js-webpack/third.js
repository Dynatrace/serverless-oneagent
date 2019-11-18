"use strict";

module.exports.handler = function (event, context, cb) {
	cb(null, {
		message: "Hello World from third.js", event
	});
};
