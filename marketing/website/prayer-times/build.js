#!/usr/bin/env node
/**
 * build.js — generates per-city prayer time pages from _template.html + cities.json.
 *
 * Usage:
 *   cd marketing/website/prayer-times
 *   node build.js
 *
 * Reads:  _template.html, cities.json
 * Writes: <slug>/index.html for each city in cities.json
 *
 * Add a new city: append to cities.json, re-run this script, commit.
 * Total time per city: ~2 seconds of script + a minute of review.
 */

const fs = require('fs');
const path = require('path');

const TEMPLATE = fs.readFileSync(path.join(__dirname, '_template.html'), 'utf8');
const CITIES = JSON.parse(fs.readFileSync(path.join(__dirname, 'cities.json'), 'utf8'));

let generated = 0;

for (const c of CITIES) {
    const html = TEMPLATE
        .replace(/\{\{CITY\}\}/g, c.city)
        .replace(/\{\{COUNTRY\}\}/g, c.country)
        .replace(/\{\{LAT\}\}/g, c.lat)
        .replace(/\{\{LNG\}\}/g, c.lng)
        .replace(/\{\{SLUG\}\}/g, c.slug);

    const dir = path.join(__dirname, c.slug);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const out = path.join(dir, 'index.html');
    fs.writeFileSync(out, html, 'utf8');
    console.log(`  ✓ ${c.slug}/index.html`);
    generated++;
}

console.log(`\nGenerated ${generated} city pages.`);
console.log(`Don't forget to add the new cities to /prayer-times/index.html and sitemap.xml.`);
