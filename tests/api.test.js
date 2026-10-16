import { test } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';

const TEST_DIR = './data/test-' + Date.now();
process.env.NODE_ENV = 'test';
process.env.DATA_DIR = TEST_DIR;
process.env.UPLOAD_DIR = path.join(TEST_DIR, 'uploads');
process.env.JWT_SECRET = 'test-secret-only-for-tests';

const { default: app } = await import('../server/index.js');

test('health endpoint répond ok', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});

test('inscription, session et lecture de profil', async () => {
  const email = `u${Date.now()}@example.com`;
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'motdepasse123', name: 'Étudiant Test' });

  assert.equal(reg.status, 200);
  assert.equal(reg.body.user.email, email);

  const cookies = reg.headers['set-cookie'];
  assert.ok(cookies && cookies.length > 0);

  const me = await request(app).get('/api/auth/me').set('Cookie', cookies);
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, email);
});

test('mot de passe trop court refusé', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: 'a@b.co', password: '123', name: 'X' });
  assert.equal(res.status, 400);
});

test('email invalide refusé', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: 'pas-un-email', password: 'motdepasse123', name: 'X' });
  assert.equal(res.status, 400);
});

test('doublon email refusé', async () => {
  const email = `dup${Date.now()}@example.com`;

  const first = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'motdepasse123', name: 'Premier' });
  assert.equal(first.status, 200);

  const second = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'motdepasse123', name: 'Second' });
  assert.equal(second.status, 409);
});

test('upload sans session renvoie 401', async () => {
  const res = await request(app).post('/api/files');
  assert.equal(res.status, 401);
});

test('cycle complet : upload, métadonnées, téléchargement, suppression', async () => {
  const email = `flow${Date.now()}@example.com`;
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'motdepasse123', name: 'Flow' });
  const cookies = reg.headers['set-cookie'];

  const tmp = path.join(TEST_DIR, 'sample.txt');
  fs.writeFileSync(tmp, 'contenu de test');

  const up = await request(app)
    .post('/api/files')
    .set('Cookie', cookies)
    .field('expiresIn', '24')
    .field('password', 'secret')
    .attach('file', tmp);

  assert.equal(up.status, 200);
  const id = up.body.id;
  assert.ok(id);

  const meta = await request(app).get('/api/files/meta/' + id);
  assert.equal(meta.status, 200);
  assert.equal(meta.body.file.protected, true);

  const badPw = await request(app)
    .post('/api/files/download/' + id)
    .send({ password: 'faux' });
  assert.equal(badPw.status, 401);

  const okDl = await request(app)
    .post('/api/files/download/' + id)
    .send({ password: 'secret' });
  assert.equal(okDl.status, 200);
  assert.match(okDl.headers['content-disposition'], /sample\.txt/);

  const list = await request(app).get('/api/files').set('Cookie', cookies);
  assert.equal(list.status, 200);
  assert.equal(list.body.files.length, 1);
  assert.equal(list.body.files[0].downloads, 1);

  const del = await request(app)
    .delete('/api/files/' + id)
    .set('Cookie', cookies);
  assert.equal(del.status, 200);

  const after = await request(app).get('/api/files/meta/' + id);
  assert.equal(after.status, 404);
});

test('lien inexistant renvoie 404', async () => {
  const res = await request(app).get('/api/files/meta/inexistant000');
  assert.equal(res.status, 404);
});