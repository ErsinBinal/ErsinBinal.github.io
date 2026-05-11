extends Node2D

const VIEW := Vector2(960, 540)
const PLAYER_RADIUS := 16.0
const ENEMY_RADIUS := 15.0
const SHARD_RADIUS := 10.0
const BULLET_RADIUS := 5.0

var rng := RandomNumberGenerator.new()
var mode := "intro"
var player := {
	"pos": Vector2(480, 420),
	"vel": Vector2.ZERO,
	"hp": 5,
	"dash": 0.0,
	"invuln": 0.0,
	"pulse": 35.0
}
var enemies: Array[Dictionary] = []
var bullets: Array[Dictionary] = []
var shards: Array[Dictionary] = []
var gates: Array[Dictionary] = []
var particles: Array[Dictionary] = []
var score := 0
var carried_score := 0
var high_score := 0
var wave := 1
var stability := 0.0
var gate_index := 0
var spawn_timer := 0.8
var shot_timer := 0.0
var message := "EVREN-3: YARIK HARITACISI"
var message_timer := 4.0
var time_alive := 0.0
var stars: Array[Dictionary] = []

func _ready() -> void:
	rng.randomize()
	_read_entry_state()
	_setup_stars()
	_reset_run()
	mode = "intro"
	message = "EVREN-2 FILOSU DAGILDI. BASINC HARITAYA DONUSTU."
	set_process(true)

func _read_entry_state() -> void:
	high_score = _load_int("universe3RiftHigh", 0)
	if OS.has_feature("web") and Engine.has_singleton("JavaScriptBridge"):
		var js = Engine.get_singleton("JavaScriptBridge")
		var raw = js.eval("(new URLSearchParams(location.search)).get('score') || sessionStorage.getItem('universe2ArcadeScore') || '0'", true)
		carried_score = max(0, int(str(raw)))
	else:
		carried_score = 0
	score = carried_score
	high_score = max(high_score, score)

func _load_int(key: String, fallback: int) -> int:
	if OS.has_feature("web") and Engine.has_singleton("JavaScriptBridge"):
		var js = Engine.get_singleton("JavaScriptBridge")
		var value = js.eval("localStorage.getItem('%s') || '%s'" % [key, str(fallback)], true)
		return int(str(value))
	return fallback

func _save_int(key: String, value: int) -> void:
	if OS.has_feature("web") and Engine.has_singleton("JavaScriptBridge"):
		var js = Engine.get_singleton("JavaScriptBridge")
		js.eval("localStorage.setItem('%s','%s')" % [key, str(value)], true)

func _setup_stars() -> void:
	stars.clear()
	for i in range(130):
		stars.append({
			"pos": Vector2(rng.randf_range(0, VIEW.x), rng.randf_range(0, VIEW.y)),
			"speed": rng.randf_range(12, 76),
			"size": rng.randf_range(1, 3),
			"hue": rng.randf()
		})

func _reset_run() -> void:
	player.pos = Vector2(VIEW.x * 0.5, VIEW.y * 0.76)
	player.vel = Vector2.ZERO
	player.hp = 5
	player.dash = 0.0
	player.invuln = 1.6
	player.pulse = 35.0
	enemies.clear()
	bullets.clear()
	shards.clear()
	gates.clear()
	particles.clear()
	score = carried_score
	wave = 1
	stability = 0.0
	gate_index = 0
	spawn_timer = 0.7
	shot_timer = 0.0
	time_alive = 0.0
	for i in range(3):
		_spawn_gate(i)

func _process(delta: float) -> void:
	_update_background(delta)
	if mode == "intro":
		if Input.is_action_just_pressed("dash") or Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
			mode = "play"
			message = "YARIK 01 ACILDI: ISARETLERI TOPLA, GECITLERI STABILIZE ET."
			message_timer = 3.2
	elif mode == "play":
		_update_play(delta)
	elif mode == "over":
		if Input.is_action_just_pressed("restart") or Input.is_action_just_pressed("dash"):
			_reset_run()
			mode = "play"
			message = "YENI ROTA HESAPLANDI."
			message_timer = 2.0

	if message_timer > 0:
		message_timer -= delta
	queue_redraw()

func _update_background(delta: float) -> void:
	for star in stars:
		star.pos.y += star.speed * delta * (1.0 + stability * 0.01)
		if star.pos.y > VIEW.y + 8:
			star.pos.y = -8
			star.pos.x = rng.randf_range(0, VIEW.x)

func _update_play(delta: float) -> void:
	time_alive += delta
	player.invuln = max(0.0, player.invuln - delta)
	player.dash = max(0.0, player.dash - delta)
	shot_timer = max(0.0, shot_timer - delta)
	spawn_timer -= delta
	player.pulse = min(100.0, player.pulse + delta * 5.0)

	_move_player(delta)
	_auto_fire(delta)
	_spawn_pressure(delta)
	_update_bullets(delta)
	_update_enemies(delta)
	_update_shards(delta)
	_update_gates(delta)
	_update_particles(delta)

	if Input.is_action_just_pressed("pulse") and player.pulse >= 100.0:
		_use_pulse()

	if player.hp <= 0:
		_finish_run(false)

func _move_player(delta: float) -> void:
	var input := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	var speed := 230.0 + stability * 1.6
	if Input.is_action_just_pressed("dash") and player.dash <= 0.0 and input.length() > 0.1:
		player.vel = input.normalized() * 660.0
		player.dash = 0.78
		player.invuln = 0.35
		_burst(player.pos, Color(0.7, 1.0, 1.0), 18)
	else:
		player.vel = player.vel.move_toward(input.normalized() * speed, 1600.0 * delta)
	player.pos += player.vel * delta
	player.pos.x = clamp(player.pos.x, 34.0, VIEW.x - 34.0)
	player.pos.y = clamp(player.pos.y, 42.0, VIEW.y - 34.0)

func _auto_fire(_delta: float) -> void:
	if shot_timer > 0.0:
		return
	shot_timer = max(0.08, 0.18 - stability * 0.003)
	var target := get_global_mouse_position()
	if target.distance_to(player.pos) < 22.0:
		target = player.pos + Vector2(0, -1)
	var dir := (target - player.pos).normalized()
	bullets.append({
		"pos": player.pos + dir * 24.0,
		"vel": dir * 620.0,
		"friendly": true,
		"life": 0.85,
		"damage": 1 + int(stability / 36.0)
	})

func _spawn_pressure(_delta: float) -> void:
	if spawn_timer > 0.0:
		return
	spawn_timer = max(0.22, 1.05 - wave * 0.055 - stability * 0.006)
	var side := rng.randi_range(0, 3)
	var pos := Vector2.ZERO
	if side == 0:
		pos = Vector2(rng.randf_range(20, VIEW.x - 20), -20)
	elif side == 1:
		pos = Vector2(VIEW.x + 20, rng.randf_range(40, VIEW.y - 80))
	elif side == 2:
		pos = Vector2(rng.randf_range(20, VIEW.x - 20), VIEW.y + 20)
	else:
		pos = Vector2(-20, rng.randf_range(40, VIEW.y - 80))
	var enemy_type := "chaser"
	if wave >= 3 and rng.randf() < 0.22:
		enemy_type = "splitter"
	elif wave >= 2 and rng.randf() < 0.34:
		enemy_type = "sentinel"
	enemies.append({
		"pos": pos,
		"vel": Vector2.ZERO,
		"hp": 2 + wave + (2 if enemy_type == "splitter" else 0),
		"type": enemy_type,
		"fire": rng.randf_range(0.55, 1.5),
		"phase": rng.randf_range(0, TAU)
	})

func _update_bullets(delta: float) -> void:
	for i in range(bullets.size() - 1, -1, -1):
		var b := bullets[i]
		b.pos += b.vel * delta
		b.life -= delta
		if b.life <= 0.0 or b.pos.x < -50 or b.pos.x > VIEW.x + 50 or b.pos.y < -60 or b.pos.y > VIEW.y + 60:
			bullets.remove_at(i)
			continue
		if b.friendly:
			for j in range(enemies.size() - 1, -1, -1):
				if b.pos.distance_to(enemies[j].pos) < ENEMY_RADIUS + BULLET_RADIUS:
					enemies[j].hp -= b.damage
					_burst(b.pos, Color(0.2, 1.0, 0.75), 5)
					bullets.remove_at(i)
					if enemies[j].hp <= 0:
						_kill_enemy(j)
					break
		elif player.invuln <= 0.0 and b.pos.distance_to(player.pos) < PLAYER_RADIUS + BULLET_RADIUS:
			bullets.remove_at(i)
			_hurt_player()

func _update_enemies(delta: float) -> void:
	for i in range(enemies.size() - 1, -1, -1):
		var e := enemies[i]
		var to_player := (player.pos - e.pos).normalized()
		var speed := 74.0 + wave * 9.0
		if e.type == "sentinel":
			e.phase += delta * 4.2
			e.vel = e.vel.move_toward(to_player * (speed * 0.68) + Vector2(cos(e.phase), sin(e.phase)) * 80.0, 520.0 * delta)
			e.fire -= delta
			if e.fire <= 0.0:
				e.fire = rng.randf_range(0.9, 1.7)
				_enemy_shot(e.pos, to_player)
		elif e.type == "splitter":
			e.vel = e.vel.move_toward(to_player * (speed * 0.82), 470.0 * delta)
		else:
			e.vel = e.vel.move_toward(to_player * speed, 680.0 * delta)
		e.pos += e.vel * delta
		if player.invuln <= 0.0 and e.pos.distance_to(player.pos) < PLAYER_RADIUS + ENEMY_RADIUS:
			_kill_enemy(i, false)
			_hurt_player()

func _enemy_shot(pos: Vector2, dir: Vector2) -> void:
	bullets.append({
		"pos": pos + dir * 18.0,
		"vel": dir * (170.0 + wave * 12.0),
		"friendly": false,
		"life": 3.4,
		"damage": 1
	})

func _kill_enemy(index: int, drop := true) -> void:
	if index < 0 or index >= enemies.size():
		return
	var e := enemies[index]
	score += 90 * wave
	high_score = max(high_score, score)
	_burst(e.pos, Color(1.0, 0.22, 0.85), 14)
	if drop or rng.randf() < 0.45:
		shards.append({ "pos": e.pos, "vel": Vector2(rng.randf_range(-30, 30), rng.randf_range(-20, 20)), "life": 11.0 })
	if e.type == "splitter":
		for k in range(2):
			enemies.append({
				"pos": e.pos + Vector2(rng.randf_range(-14, 14), rng.randf_range(-14, 14)),
				"vel": Vector2.ZERO,
				"hp": 2 + wave,
				"type": "chaser",
				"fire": 2.0,
				"phase": rng.randf_range(0, TAU)
			})
	enemies.remove_at(index)

func _update_shards(delta: float) -> void:
	for i in range(shards.size() - 1, -1, -1):
		var s := shards[i]
		s.life -= delta
		var to_player := player.pos - s.pos
		if to_player.length() < 150:
			s.vel = s.vel.move_toward(to_player.normalized() * 260.0, 520.0 * delta)
		else:
			s.vel *= 0.985
		s.pos += s.vel * delta
		if s.life <= 0.0:
			shards.remove_at(i)
		elif s.pos.distance_to(player.pos) < PLAYER_RADIUS + SHARD_RADIUS:
			shards.remove_at(i)
			stability = min(100.0, stability + 5.0)
			player.pulse = min(100.0, player.pulse + 8.0)
			score += 45
			high_score = max(high_score, score)
			_burst(player.pos, Color(0.95, 1.0, 0.35), 8)

func _spawn_gate(index: int) -> void:
	var x := lerp(180.0, VIEW.x - 180.0, index / 2.0)
	gates.append({ "pos": Vector2(x, 112 + index * 52), "need": 30.0 + index * 22.0, "open": false, "phase": rng.randf_range(0, TAU) })

func _update_gates(delta: float) -> void:
	for i in range(gates.size()):
		gates[i].phase += delta
		if not gates[i].open and stability >= gates[i].need:
			gates[i].open = true
			gate_index += 1
			wave += 1
			message = "GECIT %02d STABILIZE EDILDI." % gate_index
			message_timer = 2.4
			_burst(gates[i].pos, Color(0.35, 0.92, 1.0), 32)
	if gate_index >= gates.size():
		_finish_run(true)

func _update_particles(delta: float) -> void:
	for i in range(particles.size() - 1, -1, -1):
		particles[i].pos += particles[i].vel * delta
		particles[i].life -= delta
		if particles[i].life <= 0.0:
			particles.remove_at(i)

func _use_pulse() -> void:
	player.pulse = 0.0
	bullets = bullets.filter(func(b): return b.friendly)
	for i in range(enemies.size() - 1, -1, -1):
		enemies[i].hp -= 2 + wave
		if enemies[i].hp <= 0:
			_kill_enemy(i)
	_burst(player.pos, Color(1.0, 1.0, 1.0), 46)
	message = "PULSE: BASINC TEMIZLENDI"
	message_timer = 1.5

func _hurt_player() -> void:
	player.hp -= 1
	player.invuln = 1.2
	player.dash = min(player.dash, 0.25)
	_burst(player.pos, Color(1.0, 0.1, 0.26), 28)
	message = "GOVDE BUTUNLUGU: %d" % player.hp
	message_timer = 1.3

func _finish_run(victory: bool) -> void:
	mode = "over"
	_save_int("universe3RiftHigh", high_score)
	if victory:
		message = "EVREN-3 HARITALANDI. SIRADAKI SINYAL UYANIYOR."
		score += 2500 + int(stability) * 20
		high_score = max(high_score, score)
	else:
		message = "YARIK KAPANDI. HARITA EKSIK KALDI."
	message_timer = 99.0

func _burst(pos: Vector2, color: Color, count: int) -> void:
	for i in range(count):
		var a := rng.randf_range(0, TAU)
		var spd := rng.randf_range(50, 330)
		particles.append({ "pos": pos, "vel": Vector2(cos(a), sin(a)) * spd, "life": rng.randf_range(0.22, 0.8), "color": color })

func _draw() -> void:
	_draw_background()
	if mode == "intro":
		_draw_intro()
	else:
		_draw_world()
		_draw_hud()
		if mode == "over":
			_draw_over()

func _draw_background() -> void:
	draw_rect(Rect2(Vector2.ZERO, VIEW), Color(0.01, 0.008, 0.025))
	for star in stars:
		var c := Color(0.22 + star.hue * 0.45, 0.9, 1.0, 0.28 + star.hue * 0.42)
		draw_rect(Rect2(star.pos, Vector2(star.size, star.size)), c)
	for y in range(0, int(VIEW.y), 36):
		var alpha := 0.05 + stability * 0.0006
		draw_line(Vector2(0, y + fmod(time_alive * 24, 36)), Vector2(VIEW.x, y + fmod(time_alive * 24, 36)), Color(0.1, 0.92, 0.95, alpha), 1)

func _draw_world() -> void:
	for gate in gates:
		var col := Color(0.3, 1.0, 0.92, 0.9) if gate.open else Color(0.95, 0.18, 0.85, 0.58)
		var r := 30.0 + sin(gate.phase * 2.0) * 4.0
		draw_arc(gate.pos, r, 0, TAU, 48, col, 3)
		draw_line(gate.pos + Vector2(-18, 0), gate.pos + Vector2(18, 0), col, 2)
		draw_line(gate.pos + Vector2(0, -18), gate.pos + Vector2(0, 18), col, 2)

	for shard in shards:
		draw_circle(shard.pos, SHARD_RADIUS, Color(1.0, 0.95, 0.25, 0.88))
		draw_circle(shard.pos, SHARD_RADIUS * 0.42, Color(1.0, 1.0, 1.0, 0.8))

	for b in bullets:
		var col := Color(0.45, 1.0, 0.96) if b.friendly else Color(1.0, 0.18, 0.34)
		draw_circle(b.pos, BULLET_RADIUS if b.friendly else BULLET_RADIUS + 2, col)

	for enemy in enemies:
		var col := Color(1.0, 0.2, 0.8) if enemy.type != "sentinel" else Color(1.0, 0.82, 0.24)
		draw_circle(enemy.pos, ENEMY_RADIUS + (4 if enemy.type == "splitter" else 0), col)
		draw_circle(enemy.pos, 6, Color(0.02, 0.01, 0.06))

	for p in particles:
		draw_circle(p.pos, max(1.0, p.life * 5.0), p.color)

	var ship_col := Color(0.35, 1.0, 0.92) if player.invuln <= 0.0 or int(time_alive * 18) % 2 == 0 else Color(1, 1, 1)
	var nose := player.pos + Vector2(0, -24)
	var left := player.pos + Vector2(-18, 18)
	var right := player.pos + Vector2(18, 18)
	draw_colored_polygon(PackedVector2Array([nose, left, player.pos + Vector2(0, 8), right]), ship_col)
	draw_line(left, right, Color(1.0, 0.2, 0.88), 3)
	if player.dash > 0.0:
		draw_circle(player.pos, 28 + player.dash * 12, Color(0.6, 1.0, 1.0, 0.25))

func _draw_hud() -> void:
	var hud := "EVREN-3 / RIFT CARTOGRAPHER\nSKOR %d  HIGH %d\nCAN %d  DALGA %d\nSTABILITE %02d%%  PULSE %02d%%" % [score, high_score, player.hp, wave, int(stability), int(player.pulse)]
	draw_string(ThemeDB.fallback_font, Vector2(24, 34), hud, HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color(0.8, 1.0, 1.0))
	if message_timer > 0.0:
		draw_string(ThemeDB.fallback_font, Vector2(24, VIEW.y - 32), message, HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Color(1.0, 1.0, 1.0))

func _draw_intro() -> void:
	draw_circle(VIEW * 0.5, 160 + sin(Time.get_ticks_msec() * 0.002) * 10, Color(0.18, 0.0, 0.32, 0.68))
	draw_arc(VIEW * 0.5, 175, 0, TAU, 96, Color(0.2, 1.0, 0.94, 0.76), 4)
	draw_string(ThemeDB.fallback_font, Vector2(172, 218), "UNIVERSE-3: YARIK HARITACISI", HORIZONTAL_ALIGNMENT_LEFT, -1, 34, Color(1, 1, 1))
	draw_string(ThemeDB.fallback_font, Vector2(192, 270), "Universe-2 filosundan kalan skor, artik rota basinci.", HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Color(0.75, 1, 1))
	draw_string(ThemeDB.fallback_font, Vector2(246, 332), "WASD/OKLAR hareket  |  MOUSE hedef  |  SPACE dash  |  X pulse", HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color(1.0, 0.78, 0.24))
	draw_string(ThemeDB.fallback_font, Vector2(360, 390), "BASLAMAK ICIN SPACE / TIKLA", HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Color(0.58, 1, 0.88))

func _draw_over() -> void:
	draw_rect(Rect2(Vector2(240, 150), Vector2(480, 244)), Color(0.02, 0.01, 0.05, 0.88))
	draw_rect(Rect2(Vector2(240, 150), Vector2(480, 244)), Color(0.18, 1.0, 0.95, 0.45), false, 2)
	draw_string(ThemeDB.fallback_font, Vector2(292, 204), message, HORIZONTAL_ALIGNMENT_LEFT, 390, 22, Color(1, 1, 1))
	draw_string(ThemeDB.fallback_font, Vector2(342, 270), "SKOR %d  /  HIGH %d" % [score, high_score], HORIZONTAL_ALIGNMENT_LEFT, -1, 22, Color(0.95, 1, 0.45))
	draw_string(ThemeDB.fallback_font, Vector2(330, 326), "R veya SPACE: yeniden rota", HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Color(0.65, 1, 1))
