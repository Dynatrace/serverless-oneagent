"use strict";

const leftpad = require("left-pad");

module.exports.hello = (event, context, cb) => {
	console.log
	cb(null, {
		message: leftpad("Dynatrace OneAgent with serverless", 80),
		event
	});
};
