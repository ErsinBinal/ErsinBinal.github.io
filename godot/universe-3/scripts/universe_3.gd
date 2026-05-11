extends Node2D

const VIEW := Vector2(1280, 720)
const PLAYER_RADIUS := 22.0
const CORE_RADIUS := 11.0
const BULLET_RADIUS := 5.0

const COL_BG := Color(0.025, 0.027, 0.04)
const COL_TEXT := Color(0.95, 0.97, 1.0)
const COL_MUTED := Color(0.65, 0.7, 0.78)
const COL_CYAN := Color(0.27, 0.84, 0.82)
const COL_GREEN := Color(0.55, 0.92, 0.47)
const COL_GOLD := Color(0.95, 0.78, 0.42)
const COL_RED := Color(1.0, 0.36, 0.48)
const COL_VIOLET := Color(0.72, 0.58, 1.0)

var rng := RandomNumberGenerator.new()
var mode := "intro"
var player := {
	"pos": Vector2(640, 520),
	"vel": Vector2.ZERO,
	"hp": 100.0,
	"energy": 100.0,
	"heat": 0.0,
	"invuln": 0.0,
	"blink": 0.0,
	"pulse": 28.0,
	"scan": 0.0
}
var enemies: Array[Dictionary] = []
var bullets: Array[Dictionary] = []
var cores: Array[Dictionary] = []
var anchors: Array[Dictionary] = []
var particles: Array[Dictionary] = []
var trails: Array[Dictionary] = []
var stars: Array[Dictionary] = []
var score := 0
var carried_score := 0
var high_score := 0
var wave := 1
var stability := 0.0
var scanned := 0
var core_count := 0
var spawn_timer := 0.45
var shot_timer := 0.0
var status := "AXIOM KAPISI KILITLI. ILK ANKRAJI TARA."
var status_timer := 5.0
var time_alive := 0.0
var gate_charge := 0.0
var shake := 0.0

func _ready() -> void:
	rng.randomize()
	_read_entry_state()
	_setup_stars()
	_reset_run()
	mode = "intro"
	set_process(true)

func _read_entry_state() -> void:
	high_score = max(_load_int("universe3AxiomHigh", 0), _load_int("universe3RiftHigh", 0))
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
	for i in range(230):
		stars.append({
			"pos": Vector2(rng.randf_range(0, VIEW.x), rng.randf_range(0, VIEW.y)),
			"speed": rng.randf_range(14, 92),
			"size": rng.randf_range(1, 3),
			"tone": rng.randf()
		})

func _reset_run() -> void:
	player.pos = Vector2(VIEW.x * 0.5, VIEW.y * 0.72)
	player.vel = Vector2.ZERO
	player.hp = 100.0
	player.energy = 100.0
	player.heat = 0.0
	player.invuln = 1.3
	player.blink = 0.0
	player.pulse = 28.0
	player.scan = 0.0
	enemies.clear()
	bullets.clear()
	cores.clear()
	anchors.clear()
	particles.clear()
	trails.clear()
	score = carried_score
	wave = 1
	stability = 0.0
	scanned = 0
	core_count = 0
	spawn_timer = 0.45
	shot_timer = 0.0
	time_alive = 0.0
	gate_charge = 0.0
	shake = 0.0
	anchors.append({ "pos": Vector2(188, 158), "need": 18.0, "scan": 0.0, "open": false, "label": "N-01" })
	anchors.append({ "pos": Vector2(535, 104), "need": 34.0, "scan": 0.0, "open": false, "label": "K-17" })
	anchors.append({ "pos": Vector2(1004, 176), "need": 52.0, "scan": 0.0, "open": false, "label": "V-08" })
	anchors.append({ "pos": Vector2(720, 354), "need": 72.0, "scan": 0.0, "open": false, "label": "A-00" })
	_set_status("YAKINDAKI ANKRAJLARA GIR VE TARAMA HALKASININ ICINDE KAL.", 4.0)

func _process(delta: float) -> void:
	time_alive += delta
	_update_background(delta)
	if mode == "intro":
		if Input.is_action_just_pressed("dash") or Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT):
			mode = "play"
			_set_status("ANKRAJ TARAMASI BASLADI. ISIYI VE ENERJIYI YONET.", 3.0)
	elif mode == "play":
		_update_play(delta)
	elif mode == "over":
		if Input.is_action_just_pressed("restart") or Input.is_action_just_pressed("dash"):
			_reset_run()
			mode = "play"

	status_timer = max(0.0, status_timer - delta)
	shake = max(0.0, shake - delta * 24.0)
	queue_redraw()

func _set_status(text: String, seconds: float) -> void:
	status = text
	status_timer = seconds

func _update_background(delta: float) -> void:
	for star in stars:
		star.pos.y += star.speed * delta * (1.0 + stability * 0.005)
		if star.pos.y > VIEW.y + 8:
			star.pos.y = -8
			star.pos.x = rng.randf_range(0, VIEW.x)

func _update_play(delta: float) -> void:
	player.invuln = max(0.0, player.invuln - delta)
	player.blink = max(0.0, player.blink - delta)
	player.energy = clamp(player.energy + delta * (18.0 + stability * 0.08), 0.0, 100.0)
	var heat_drain := 18.0 if player.heat > 68.0 else 30.0
	player.heat = clamp(player.heat - delta * heat_drain, 0.0, 100.0)
	player.pulse = clamp(player.pulse + delta * (3.8 + core_count * 0.03), 0.0, 100.0)
	shot_timer -= delta
	spawn_timer -= delta

	_move_player(delta)
	if shot_timer <= 0.0:
		var focused := Input.is_mouse_button_pressed(MOUSE_BUTTON_LEFT)
		shot_timer = 0.072 if focused else max(0.11, 0.18 - stability * 0.0018)
		_fire_player(focused)
	if spawn_timer <= 0.0:
		spawn_timer = max(0.19, 0.92 - wave * 0.054 - stability * 0.003)
		_spawn_enemy()
		if wave >= 4 and rng.randf() < 0.16:
			_spawn_enemy()

	_update_anchors(delta)
	_update_bullets(delta)
	_update_enemies(delta)
	_update_cores(delta)
	_update_particles(delta)

	if Input.is_action_just_pressed("pulse") and player.pulse >= 100.0:
		_use_pulse()
	if Input.is_action_just_pressed("restart"):
		_reset_run()
	if player.hp <= 0.0:
		_finish_run(false)

func _move_player(delta: float) -> void:
	var input := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	if Input.is_action_just_pressed("dash") and player.blink <= 0.0 and player.energy >= 28.0 and input.length() > 0.1:
		player.vel = input.normalized() * 850.0
		player.energy -= 28.0
		player.blink = 0.62
		player.invuln = max(player.invuln, 0.38)
		_burst(player.pos, Color(1, 1, 1), 28, 360.0)
	else:
		var speed := 278.0 + stability * 1.25
		player.vel = player.vel.move_toward(input.normalized() * speed, 3600.0 * delta)
	player.pos += player.vel * delta
	player.pos.x = clamp(player.pos.x, 34.0, VIEW.x - 34.0)
	player.pos.y = clamp(player.pos.y, 42.0, VIEW.y - 34.0)
	trails.append({ "pos": player.pos + Vector2(0, 16), "life": 0.35, "vel": -player.vel * 0.05 })

func _fire_player(focused: bool) -> void:
	if player.heat > 92.0:
		return
	var target := get_global_mouse_position()
	if target.distance_to(player.pos) < 24.0:
		target = player.pos + Vector2(0, -1)
	var dir := (target - player.pos).normalized()
	var shots := 2 if focused and stability >= 38.0 else 1
	player.heat = clamp(player.heat + (4.4 if focused else 2.15), 0.0, 100.0)
	for i in range(shots):
		var turn := (float(i) - float(shots - 1) * 0.5) * (0.045 if focused else 0.018)
		var out := dir.rotated(turn)
		bullets.append({
			"pos": player.pos + out * 28.0,
			"vel": out * (850.0 if focused else 710.0),
			"friendly": true,
			"life": 0.62 if focused else 0.82,
			"damage": 2 + int(stability / 34.0) if focused else 1 + int(stability / 48.0),
			"color": COL_GOLD if focused else COL_CYAN,
			"radius": 5.2 if focused else 4.4
		})

func _spawn_enemy() -> void:
	var side := rng.randi_range(0, 3)
	var pos := Vector2(rng.randf_range(0, VIEW.x), -36)
	if side == 1:
		pos = Vector2(VIEW.x + 36, rng.randf_range(70, VIEW.y - 140))
	elif side == 2:
		pos = Vector2(rng.randf_range(0, VIEW.x), VIEW.y + 36)
	elif side == 3:
		pos = Vector2(-36, rng.randf_range(70, VIEW.y - 140))
	var roll := rng.randf()
	var enemy_type := "seeker"
	if wave >= 4 and roll < 0.14:
		enemy_type = "warden"
	elif wave >= 3 and roll < 0.32:
		enemy_type = "mine"
	elif wave >= 2 and roll < 0.62:
		enemy_type = "lancer"
	var hp := 3 + wave
	var speed := 94.0
	var radius := 17.0
	var color := COL_RED
	if enemy_type == "lancer":
		hp = 4 + wave
		speed = 70.0
		radius = 19.0
		color = COL_GOLD
	elif enemy_type == "mine":
		hp = 2 + int(ceil(wave * 0.6))
		speed = 52.0
		radius = 15.0
		color = COL_VIOLET
	elif enemy_type == "warden":
		hp = 10 + wave * 2
		speed = 44.0
		radius = 25.0
		color = COL_GREEN
	enemies.append({
		"type": enemy_type,
		"pos": pos,
		"vel": Vector2.ZERO,
		"hp": float(hp),
		"max_hp": float(hp),
		"speed": speed,
		"radius": radius,
		"color": color,
		"fire": rng.randf_range(0.45, 1.75),
		"phase": rng.randf_range(0, TAU)
	})

func _update_anchors(delta: float) -> void:
	var near_anchor := false
	for anchor in anchors:
		var distance := anchor.pos.distance_to(player.pos)
		if not anchor.open and distance < 108.0:
			near_anchor = true
			var pressure := 0
			for enemy in enemies:
				if enemy.pos.distance_to(anchor.pos) < 125.0:
					pressure += 1
			var rate := 6.0 if pressure > 0 else 18.0 + core_count * 0.06
			anchor.scan = clamp(anchor.scan + delta * rate, 0.0, 100.0)
			player.scan = anchor.scan
			if anchor.scan >= 100.0:
				anchor.open = true
				scanned += 1
				wave += 1
				stability = max(stability, anchor.need)
				score += 800 + wave * 140
				high_score = max(high_score, score)
				_burst(anchor.pos, COL_CYAN, 44, 380.0)
				_set_status("%s ANKRAJI TARANDI. KAPI YUKU YUKSELIYOR." % anchor.label, 2.6)
	if not near_anchor:
		player.scan = max(0.0, player.scan - delta * 32.0)
	gate_charge = clamp((float(scanned) / float(anchors.size())) * 64.0 + stability * 0.36, 0.0, 100.0)
	if scanned >= anchors.size() and stability >= 100.0:
		_burst(Vector2(VIEW.x * 0.5, 104), COL_GREEN, 90, 520.0)
		_finish_run(true)

func _update_bullets(delta: float) -> void:
	for i in range(bullets.size() - 1, -1, -1):
		var b := bullets[i]
		b.pos += b.vel * delta
		b.life -= delta
		if b.life <= 0.0 or b.pos.x < -80 or b.pos.x > VIEW.x + 80 or b.pos.y < -80 or b.pos.y > VIEW.y + 80:
			bullets.remove_at(i)
			continue
		if b.friendly:
			for j in range(enemies.size() - 1, -1, -1):
				var e := enemies[j]
				if b.pos.distance_to(e.pos) < e.radius + b.radius:
					e.hp -= b.damage
					_burst(b.pos, b.color, 4, 120.0)
					bullets.remove_at(i)
					if e.hp <= 0.0:
						_kill_enemy(j)
					break
		elif player.invuln <= 0.0 and b.pos.distance_to(player.pos) < PLAYER_RADIUS + b.radius:
			bullets.remove_at(i)
			_hurt_player(b.damage)

func _update_enemies(delta: float) -> void:
	for i in range(enemies.size() - 1, -1, -1):
		var e := enemies[i]
		var to_player := (player.pos - e.pos).normalized()
		e.phase += delta * 3.8
		var desired := to_player * e.speed
		if e.type == "lancer":
			desired += Vector2(cos(e.phase) * 76.0, sin(e.phase * 0.8) * 42.0)
			e.fire -= delta
			if e.fire <= 0.0:
				e.fire = rng.randf_range(1.2, 2.0)
				_enemy_shot(e, 255.0 + wave * 8.0, 0.0)
		elif e.type == "mine":
			if e.pos.distance_to(player.pos) < 150.0:
				desired *= 1.8
		elif e.type == "warden":
			desired += Vector2(cos(e.phase * 0.7) * 54.0, sin(e.phase) * 54.0)
			e.fire -= delta
			if e.fire <= 0.0:
				e.fire = rng.randf_range(1.55, 2.15)
				_enemy_shot(e, 190.0, -0.18)
				_enemy_shot(e, 190.0, 0.18)
		e.vel = e.vel.move_toward(desired, 640.0 * delta)
		e.pos += e.vel * delta
		if player.invuln <= 0.0 and e.pos.distance_to(player.pos) < e.radius + PLAYER_RADIUS:
			var damage := 12.0
			if e.type == "warden":
				damage = 18.0
			elif e.type == "mine":
				damage = 22.0
			_kill_enemy(i, false)
			_hurt_player(damage)

func _enemy_shot(e: Dictionary, speed: float, spread: float) -> void:
	var dir := (player.pos - e.pos).normalized().rotated(spread)
	bullets.append({
		"pos": e.pos + dir * (e.radius + 6.0),
		"vel": dir * speed,
		"friendly": false,
		"life": 3.1,
		"damage": 16.0 if e.type == "warden" else 10.0,
		"color": e.color,
		"radius": 8.0 if e.type == "warden" else 6.0
	})

func _kill_enemy(index: int, drop := true) -> void:
	if index < 0 or index >= enemies.size():
		return
	var e := enemies[index]
	var value := 95
	if e.type == "lancer":
		value = 150
	elif e.type == "mine":
		value = 120
	elif e.type == "warden":
		value = 280
	score += value * wave
	high_score = max(high_score, score)
	var particle_count := 18
	var particle_speed := 250.0
	if e.type == "warden":
		particle_count = 34
		particle_speed = 360.0
	_burst(e.pos, e.color, particle_count, particle_speed)
	if drop or rng.randf() < 0.48:
		var amount := 1
		if e.type == "warden":
			amount = 3
		elif e.type == "lancer":
			amount = 2
		for k in range(amount):
			cores.append({
				"pos": e.pos + Vector2(rng.randf_range(-9, 9), rng.randf_range(-9, 9)),
				"vel": Vector2(rng.randf_range(-50, 50), rng.randf_range(-50, 50)),
				"life": 13.0,
				"value": 3 if e.type == "warden" else 1
			})
	if e.type == "mine":
		for k in range(8):
			_enemy_shot(e, 205.0, float(k) / 8.0 * TAU)
	enemies.remove_at(index)

func _hurt_player(amount: float) -> void:
	if player.invuln > 0.0:
		return
	player.hp = clamp(player.hp - amount, 0.0, 100.0)
	player.invuln = 0.72
	shake = max(shake, 12.0)
	_burst(player.pos, COL_RED, 24, 320.0)
	_set_status("GOVDE HASARI: %d. ENERJI KALKANI TOPLANIYOR." % int(amount), 1.4)

func _update_cores(delta: float) -> void:
	for i in range(cores.size() - 1, -1, -1):
		var c := cores[i]
		c.life -= delta
		var to_player := player.pos - c.pos
		if to_player.length() < 190.0:
			c.vel = c.vel.move_toward(to_player.normalized() * 330.0, 680.0 * delta)
		else:
			c.vel *= 0.982
		c.pos += c.vel * delta
		if c.life <= 0.0:
			cores.remove_at(i)
		elif c.pos.distance_to(player.pos) < PLAYER_RADIUS + CORE_RADIUS:
			cores.remove_at(i)
			var gain := 4.0 * c.value
			core_count += c.value
			stability = clamp(stability + gain, 0.0, 100.0)
			player.energy = clamp(player.energy + 14.0, 0.0, 100.0)
			player.pulse = clamp(player.pulse + 10.0, 0.0, 100.0)
			score += 70 * c.value
			high_score = max(high_score, score)
			_burst(player.pos, COL_GREEN, 9, 180.0)

func _update_particles(delta: float) -> void:
	for i in range(particles.size() - 1, -1, -1):
		particles[i].pos += particles[i].vel * delta
		particles[i].vel *= 0.985
		particles[i].life -= delta
		if particles[i].life <= 0.0:
			particles.remove_at(i)
	for i in range(trails.size() - 1, -1, -1):
		trails[i].pos += trails[i].vel * delta
		trails[i].life -= delta
		if trails[i].life <= 0.0:
			trails.remove_at(i)

func _use_pulse() -> void:
	player.pulse = 0.0
	player.heat = clamp(player.heat - 34.0, 0.0, 100.0)
	shake = 14.0
	for i in range(enemies.size() - 1, -1, -1):
		enemies[i].hp -= 5.0 + wave
		enemies[i].vel += (enemies[i].pos - player.pos) * 1.8
		if enemies[i].hp <= 0.0:
			_kill_enemy(i)
	for i in range(bullets.size() - 1, -1, -1):
		if not bullets[i].friendly:
			bullets.remove_at(i)
	_burst(player.pos, Color(1, 1, 1), 72, 520.0)
	_set_status("RIFT PULSE DUSMAN BASINCINI TEMIZLEDI.", 1.8)

func _finish_run(victory: bool) -> void:
	mode = "over"
	if victory:
		score += 2800 + int(stability * 34.0)
		high_score = max(high_score, score)
		_set_status("AXIOM KAPISI STABILIZE EDILDI. ROTA CANLI.", 99.0)
	else:
		_set_status("YARIK KAPANDI. HARITA EKSIK KALDI.", 99.0)
	_save_int("universe3AxiomHigh", high_score)

func _burst(pos: Vector2, color: Color, count: int, max_speed: float) -> void:
	for i in range(count):
		var a := rng.randf_range(0, TAU)
		var speed := rng.randf_range(30, max_speed)
		particles.append({
			"pos": pos,
			"vel": Vector2(cos(a), sin(a)) * speed,
			"life": rng.randf_range(0.25, 0.78),
			"max_life": 0.78,
			"size": rng.randf_range(2, 6),
			"color": color
		})

func _draw() -> void:
	var offset := Vector2(rng.randf_range(-shake, shake), rng.randf_range(-shake, shake)) * 0.5
	draw_set_transform(offset, 0.0, Vector2.ONE)
	_draw_background()
	if mode == "intro":
		_draw_gate()
		_draw_anchors(true)
		_draw_player()
		_draw_intro()
	else:
		_draw_gate()
		_draw_anchors(false)
		_draw_world()
		_draw_player()
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	_draw_hud()
	if mode == "over":
		_draw_over()

func _draw_background() -> void:
	draw_rect(Rect2(Vector2.ZERO, VIEW), COL_BG)
	for star in stars:
		var col := COL_CYAN.lerp(COL_GOLD if star.tone > 0.7 else COL_VIOLET, 0.42)
		col.a = 0.18 + star.tone * 0.52
		draw_rect(Rect2(star.pos, Vector2(star.size, star.size)), col)
	for x in range(0, int(VIEW.x), 42):
		draw_line(Vector2(x + fmod(time_alive * 18.0, 42.0), 0), Vector2(x + fmod(time_alive * 18.0, 42.0), VIEW.y), Color(0.86, 0.9, 1.0, 0.035), 1)
	for y in range(0, int(VIEW.y), 42):
		draw_line(Vector2(0, y + fmod(time_alive * 18.0, 42.0)), Vector2(VIEW.x, y + fmod(time_alive * 18.0, 42.0)), Color(0.86, 0.9, 1.0, 0.035), 1)

func _draw_gate() -> void:
	var pos := Vector2(VIEW.x * 0.5, 104)
	var p := gate_charge / 100.0
	for i in range(3):
		var col := COL_CYAN if i == 0 else COL_VIOLET
		col.a = 0.18 + p * 0.34
		draw_arc(pos, 92.0 + i * 26.0 + sin(time_alive * 2.0 + i) * 3.0, 0, TAU * max(0.12, p), 96, col, 3.0 - i * 0.5)
	var fill := COL_GREEN if p >= 1.0 else COL_GOLD
	fill.a = 0.16 + p * 0.24
	draw_circle(pos, 34.0 + p * 18.0, fill)

func _draw_anchors(quiet: bool) -> void:
	for anchor in anchors:
		var p := anchor.scan / 100.0
		var col := COL_GREEN if anchor.open else COL_CYAN
		col.a = 0.85 if not quiet else 0.28
		draw_arc(anchor.pos, 34.0 + sin(time_alive * 3.0 + anchor.pos.x) * 3.0, -PI * 0.5, -PI * 0.5 + TAU * max(0.03, p), 64, col, 3)
		var range_col := COL_GOLD
		range_col.a = 0.16 if not anchor.open else 0.1
		draw_arc(anchor.pos, 108, 0, TAU, 72, range_col, 1)
		draw_rect(Rect2(anchor.pos - Vector2(18, 18), Vector2(36, 36)), Color(col.r, col.g, col.b, 0.16), true)
		draw_rect(Rect2(anchor.pos - Vector2(18, 18), Vector2(36, 36)), Color(0.95, 0.97, 1.0, 0.56), false, 1)
		draw_string(ThemeDB.fallback_font, anchor.pos + Vector2(-18, 56), anchor.label, HORIZONTAL_ALIGNMENT_LEFT, 64, 15, COL_TEXT)

func _draw_world() -> void:
	for trail in trails:
		var col := COL_CYAN
		col.a = max(0.0, trail.life / 0.35) * 0.45
		draw_circle(trail.pos, 8.0, col)
	for core in cores:
		var pts := PackedVector2Array([
			core.pos + Vector2(0, -11),
			core.pos + Vector2(10, 0),
			core.pos + Vector2(0, 11),
			core.pos + Vector2(-10, 0)
		])
		draw_colored_polygon(pts, COL_GREEN)
		draw_rect(Rect2(core.pos - Vector2(2, 2), Vector2(4, 4)), Color(1, 1, 1))
	for b in bullets:
		draw_circle(b.pos, b.radius, b.color)
	for enemy in enemies:
		_draw_enemy(enemy)
	for p in particles:
		var col: Color = p.color
		col.a = max(0.0, p.life / p.max_life)
		draw_circle(p.pos, max(1.0, p.size * col.a), col)

func _draw_enemy(e: Dictionary) -> void:
	var col: Color = e.color
	col.a = 0.88
	if e.type == "mine":
		var pts := PackedVector2Array()
		for k in range(8):
			var r := e.radius * (0.72 if (k % 2) == 1 else 1.22)
			var a := float(k) / 8.0 * TAU + e.phase * 0.55
			pts.append(e.pos + Vector2(cos(a), sin(a)) * r)
		draw_colored_polygon(pts, col)
	elif e.type == "warden":
		draw_rect(Rect2(e.pos - Vector2(e.radius, e.radius * 0.82), Vector2(e.radius * 2.0, e.radius * 1.64)), col, true)
		draw_rect(Rect2(e.pos - Vector2(e.radius, e.radius * 0.82), Vector2(e.radius * 2.0, e.radius * 1.64)), Color(col.r, col.g, col.b, 0.42), false, 2)
	else:
		var pts := PackedVector2Array([
			e.pos + Vector2(0, -e.radius),
			e.pos + Vector2(e.radius, 0),
			e.pos + Vector2(0, e.radius),
			e.pos + Vector2(-e.radius, 0)
		])
		draw_colored_polygon(pts, col)
	draw_circle(e.pos, e.radius * 0.32, COL_BG)
	draw_rect(Rect2(e.pos + Vector2(-e.radius, e.radius + 8), Vector2(e.radius * 2.0, 3)), Color(1, 1, 1, 0.16), true)
	draw_rect(Rect2(e.pos + Vector2(-e.radius, e.radius + 8), Vector2(e.radius * 2.0 * (e.hp / e.max_hp), 3)), e.color, true)

func _draw_player() -> void:
	var target := get_global_mouse_position()
	var angle := (target - player.pos).angle() + PI * 0.5
	var blink := player.invuln > 0.0 and int(time_alive * 20.0) % 2 == 0
	var nose := player.pos + Vector2(0, -30).rotated(angle)
	var right := player.pos + Vector2(19, 18).rotated(angle)
	var middle := player.pos + Vector2(0, 9).rotated(angle)
	var left := player.pos + Vector2(-19, 18).rotated(angle)
	draw_colored_polygon(PackedVector2Array([nose, right, middle, left]), Color(1, 1, 1) if blink else COL_TEXT)
	draw_line(player.pos + Vector2(-17, 18).rotated(angle), player.pos + Vector2(17, 18).rotated(angle), COL_RED, 4)
	draw_line(player.pos + Vector2(0, -10).rotated(angle), player.pos + Vector2(0, 14).rotated(angle), COL_CYAN, 8)
	if player.pulse >= 100.0:
		draw_arc(player.pos, 44 + sin(time_alive * 6.0) * 4.0, 0, TAU, 80, Color(1, 1, 1, 0.42), 2)

func _draw_hud() -> void:
	var x := 22.0
	draw_rect(Rect2(Vector2(14, 14), Vector2(332, 158)), Color(0.04, 0.05, 0.07, 0.78), true)
	draw_rect(Rect2(Vector2(14, 14), Vector2(332, 158)), Color(0.86, 0.9, 1.0, 0.16), false, 1)
	draw_string(ThemeDB.fallback_font, Vector2(x, 42), "AXIOM-RIFT   DALGA %d" % wave, HORIZONTAL_ALIGNMENT_LEFT, -1, 15, COL_MUTED)
	draw_string(ThemeDB.fallback_font, Vector2(x, 76), "%d" % score, HORIZONTAL_ALIGNMENT_LEFT, -1, 30, COL_TEXT)
	_draw_bar(Vector2(x, 94), "GOVDE", player.hp, COL_GREEN)
	_draw_bar(Vector2(x, 114), "ENERJI", player.energy, COL_CYAN)
	_draw_bar(Vector2(x, 134), "ISI", player.heat, COL_RED if player.heat > 78.0 else COL_GOLD)
	_draw_bar(Vector2(x, 154), "PULSE", player.pulse, COL_VIOLET)
	draw_rect(Rect2(Vector2(14, 182), Vector2(380, 62)), Color(0.04, 0.05, 0.07, 0.72), true)
	draw_rect(Rect2(Vector2(14, 182), Vector2(380, 62)), Color(0.86, 0.9, 1.0, 0.16), false, 1)
	draw_string(ThemeDB.fallback_font, Vector2(x, 206), "%d/%d ANKRAJ  %d CEKIRDEK" % [scanned, anchors.size(), core_count], HORIZONTAL_ALIGNMENT_LEFT, -1, 16, COL_TEXT)
	draw_string(ThemeDB.fallback_font, Vector2(x, 230), "KAPI %02d%%  STABILITE %02d%%  HIGH %d" % [int(gate_charge), int(stability), high_score], HORIZONTAL_ALIGNMENT_LEFT, -1, 15, COL_MUTED)
	if status_timer > 0.0:
		draw_rect(Rect2(Vector2(VIEW.x * 0.5 - 250, VIEW.y - 48), Vector2(500, 34)), Color(0.18, 0.13, 0.05, 0.78), true)
		draw_string(ThemeDB.fallback_font, Vector2(VIEW.x * 0.5 - 232, VIEW.y - 25), status, HORIZONTAL_ALIGNMENT_LEFT, 464, 15, COL_GOLD)

func _draw_bar(pos: Vector2, label: String, value: float, color: Color) -> void:
	draw_string(ThemeDB.fallback_font, pos, label, HORIZONTAL_ALIGNMENT_LEFT, -1, 13, COL_MUTED)
	draw_rect(Rect2(pos + Vector2(66, -10), Vector2(170, 7)), Color(1, 1, 1, 0.09), true)
	draw_rect(Rect2(pos + Vector2(66, -10), Vector2(170 * clamp(value / 100.0, 0.0, 1.0), 7)), color, true)
	draw_string(ThemeDB.fallback_font, pos + Vector2(246, 0), "%02d%%" % int(value), HORIZONTAL_ALIGNMENT_LEFT, -1, 13, COL_MUTED)

func _draw_intro() -> void:
	draw_rect(Rect2(Vector2(210, 216), Vector2(760, 250)), Color(0.04, 0.05, 0.07, 0.82), true)
	draw_rect(Rect2(Vector2(210, 216), Vector2(760, 250)), Color(0.86, 0.9, 1.0, 0.18), false, 1)
	draw_string(ThemeDB.fallback_font, Vector2(250, 276), "UNIVERSE-3: AXIOM RIFT", HORIZONTAL_ALIGNMENT_LEFT, -1, 46, COL_TEXT)
	draw_string(ThemeDB.fallback_font, Vector2(254, 326), "ANKRAJLARI TARA, CEKIRDEKLERI TOPLA, KAPIYI STABILIZE ET.", HORIZONTAL_ALIGNMENT_LEFT, 680, 21, COL_MUTED)
	draw_string(ThemeDB.fallback_font, Vector2(254, 378), "WASD/OKLAR hareket  |  MOUSE hedef  |  SPACE blink  |  X pulse", HORIZONTAL_ALIGNMENT_LEFT, 680, 18, COL_GOLD)
	draw_string(ThemeDB.fallback_font, Vector2(254, 426), "BASLAMAK ICIN SPACE / TIKLA", HORIZONTAL_ALIGNMENT_LEFT, -1, 20, COL_CYAN)

func _draw_over() -> void:
	draw_rect(Rect2(Vector2(370, 230), Vector2(540, 238)), Color(0.04, 0.05, 0.07, 0.92), true)
	draw_rect(Rect2(Vector2(370, 230), Vector2(540, 238)), Color(0.86, 0.9, 1.0, 0.2), false, 1)
	draw_string(ThemeDB.fallback_font, Vector2(410, 296), status, HORIZONTAL_ALIGNMENT_LEFT, 460, 25, COL_TEXT)
	draw_string(ThemeDB.fallback_font, Vector2(410, 368), "SKOR %d  /  HIGH %d" % [score, high_score], HORIZONTAL_ALIGNMENT_LEFT, -1, 23, COL_GOLD)
	draw_string(ThemeDB.fallback_font, Vector2(410, 420), "R veya SPACE: yeniden rota", HORIZONTAL_ALIGNMENT_LEFT, -1, 19, COL_CYAN)
