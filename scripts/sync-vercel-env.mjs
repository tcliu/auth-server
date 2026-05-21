import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const TARGET = 'production';
const SOURCE_FILES = ['.env', '.env.vercel'];

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};

  const content = readFileSync(filePath, 'utf8');
  const values = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function loadDesiredEnv() {
  return SOURCE_FILES.reduce((merged, filePath) => ({
    ...merged,
    ...parseEnvFile(filePath)
  }), {});
}

async function runVercelCommand(args) {
  const { stdout } = await execFileAsync('vercel', args, {
    cwd: process.cwd(),
    maxBuffer: 10 * 1024 * 1024,
    env: process.env
  });

  return stdout;
}

async function listVercelEnvKeys() {
  const output = await runVercelCommand(['env', 'ls', TARGET, '--format', 'json']);
  const parsed = JSON.parse(output);
  return new Set((parsed.envs || []).map((entry) => entry.key));
}

async function upsertVercelEnv(key, value) {
  await runVercelCommand([
    'env',
    'add',
    key,
    TARGET,
    '--value',
    value,
    '--force',
    '--yes'
  ]);
}

async function removeVercelEnv(key) {
  await runVercelCommand(['env', 'rm', key, TARGET, '--yes']);
}

const desiredEnv = loadDesiredEnv();
const desiredKeys = new Set(Object.keys(desiredEnv));
const existingKeys = await listVercelEnvKeys();

for (const [key, value] of Object.entries(desiredEnv)) {
  await upsertVercelEnv(key, value);
  console.log(`synced ${key}`);
}

for (const key of existingKeys) {
  if (desiredKeys.has(key)) continue;

  await removeVercelEnv(key);
  console.log(`removed ${key}`);
}

console.log(`Synced ${desiredKeys.size} env vars to Vercel ${TARGET}`);
