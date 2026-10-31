import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { X509Certificate } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer } from './server.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const certDir = path.join(root, '.lan-cert');
const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');
const addresses = [...new Set(Object.values(os.networkInterfaces()).flat().filter(item => item && item.family === 'IPv4' && !item.internal).map(item => item.address))];
const certificateAddresses = ['127.0.0.1', ...addresses];
let needsCertificate = true;
try {
  const certificate = new X509Certificate(readFileSync(certPath));
  readFileSync(keyPath);
  needsCertificate = certificateAddresses.some(address => !certificate.checkIP(address)) || Date.parse(certificate.validTo) <= Date.now() + 86400000;
} catch { /* Generate a certificate on first launch. */ }
if (needsCertificate) {
  mkdirSync(certDir, { recursive: true, mode: 0o700 });
  const result = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyPath, '-out', certPath, '-days', '365', '-subj', '/CN=HealthTracker LAN', '-addext', `subjectAltName=${certificateAddresses.map(address => `IP:${address}`).join(',')}`], { encoding: 'utf8' });
  if (result.status !== 0) {
    console.error('无法生成 HTTPS 证书，请确认已安装 OpenSSL。', result.error?.message ?? result.stderr);
    process.exit(1);
  }
}
const port = Number(process.env.PORT || 4173);
const server = https.createServer({ key: readFileSync(keyPath), cert: readFileSync(certPath) }, createServer().listeners('request')[0]);
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `端口 ${port} 已被占用，请先停止已有服务或设置 PORT 使用其他端口。` : error.message);
  process.exitCode = 1;
});
server.listen(port, '0.0.0.0', () => {
  const pidPath = path.join(certDir, `${port}.pid`);
  try { writeFileSync(pidPath, String(process.pid), { mode: 0o600 }); }
  catch (error) { console.error(`无法记录服务进程：${error.message}`); server.close(); process.exitCode = 1; return; }
  const stop = () => {
    try { if (readFileSync(pidPath, 'utf8') === String(process.pid)) unlinkSync(pidPath); } catch { /* PID file may already be removed. */ }
    server.close();
  };
  process.once('SIGTERM', stop);
  process.once('SIGINT', stop);
  console.log(`本机：https://127.0.0.1:${port}`);
  for (const address of addresses) console.log(`远程：https://${address}:${port}`);
  console.log('首次访问需在浏览器中接受自签名证书。按 Ctrl+C 停止。');
});
