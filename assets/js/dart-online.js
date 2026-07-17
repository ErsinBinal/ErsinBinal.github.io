/**
 * Convivium Dart Online — maliyetsiz gerçek zamanlı 1v1 oyun.
 *
 * Supabase Realtime "broadcast + presence" kanalları kullanır. Bu kanallar
 * tabloya bağlı OLMADIĞI için ek tablo/RLS gerektirmez ve anon key ile çalışır
 * (ücretsiz katman). Oyun sırasında veritabanına yazma yapılmaz; yalnızca atışlar
 * ve aksiyonlar karşı tarafa yayınlanır (güven tabanlı, hobi ölçeği).
 *
 * Roller: oda kuran = RED (host), katılan = BLUE (guest).
 * Host, durum senkronundan sorumludur (yeni katılan tam state alır).
 *
 * Not: Bu katman tarayıcıda iki istemci ile canlı test edilmelidir.
 */
(function () {
  'use strict';

  function randomCode() {
    var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // karışması kolay harfler yok
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
      onState: opts.onState || function () {},
      onRemoteDart: opts.onRemoteDart || function () {},
      onRemoteAction: opts.onRemoteAction || function () {},
      onPresence: opts.onPresence || function () {}
    };

    var channel = null;
    var active = false;
    var host = false;
    var slot = null;        // 'RED' | 'BLUE'
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
        // Host yeni katılana tam durumu gönderir.
        if (host) cb.onRemoteAction({ type: 'request-sync-source' });
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

      channel = c.channel('dart-room-' + code, {
        config: {
          broadcast: { self: false, ack: false },
          presence: { key: slot + '-' + Math.random().toString(36).slice(2, 8) }
        }
      });

      channel.on('broadcast', { event: 'dart' }, function (msg) {
        cb.onRemoteDart(msg.payload);
      });
      channel.on('broadcast', { event: 'action' }, function (msg) {
        cb.onRemoteAction(msg.payload);
      });
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

    return {
      // code verilirse o kodla oda kurulur (chat guvertesi davetleri icin).
      host: function (name, code) {
        teardown();
        var preset = code ? String(code).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) : '';
        var c = preset || randomCode();
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
      sendDart: function (dart) {
        if (!channel || !active) return;
        channel.send({ type: 'broadcast', event: 'dart', payload: dart });
      },
      sendAction: function (type, payload) {
        if (!channel || !active) return;
        channel.send({ type: 'broadcast', event: 'action', payload: { type: type, payload: payload } });
      },
      isActive: function () { return active; },
      isHost: function () { return host; },
      localSlot: function () { return slot; },
      roomCode: function () { return code; },
      opponentConnected: function () { return opponentPresent; }
    };
  }

  window.ConviviumDartOnline = { create: create };
})();
