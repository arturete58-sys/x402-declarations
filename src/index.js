const { empty, coverage } = require('./schema');
const { normalize, supported } = require('./adapters-index');
const { buildRequest, applyRequest } = require('./request');
const { isUsable } = require('./usable');
const { call } = require('./client');

module.exports = { normalize, coverage, supported, empty,
                   buildRequest, applyRequest, isUsable, call };
