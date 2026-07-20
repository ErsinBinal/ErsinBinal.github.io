import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(new URL('../../docs/database/2026-07-20-social-chat.sql', import.meta.url), 'utf8');
const client = await readFile(new URL('../../assets/js/supabase-client.js', import.meta.url), 'utf8');
const chat = await readFile(new URL('../../assets/js/home/chat.js', import.meta.url), 'utf8');
const deck = await readFile(new URL('../../assets/js/home/chat-deck.js', import.meta.url), 'utf8');

test('social identities use a case-insensitive unique handle', () => {
  assert.match(migration, /unique index[^;]+lower\(handle\)/is);
  assert.match(migration, /handle ~ '\^\[a-z0-9\]/);
  assert.match(migration, /30 days/);
});

test('private chat authorization is enforced by database functions and RLS', () => {
  assert.match(migration, /alter table public\.chat_messages enable row level security/i);
  assert.match(migration, /not public\.are_friends\(auth\.uid\(\),v_other\)/i);
  assert.match(migration, /not public\.has_block_between\(auth\.uid\(\), sender_id\)/i);
  assert.match(migration, /revoke insert, update, delete on[\s\S]+chat_messages from authenticated/i);
  assert.match(migration, /revoke execute on function public\.claim_handle[\s\S]+from public, anon/i);
});

test('social client exposes friendship, blocking, direct and group APIs', () => {
  for (const name of [
    'sendFriendRequest', 'respondFriendRequest', 'cancelFriendRequest',
    'blockMember', 'unblockMember', 'openDirectChat', 'createGroupChat',
    'manageGroupMember', 'sendChatMessage', 'subscribeToChatMessages'
  ]) assert.match(client, new RegExp(`\\b${name}\\b`));
});

test('chat deck keeps global chat and provides member/group controls', () => {
  assert.match(deck, /ORTAK KANAL/);
  assert.match(deck, /sendFriendRequest/);
  assert.match(deck, /createGroupChat/);
  assert.match(deck, /blockMember/);
  assert.match(deck, /transferGroupOwner/);
});

test('game invites remain ephemeral presence broadcasts and auth is checked separately', () => {
  assert.match(chat, /const sendInvite[\s\S]+transmit\(\{[\s\S]+kind: 'invite'/);
  assert.match(chat, /if \(to && payload\.kind !== 'invite'\) return/);
  assert.match(deck, /authSession = await b\.getSession\(\)/);
  assert.match(deck, /sendGameInvite\('crude', wanderer\.tag\)/);
});
