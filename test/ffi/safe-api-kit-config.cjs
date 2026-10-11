const fs = require("fs");
const vm = require("vm");

const MIN_EXPECTED_NETWORKS = 39;
const bundlePath = require.resolve("@safe-global/api-kit");
const bundle = fs.readFileSync(bundlePath, "utf8");

const baseUrlMatch = bundle.match(/var TRANSACTION_SERVICE_URL = "([^"]+)";/);
if (!baseUrlMatch) {
  throw new Error(`Unable to locate TRANSACTION_SERVICE_URL in ${bundlePath}`);
}

const networksMatch = bundle.match(/var networks = (\[[\s\S]*?\n\]);\nvar getNetworkShortName =/);
if (!networksMatch) {
  throw new Error(`Unable to locate networks config in ${bundlePath}`);
}

const networks = vm.runInNewContext(networksMatch[1]);
if (!Array.isArray(networks) || networks.length < MIN_EXPECTED_NETWORKS) {
  throw new Error(`Unexpected networks config shape in ${bundlePath}`);
}

// Networks the Safe Transaction Service serves that @safe-global/api-kit 4.1.0 predates. api-kit 5.x lists them.
const NETWORKS_AFTER_API_KIT_4_1_0 = [{ chainId: 4663n, shortName: "robinhood" }];
const allNetworks = [...networks, ...NETWORKS_AFTER_API_KIT_4_1_0].sort((a, b) => Number(a.chainId) - Number(b.chainId));

const chainIds = [];
const urls = [];
const seenChainIds = new Set();

for (const network of allNetworks) {
  const chainId = Number(network.chainId);
  if (!Number.isInteger(chainId)) {
    throw new Error(`Invalid chainId in ${bundlePath}: ${network.chainId}`);
  }
  if (typeof network.shortName !== "string" || network.shortName.length === 0) {
    throw new Error(`Invalid shortName in ${bundlePath}: ${String(network.shortName)}`);
  }
  if (seenChainIds.has(chainId)) {
    throw new Error(`Duplicate chainId in ${bundlePath}: ${chainId}`);
  }

  seenChainIds.add(chainId);
  chainIds.push(chainId);
  urls.push(`${baseUrlMatch[1]}/${network.shortName}/api`);
}

process.stdout.write(JSON.stringify({ chainIds, urls }));
