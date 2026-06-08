#!/usr/bin/env node

/**
 * Generates src/utils/licenses.generated.json from the production
 * dependencies listed in package.json by reading each package's own
 * package.json out of node_modules. Run via `npm run licenses:generate`
 * whenever dependencies change, then commit the result.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_PATH = path.join(ROOT, 'src', 'utils', 'licenses.generated.json');

const rootPkg = require(path.join(ROOT, 'package.json'));

function licenseToString(license) {
  if (!license) return 'UNKNOWN';
  if (typeof license === 'string') return license;
  if (Array.isArray(license)) return license.map(licenseToString).join(' OR ');
  if (typeof license === 'object' && license.type) return license.type;
  return 'UNKNOWN';
}

function authorToName(author) {
  if (!author) return null;
  const raw = typeof author === 'string' ? author : author.name;
  if (!raw) return null;
  return raw.replace(/<[^>]*>/g, '').replace(/\([^)]*\)/g, '').trim() || null;
}

function repositoryToHolder(repository) {
  const url = typeof repository === 'string' ? repository : repository?.url;
  const match = url?.match(/github\.com[/:]([^/]+)\//i);
  return match ? match[1] : null;
}

function copyrightFor(name, depPkg) {
  const holder = authorToName(depPkg.author)
    ?? repositoryToHolder(depPkg.repository)
    ?? name.split('/').pop();
  return `© ${holder}`;
}

const dependencyNames = Object.keys(rootPkg.dependencies ?? {});

const entries = dependencyNames
  .map((name) => {
    const depPkg = require(path.join(ROOT, 'node_modules', name, 'package.json'));
    return {
      name,
      license: licenseToString(depPkg.license ?? depPkg.licenses),
      copyright: copyrightFor(name, depPkg),
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

fs.writeFileSync(OUT_PATH, `${JSON.stringify(entries, null, 2)}\n`);
console.log(`Wrote ${entries.length} license entries to ${path.relative(ROOT, OUT_PATH)}`);
