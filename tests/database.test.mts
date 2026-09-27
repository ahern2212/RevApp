// Runs every migration in supabase/migrations on a real Postgres (PGlite, in-process WASM)
// with small stand-ins for Supabase's auth, storage, pg_net and realtime, then checks the
// security rules as signed-in users. Catches SQL that only fails when it runs, like RLS
// policy recursion or a bad column reference, before it reaches the real database.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { before, test } from 'node:test';

import { PGlite } from '@electric-sql/pglite';

const MIGRATIONS = new URL('../supabase/migrations/', import.meta.url);

// Just enough of Supabase for the migrations: roles and default grants, auth.uid() from a
// setting, storage tables and path helpers (same bodies as Supabase's), a pg_net stub that
// records push calls, and the realtime publication.
const SUPABASE_STUBS = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

  create schema auth;
  grant usage on schema auth to anon, authenticated;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant execute on function auth.uid() to anon, authenticated;

  create schema storage;
  grant usage on schema storage to anon, authenticated;
  create table storage.buckets (
    id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]
  );
  create table storage.objects (
    id uuid primary key default gen_random_uuid(),
    bucket_id text references storage.buckets (id), name text, owner uuid
  );
  alter table storage.objects enable row level security;
  grant select, insert, delete on storage.objects to authenticated;
  create function storage.foldername(name text) returns text[] language plpgsql immutable as $$
    declare _parts text[];
    begin
      select string_to_array(name, '/') into _parts;
      return _parts[1:array_length(_parts, 1) - 1];
    end $$;
  create function storage.extension(name text) returns text language plpgsql immutable as $$
    declare _parts text[]; _filename text;
    begin
      select string_to_array(name, '/') into _parts;
      select _parts[array_length(_parts, 1)] into _filename;
      return reverse(split_part(reverse(_filename), '.', 1));
    end $$;
  grant execute on all functions in schema storage to authenticated;

  create schema extensions;
  create schema net;
  create table net.calls (id bigserial primary key, url text, body jsonb);
  create function net.http_post(url text, headers jsonb, body jsonb) returns bigint language sql as $$
    insert into net.calls (url, body) values (url, body) returning id
  $$;

  create publication supabase_realtime;
`;

let db: PGlite;
const users: Record<'alice' | 'bob' | 'carol' | 'dave' | 'erin', string> = {
  alice: '',
  bob: '',
  carol: '',
  dave: '',
  erin: '',
};

const q = async (sql: string, params: unknown[] = []) => (await db.query<any>(sql, params)).rows;

/** Runs `run` as a signed-in user (role authenticated, auth.uid() = userId). */
async function as<T>(userId: string, run: () => Promise<T>): Promise<T> {
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId}', false); set role authenticated;`);
  try {
    return await run();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}

/** The error message if `run` throws, otherwise null. */
async function fails(run: () => Promise<unknown>): Promise<string | null> {
  try {
    await run();
    return null;
  } catch (error) {
    return (error as Error).message;
  }
}

let counter = 0;
const photo = (userId: string) => `${userId}/test-${++counter}.jpg`;

async function post(userId: string, columns: Record<string, unknown> = {}): Promise<string> {
  const row = { image_path: photo(userId), caption: '', car: '', ...columns };
  const keys = Object.keys(row);
  const [inserted] = await as(userId, () =>
    q(
      `insert into posts (${keys.join(', ')}) values (${keys.map((_, i) => `$${i + 1}`).join(', ')}) returning id`,
      keys.map((key) => row[key as keyof typeof row])
    )
  );
  return inserted.id;
}

const count = async (sql: string, params: unknown[] = []) => Number((await q(sql, params))[0].n);

before(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  const files = readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith('.sql'))
    .sort();
  for (const name of files) {
    const sql = readFileSync(new URL(name, MIGRATIONS), 'utf8').replace(
      'create extension if not exists pg_net with schema extensions;',
      '-- pg_net is stubbed'
    );
    try {
      await db.exec(sql);
    } catch (error) {
      throw new Error(`Migration ${name} failed: ${(error as Error).message}`);
    }
  }
  for (const name of Object.keys(users) as (keyof typeof users)[]) {
    const [row] = await q(
      `insert into auth.users (email, raw_user_meta_data) values ($1, jsonb_build_object('username', $2::text)) returning id`,
      [`${name}@example.com`, name]
    );
    users[name] = row.id;
  }
});

test('sign-up creates a profile for every user', async () => {
  assert.equal(await count(`select count(*) as n from profiles`), 5);
});

test('posts only accept photos and videos from your own folder', async () => {
  const { alice, bob } = users;
  assert.ok(await post(alice, { caption: 'first build #jdm' }));
  assert.ok(await fails(() => post(alice, { image_path: photo(bob) })), 'photo in another folder');
  assert.ok(await fails(() => post(alice, { image_path: `${alice}/x.gif` })), '.gif path');
  assert.ok(await post(alice, { video_path: `${alice}/video-1.mov` }), 'own .mov');
  assert.ok(await fails(() => post(alice, { video_path: `${bob}/video-1.mov` })), 'video in another folder');
  assert.ok(await post(alice, { extra_image_paths: [photo(alice), photo(alice)] }), 'carousel');
  assert.ok(await fails(() => post(alice, { extra_image_paths: [photo(bob)] })), 'carousel photo from another folder');
  assert.ok(
    await fails(() => post(alice, { video_path: `${alice}/v.mp4`, extra_image_paths: [photo(alice)] })),
    'carousel + video'
  );
  assert.ok(
    await fails(() => post(alice, { extra_image_paths: Array.from({ length: 10 }, () => photo(alice)) })),
    'more than 10 photos'
  );
});

test('only the caption and car text of a post can be edited', async () => {
  const { alice } = users;
  const id = await post(alice);
  assert.equal(await fails(() => as(alice, () => q(`update posts set caption = 'edited' where id = $1`, [id]))), null);
  assert.ok(await fails(() => as(alice, () => q(`update posts set image_path = $2 where id = $1`, [id, photo(alice)]))));
});

test('storage uploads: allowed types, own flat folder only', async () => {
  const { alice, bob } = users;
  const upload = (bucket: string, name: string) =>
    fails(() => as(alice, () => q(`insert into storage.objects (bucket_id, name) values ($1, $2)`, [bucket, name])));
  assert.equal(await upload('post-images', `${alice}/a.jpg`), null);
  assert.ok(await upload('post-images', `${alice}/a.svg`), 'svg');
  assert.ok(await upload('post-images', `${alice}/a.html`), 'html');
  assert.ok(await upload('post-images', `${bob}/a.jpg`), 'someone else\'s folder');
  assert.ok(await upload('post-images', `${alice}/sub/a.jpg`), 'subfolder');
  assert.equal(await upload('post-videos', `${alice}/v.mov`), null);
  assert.ok(await upload('post-videos', `${alice}/v.jpg`), 'photo in the video bucket');

  const [images] = await q(`select allowed_mime_types from storage.buckets where id = 'post-images'`);
  assert.deepEqual(images.allowed_mime_types, ['image/jpeg', 'image/png', 'image/webp']);
  const [videos] = await q(`select file_size_limit from storage.buckets where id = 'post-videos'`);
  assert.equal(Number(videos.file_size_limit), 50 * 1024 * 1024);
});

test('posting more than 20 times an hour is refused with a friendly message', async () => {
  const { erin } = users;
  for (let i = 0; i < 20; i++) await post(erin);
  assert.match((await fails(() => post(erin))) ?? '', /too often/);
});

test('blocking hides both people from each other and ends follows', async () => {
  const { alice, bob, carol } = users;
  const bobPost = await post(bob, { caption: 'bob build' });
  await as(carol, () => q(`insert into follows (followee_id) values ($1)`, [bob]));
  await as(bob, () => q(`insert into follows (followee_id) values ($1)`, [carol]));
  await as(bob, () => q(`insert into blocks (blocked_id) values ($1)`, [carol]));

  assert.equal((await as(carol, () => q(`select id from posts where id = $1`, [bobPost]))).length, 0);
  assert.equal((await as(bob, () => q(`select id from posts where author_id = $1`, [carol]))).length, 0);
  assert.ok(await fails(() => as(carol, () => q(`insert into comments (post_id, body) values ($1, 'hi')`, [bobPost]))));
  assert.ok(await fails(() => as(carol, () => q(`insert into likes (post_id) values ($1)`, [bobPost]))));
  assert.ok(await fails(() => as(carol, () => q(`insert into follows (followee_id) values ($1)`, [bob]))));
  assert.equal(
    await count(
      `select count(*) as n from follows where (follower_id = $1 and followee_id = $2) or (follower_id = $2 and followee_id = $1)`,
      [bob, carol]
    ),
    0
  );
  assert.equal((await as(carol, () => q(`select * from blocks`))).length, 0, 'blocks are private');
  assert.equal((await as(alice, () => q(`select id from posts where id = $1`, [bobPost]))).length, 1, 'others unaffected');
});

test('reports hide content for the reporter, and for everyone after 3', async () => {
  const { alice, bob, carol, dave, erin } = users;
  const spam = await post(dave, { caption: 'spammy' });
  await as(alice, () => q(`insert into reports (post_id, reason) values ($1, 'Spam')`, [spam]));
  assert.equal((await as(alice, () => q(`select id from posts where id = $1`, [spam]))).length, 0);
  assert.equal((await as(erin, () => q(`select id from posts where id = $1`, [spam]))).length, 1);
  assert.match(
    (await fails(() => as(alice, () => q(`insert into reports (post_id, reason) values ($1, 'Spam')`, [spam])))) ?? '',
    /duplicate|unique/
  );
  await as(bob, () => q(`insert into reports (post_id, reason) values ($1, 'Spam')`, [spam]));
  await as(carol, () => q(`insert into reports (post_id, reason) values ($1, 'Not car related')`, [spam]));
  assert.equal((await as(erin, () => q(`select id from posts where id = $1`, [spam]))).length, 0, 'hidden for all');
  assert.equal((await as(dave, () => q(`select id from posts where id = $1`, [spam]))).length, 1, 'owner still sees it');
  assert.equal((await as(erin, () => q(`select * from reports`))).length, 0, 'reports are private');
  assert.ok(await fails(() => as(erin, () => q(`insert into reports (post_id, reason) values ($1, 'meh')`, [spam]))));
});

test('follows: one notification per follower, and a following feed', async () => {
  const { alice, erin } = users;
  await as(alice, () => q(`select register_push_token('ExponentPushToken[alice]', 'android')`));
  await as(erin, () => q(`insert into follows (followee_id) values ($1)`, [alice]));
  await as(erin, () => q(`delete from follows where followee_id = $1`, [alice]));
  await as(erin, () => q(`insert into follows (followee_id) values ($1)`, [alice]));
  assert.equal(
    await count(`select count(*) as n from notifications where type = 'follow' and recipient_id = $1 and actor_id = $2`, [
      alice,
      erin,
    ]),
    1
  );
  const pushes = await q(`select body ->> 'body' as text from net.calls`);
  assert.ok(pushes.some((push) => push.text === 'erin started following you'));

  const feed = await as(erin, () => q(`select author_id from following_posts()`));
  assert.ok(feed.length > 0);
  assert.ok(feed.every((row) => row.author_id === alice || row.author_id === erin));
});

test('mentions notify once, skip the post author and blocked people', async () => {
  const { alice, bob, carol, dave, erin } = users;
  const alicePost = await post(alice);
  await as(erin, () =>
    q(`insert into comments (post_id, body) values ($1, 'love it @dave and @dave. also @alice and @nobody_here')`, [
      alicePost,
    ])
  );
  const mentions = await q(`select recipient_id from notifications where type = 'mention' and actor_id = $1`, [erin]);
  assert.equal(mentions.filter((m) => m.recipient_id === dave).length, 1);
  assert.ok(mentions.every((m) => m.recipient_id !== alice));

  await post(dave, { caption: 'shot by @erin' });
  assert.equal(
    await count(`select count(*) as n from notifications where type = 'mention' and recipient_id = $1 and actor_id = $2`, [
      erin,
      dave,
    ]),
    1
  );

  await as(carol, () => q(`insert into comments (post_id, body) values ($1, 'hey @bob')`, [alicePost]));
  assert.equal(
    await count(`select count(*) as n from notifications where type = 'mention' and recipient_id = $1 and actor_id = $2`, [
      bob,
      carol,
    ]),
    0
  );
});

test('comment replies are one level deep; likes work; deleting removes replies', async () => {
  const { alice, bob, dave, erin } = users;
  const alicePost = await post(alice);
  const bobPost = await post(bob);
  const [top] = await as(dave, () => q(`insert into comments (post_id, body) values ($1, 'top') returning id`, [alicePost]));
  const [reply] = await as(erin, () =>
    q(`insert into comments (post_id, body, parent_id) values ($1, '@dave yes', $2) returning id`, [alicePost, top.id])
  );
  assert.ok(reply);
  assert.ok(
    await fails(() =>
      as(dave, () => q(`insert into comments (post_id, body, parent_id) values ($1, 'x', $2)`, [alicePost, reply.id]))
    ),
    'reply to a reply'
  );
  assert.ok(
    await fails(() =>
      as(dave, () => q(`insert into comments (post_id, body, parent_id) values ($1, 'x', $2)`, [bobPost, top.id]))
    ),
    'parent on another post'
  );
  await as(alice, () => q(`insert into comment_likes (comment_id) values ($1)`, [top.id]));
  assert.equal((await as(erin, () => q(`select * from comment_likes where comment_id = $1`, [top.id]))).length, 1);
  await as(dave, () => q(`delete from comments where id = $1`, [top.id]));
  assert.equal(await count(`select count(*) as n from comments where id = $1`, [reply.id]), 0);
});

test('you can only tag your own garage car', async () => {
  const { dave, erin } = users;
  const [car] = await as(dave, () => q(`insert into cars (make, model) values ('Toyota', 'Supra') returning id`));
  assert.ok(await post(dave, { car_id: car.id }));
  assert.ok(await fails(() => post(erin, { car_id: car.id })));
});

test('car of the week is the most-liked visible post', async () => {
  const { alice, bob, carol, dave } = users;
  const star = await post(bob, { caption: 'the one' });
  const other = await post(alice);
  await as(alice, () => q(`insert into likes (post_id) values ($1)`, [star]));
  await as(dave, () => q(`insert into likes (post_id) values ($1)`, [star]));
  await as(dave, () => q(`insert into likes (post_id) values ($1)`, [other]));
  const [pick] = await as(alice, () => q(`select id from car_of_the_week()`));
  assert.equal(pick?.id, star);
  const [blockedPick] = await as(carol, () => q(`select id from car_of_the_week()`));
  assert.notEqual(blockedPick?.id, star, 'carol and bob blocked each other');
});

test('direct messages: members only, inbox state, push, reports and blocks', async () => {
  const { alice, bob, carol, dave, erin } = users;
  await as(dave, () => q(`select register_push_token('ExponentPushToken[dave]', 'ios')`));
  const [{ start_conversation: chat }] = await as(erin, () => q(`select start_conversation($1)`, [dave]));
  const [{ start_conversation: same }] = await as(dave, () => q(`select start_conversation($1)`, [erin]));
  assert.equal(chat, same, 'one chat per pair');

  await as(erin, () => q(`insert into messages (conversation_id, body) values ($1, 'is it for sale?')`, [chat]));
  const [received] = await as(dave, () => q(`select body from messages where conversation_id = $1`, [chat]));
  assert.equal(received.body, 'is it for sale?');
  assert.equal((await as(alice, () => q(`select * from messages where conversation_id = $1`, [chat]))).length, 0);
  assert.equal((await as(alice, () => q(`select * from conversations where id = $1`, [chat]))).length, 0);
  assert.ok(await fails(() => as(alice, () => q(`insert into messages (conversation_id, body) values ($1, 'x')`, [chat]))));

  const [conv] = await as(dave, () => q(`select * from conversations where id = $1`, [chat]));
  assert.equal(conv.last_message, 'is it for sale?');
  assert.equal(conv.last_sender_id, erin);
  assert.equal(conv.user_a === dave ? conv.user_a_read_at : conv.user_b_read_at, null, 'unread for dave');
  assert.equal(
    await count(`select count(*) as n from net.calls where body -> 'data' ->> 'conversationId' = $1`, [chat]),
    1,
    'push queued with the chat id'
  );
  await as(dave, () => q(`select mark_conversation_read($1)`, [chat]));
  const [read] = await as(dave, () => q(`select * from conversations where id = $1`, [chat]));
  assert.notEqual(read.user_a === dave ? read.user_a_read_at : read.user_b_read_at, null);

  assert.equal(
    (await fails(() => as(dave, () => q(`update conversations set last_message = 'x' where id = $1`, [chat])))) !== null ||
      (await as(dave, () => q(`select last_message from conversations where id = $1`, [chat])))[0].last_message !== 'x',
    true,
    'conversations only change through the functions'
  );
  assert.ok(await fails(() => as(carol, () => q(`select start_conversation($1)`, [bob]))), 'blocked pair');
  assert.ok(await fails(() => as(erin, () => q(`select start_conversation($1)`, [erin]))), 'yourself');

  const [message] = await as(erin, () => q(`insert into messages (conversation_id, body) values ($1, 'x') returning id`, [chat]));
  await as(dave, () => q(`insert into reports (message_id, reason) values ($1, 'Harassment or hate')`, [message.id]));
  assert.equal((await as(dave, () => q(`select id from messages where id = $1`, [message.id]))).length, 0);
  assert.equal((await as(dave, () => q(`delete from messages where conversation_id = $1 returning id`, [chat]))).length, 0);

  await as(dave, () => q(`insert into blocks (blocked_id) values ($1)`, [erin]));
  assert.equal((await as(erin, () => q(`select * from conversations where id = $1`, [chat]))).length, 0);
  assert.ok(await fails(() => as(erin, () => q(`insert into messages (conversation_id, body) values ($1, 'hello?')`, [chat]))));
});

test('deleting an account removes the person everywhere', async () => {
  const { erin } = users;
  await as(erin, () => q(`select delete_my_account()`));
  assert.equal(
    await count(
      `select (select count(*) from profiles where id = $1)
        + (select count(*) from posts where author_id = $1)
        + (select count(*) from follows where follower_id = $1 or followee_id = $1)
        + (select count(*) from messages where sender_id = $1)
        + (select count(*) from conversations where user_a = $1 or user_b = $1) as n`,
      [erin]
    ),
    0
  );
});

test('reports hide comments, listings, threads and replies after 3', async () => {
  const { alice, bob, carol, dave } = users;
  const reporters = [alice, bob, carol];
  const target = await post(dave);
  const [comment] = await as(dave, () => q(`insert into comments (post_id, body) values ($1, 'hmm') returning id`, [target]));
  const [listing] = await as(dave, () =>
    q(`insert into listings (title, price, category, photo_path) values ('Wheels', 100, 'Wheels & Tires', $1) returning id`, [
      photo(dave),
    ])
  );
  const [thread] = await as(dave, () =>
    q(`insert into forum_threads (category, title) values ('General', 'Help') returning id`)
  );
  const [reply] = await as(dave, () =>
    q(`insert into forum_replies (thread_id, body) values ($1, 'bump') returning id`, [thread.id])
  );
  const cases: [string, string, string][] = [
    ['comment_id', 'comments', comment.id],
    ['listing_id', 'listings', listing.id],
    ['thread_id', 'forum_threads', thread.id],
    ['reply_id', 'forum_replies', reply.id],
  ];
  for (const [column, table, id] of cases) {
    for (const reporter of reporters) {
      await as(reporter, () => q(`insert into reports (${column}, reason) values ($1, 'Spam')`, [id]));
    }
    assert.equal(
      await count(`select count(*) as n from ${table} where id = $1 and hidden_at is not null`, [id]),
      1,
      `${table}: hidden after 3 reports`
    );
    assert.equal((await as(dave, () => q(`select id from ${table} where id = $1`, [id]))).length, 1, `${table}: owner`);
  }
});

test('forum replies need a visible thread; notifications from blocked people disappear', async () => {
  const { alice, bob, carol } = users;
  const [thread] = await as(bob, () => q(`insert into forum_threads (category, title) values ('Builds', 'My car') returning id`));
  assert.ok(
    await fails(() => as(carol, () => q(`insert into forum_replies (thread_id, body) values ($1, 'hi')`, [thread.id]))),
    'carol and bob blocked each other'
  );
  assert.equal(
    await fails(() => as(alice, () => q(`insert into forum_replies (thread_id, body) values ($1, 'nice')`, [thread.id]))),
    null
  );

  const alicePost = await post(alice);
  await as(carol, () => q(`insert into likes (post_id) values ($1)`, [alicePost]));
  const before = (await as(alice, () => q(`select * from notifications where actor_id = $1`, [carol]))).length;
  assert.ok(before > 0, 'alice sees carol\'s like');
  await as(alice, () => q(`insert into blocks (blocked_id) values ($1)`, [carol]));
  assert.equal((await as(alice, () => q(`select * from notifications where actor_id = $1`, [carol]))).length, 0);
  await as(alice, () => q(`delete from blocks where blocked_id = $1`, [carol]));
  assert.equal(
    (await as(alice, () => q(`select * from notifications where actor_id = $1`, [carol]))).length,
    before,
    'unblocking brings them back'
  );
});

test('avatars: images only, in your own folder', async () => {
  const { alice, bob } = users;
  const upload = (name: string) =>
    fails(() => as(alice, () => q(`insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [name])));
  assert.equal(await upload(`${alice}/avatar-1.jpg`), null);
  assert.ok(await upload(`${alice}/avatar-1.svg`));
  assert.ok(await upload(`${bob}/avatar-1.jpg`));
});
