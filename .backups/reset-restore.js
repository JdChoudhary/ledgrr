/* Throwaway DB reset/restore tool. Run from packages/database: node ../../.backups/reset-restore.js <drop|restore|verify> */
const path = require('path');
const { createRequire } = require('module');
const dbRequire = createRequire(path.resolve(process.cwd(), 'package.json'));
const { Client } = dbRequire('pg');
const fs = require('fs');
dbRequire('dotenv').config({ path: '../../.env' });

const snap = JSON.parse(fs.readFileSync('../../.backups/ledgr-data-snapshot-20260926.json', 'utf8'));
const SKIP = new Set(['spaces', 'space_members', 'space_invitations', 'daily_space_category_summary']);
const mode = process.argv[2];

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  if (mode === 'drop') {
    const ext = await c.query("select extname from pg_extension where extname != 'plpgsql'");
    console.log('extensions:', ext.rows.map((r) => r.extname).join(', ') || 'none');
    await c.query('DROP SCHEMA public CASCADE');
    await c.query('CREATE SCHEMA public');
    console.log('public schema dropped and recreated');
  } else if (mode === 'restore') {
    const spaceMap = {};
    for (const m of snap.tables.space_members) spaceMap[m.space_id] = m.user_id;
    const cols = await c.query(
      "select table_name, column_name from information_schema.columns where table_schema='public'"
    );
    const tableCols = {};
    for (const r of cols.rows) (tableCols[r.table_name] ??= []).push(r.column_name);
    await c.query('SET session_replication_role = replica');
    let total = 0;
    for (const [table, rows] of Object.entries(snap.tables)) {
      if (SKIP.has(table) || !rows.length) continue;
      if (!tableCols[table]) {
        console.log('SKIP (no new table):', table);
        continue;
      }
      const colSet = new Set(tableCols[table]);
      let ok = 0;
      for (const row of rows) {
        const vals = {};
        for (const [k, v] of Object.entries(row)) {
          if (k === 'space_id') continue;
          if (colSet.has(k)) vals[k] = v;
        }
        if (colSet.has('user_id') && (vals.user_id == null || vals.user_id === undefined)) {
          vals.user_id = spaceMap[row.space_id];
        }
        if (colSet.has('user_id') && vals.user_id == null) {
          console.log('WARN unmappable user_id, skipping row in', table, row.id);
          continue;
        }
        const keys = Object.keys(vals);
        const ph = keys.map((_, i) => '$' + (i + 1)).join(',');
        try {
          await c.query(
            `INSERT INTO "${table}" ("${keys.join('","')}") VALUES (${ph})`,
            keys.map((k) => vals[k])
          );
          ok++;
        } catch (e) {
          console.log('FAIL', table, row.id, e.message.split('\n')[0]);
        }
      }
      console.log('restored', table, `${ok}/${rows.length}`);
      total += ok;
    }
    await c.query('SET session_replication_role = DEFAULT');
    console.log('total rows restored:', total);
  } else if (mode === 'verify') {
    const t = await c.query(
      "select tablename from pg_tables where schemaname='public' order by tablename"
    );
    for (const { tablename } of t.rows) {
      if (SKIP.has(tablename)) continue;
      const r = await c.query(`select count(*)::int as n from "${tablename}"`);
      if (r.rows[0].n > 0) console.log(tablename + ':', r.rows[0].n);
    }
    const splitCols = await c.query(
      "select column_name from information_schema.columns where table_name='transaction_splits' order by ordinal_position"
    );
    console.log('transaction_splits cols:', splitCols.rows.map((r) => r.column_name).join(','));
    const hasSpace = await c.query(
      "select count(*)::int as n from information_schema.columns where table_schema='public' and column_name='space_id'"
    );
    console.log('columns named space_id remaining:', hasSpace.rows[0].n);
  }

  await c.end();
})().catch((e) => {
  console.error('ERR', e.message);
  process.exit(1);
});
