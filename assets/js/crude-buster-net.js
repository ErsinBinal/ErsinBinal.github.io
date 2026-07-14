/**
 * Crude Buster Online — maliyetsiz gerçek zamanlı co-op taşıma katmanı.
 *
 * dart-online.js ile aynı ilke: Supabase Realtime "broadcast + presence"
 * kanalı. Tabloya bağlı OLMADIĞI için ek tablo/RLS gerektirmez, anon key ile
 * çalışır (ücretsiz katman). Oyun sırasında DB'ye yazılmaz; yalnız host->guest
 * snapshot ve guest->host input yayınlanır (host-otoriter, güven tabanlı).
 *
 * Roller: oda kuran = RED (host, sim otoritesi), katılan = BLUE (guest).
 * İki tarayıcı / iki cihazla canlı test edilmelidir.
 */
(function () {
  'use strict';

  function randomCode() {
    var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var out = '';
    for (var i = 0; i < 5; i += 1) {
      out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return out;
  }

  function create(options) {
    var opts = options || {};
    var getClient = opts.getClient;
    var cb = {
      onSnap: opts.onSnap || function () {},
      onInput: opts.onInput || function () {},
      onEvent: opts.onEvent || function () {},
      onSys: opts.onSys || function () {},
      onState: opts.onState || function () {},
      onPresence: opts.onPresence || function () {}
    };

    var channel = null;
    var active = false;
    var host = false;
    var slot = null;         // 'RED' | 'BLUE'
    var code = null;
    var selfName = 'Oyuncu';
    var opponentPresent = false;

    function client() {
      return typeof getClient === 'function' ? getClient() : null;
    }

    function teardown() {
      if (channel) {
        try { channel.unsubscribe(); } catch (e) { /* yoksay */ }
        var c = client();
        if (c && typeof c.removeChannel === 'function') {
          try { c.removeChannel(channel); } catch (e2) { /* yoksay */ }
        }
      }
      channel = null;
      active = false;
      host = false;
      slot = null;
      code = null;
      opponentPresent = false;
    }

    function handlePresence() {
      if (!channel) return;
      var st = channel.presenceState();
      var others = [];
      Object.keys(st).forEach(function (key) {
        (st[key] || []).forEach(function (entry) {
          if (entry && entry.slot && entry.slot !== slot) others.push(entry);
        });
      });
      var wasPresent = opponentPresent;
      opponentPresent = others.length > 0;
      var opp = others[0] || null;

      cb.onPresence({
        connected: opponentPresent,
        opponentName: opp ? opp.name : null,
        opponentSlot: opp ? opp.slot : (slot === 'RED' ? 'BLUE' : 'RED')
      });

      if (!wasPresent && opponentPresent) {
        cb.onState({ status: 'ready' });
        // Host yeni katılana tam durumu göndersin.
        if (host) cb.onSys({ type: 'sync-request' });
      } else if (wasPresent && !opponentPresent) {
        cb.onState({ status: 'opponent-left' });
      }
    }

    function attach(roomCode, asHost, name) {
      var c = client();
      if (!c || typeof c.channel !== 'function') {
        cb.onState({ status: 'error', message: 'Supabase Realtime kullanılamıyor.' });
        return false;
      }
      code = String(roomCode).toUpperCase();
      host = asHost;
      slot = asHost ? 'RED' : 'BLUE';
      selfName = name || (asHost ? 'Ev sahibi' : 'Misafir');

      channel = c.channel('crude-room-' + code, {
        config: {
          broadcast: { self: false, ack: false },
          presence: { key: slot + '-' + Math.random().toString(36).slice(2, 8) }
        }
      });

      channel.on('broadcast', { event: 'snap' }, function (msg) { cb.onSnap(msg.payload); });
      channel.on('broadcast', { event: 'input' }, function (msg) { cb.onInput(msg.payload); });
      channel.on('broadcast', { event: 'event' }, function (msg) { cb.onEvent(msg.payload); });
      channel.on('broadcast', { event: 'sys' }, function (msg) { cb.onSys(msg.payload); });
      channel.on('presence', { event: 'sync' }, handlePresence);
      channel.on('presence', { event: 'join' }, handlePresence);
      channel.on('presence', { event: 'leave' }, handlePresence);

      cb.onState({ status: 'connecting' });

      channel.subscribe(function (status) {
        if (status === 'SUBSCRIBED') {
          active = true;
          channel.track({ name: selfName, slot: slot });
          cb.onState({ status: asHost ? 'waiting' : 'joined', code: code, slot: slot });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          cb.onState({ status: 'error', message: 'Kanal bağlantısı kurulamadı (' + status + ').' });
        }
      });
      return true;
    }

    function send(event, payload) {
      if (!channel || !active) return;
      channel.send({ type: 'broadcast', event: event, payload: payload });
    }

    return {
      host: function (name) {
        teardown();
        var c = randomCode();
        return attach(c, true, name) ? c : null;
      },
      join: function (roomCode, name) {
        if (!roomCode) return false;
        teardown();
        return attach(roomCode, false, name);
      },
      leave: function () {
        if (channel) cb.onState({ status: 'closed' });
        teardown();
      },
      sendSnap: function (snap) { send('snap', snap); },
      sendInput: function (input) { send('input', input); },
      sendEvent: function (type, payload) { send('event', { type: type, payload: payload }); },
      sendSys: function (type, payload) { send('sys', { type: type, payload: payload }); },
      isActive: function () { return active; },
      isHost: function () { return host; },
      localSlot: function () { return slot; },
      roomCode: function () { return code; },
      opponentConnected: function () { return opponentPresent; }
    };
  }

  window.CrudeNet = { create: create };
})();
