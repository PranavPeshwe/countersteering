import { strict as assert } from 'node:assert';
import { get } from 'node:http';

const url = new URL(process.argv[2] ?? 'http://127.0.0.1:4173');

function request(cookieBytes) {
  return new Promise((resolve, reject) => {
    const request = get(url, {
      headers: cookieBytes ? { Cookie: `synthetic=${'x'.repeat(cookieBytes)}` } : {},
      timeout: 5000,
    }, response => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { body += chunk; });
      response.on('end', () => resolve({ status: response.statusCode, body }));
      response.on('error', reject);
    });
    request.on('timeout', () => request.destroy(new Error('Preview request timed out.')));
    request.on('error', reject);
  });
}

const clean = await request(0);
console.log(`Clean request: HTTP ${clean.status}`);
assert.equal(clean.status, 200);
assert.ok(clean.body.includes('First Ride - Countersteering'));

const browserSized = await request(20 * 1024);
console.log(`Synthetic 20 KiB cookie header: HTTP ${browserSized.status}`);
assert.equal(browserSized.status, 200, 'Local browser-sized headers must load the simulator.');

const oversized = await request(70 * 1024);
console.log(`Synthetic 70 KiB cookie header: HTTP ${oversized.status}`);
assert.equal(oversized.status, 431, 'The local server must retain a bounded header limit.');
