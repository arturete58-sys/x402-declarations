const { empty } = require('./schema');
const adapters = [
  require('./adapters/truthbear'),
  require('./adapters/kronos'),
  require('./adapters/ottoai'),
  require('./adapters/apitoll'),
  require('./adapters/hugen'),
  require('./adapters/lumi'),
  require('./adapters/netintel'),
  require('./adapters/liveprobe'),
];
function normalize(url, body) {
  const a = adapters.find(x => x.matches(url));
  if (!a) { const d = empty(); d._adapter = 'none'; d._raw = body; return d; }
  return a.parse(body);
}
function supported() { return adapters.map(a => a.parse({})._adapter); }
module.exports = { normalize, supported, adapters };
