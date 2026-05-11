extends Node3D

const ARENA := Vector2(32.0, 18.0)
const PLAYER_RADIUS := 0.55
const ENEMY_RADIUS := 0.48
const CORE_RADIUS := 0.28
const BULLET_RADIUS := 0.14

const COL_BG := Color(0.025, 0.027, 0.04)
const COL_TEXT := Color(0.94, 0.97, 1.0)
const COL_MUTED := Color(0.62, 0.68, 0.76)
const COL_CYAN := Color(0.27, 0.84, 0.82)
const COL_GREEN := Color(0.55, 0.92, 0.47)
const COL_GOLD := Color(0.95, 0.78, 0.42)
const COL_RED := Color(1.0, 0.36, 0.48)
const COL_VIOLET := Color(0.72, 0.58, 1.0)

var rng := RandomNumberGenerator.new()
var mode := "intro"
var player := {
	"pos": Vector2(0, 5.9),
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

var world_root: Node3D
var enemy_root: Node3D
var bullet_root: Node3D
var core_root: Node3D
var fx_root: Node3D
var camera: Camera3D
var player_model: Node3D
var gate_model: Node3D
var gate_rings: Array[Node3D] = []
var hud_label: Label
var status_label: Label
var overlay: ColorRect

var mat_cache := {}

func _ready() -> void:
	rng.randomize()
	_read_entry_state()
	_build_scene()
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

func _build_scene() -> void:
	world_root = Node3D.new()
	world_root.name = "World"
	add_child(world_root)
	enemy_root = Node3D.new()
	bullet_root = Node3D.new()
	core_root = Node3D.new()
	fx_root = Node3D.new()
	world_root.add_child(enemy_root)
	world_root.add_child(bullet_root)
	world_root.add_child(core_root)
	world_root.add_child(fx_root)

	var env := WorldEnvironment.new()
	var environment := Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = Color(0.015, 0.016, 0.025)
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color(0.25, 0.32, 0.42)
	environment.ambient_light_energy = 0.48
	environment.glow_enabled = true
	environment.glow_intensity = 0.42
	environment.glow_bloom = 0.18
	env.environment = environment
	add_child(env)

	camera = Camera3D.new()
	camera.name = "TacticalCamera"
	camera.fov = 48
	camera.position = Vector3(0, 15.0, 18.5)
	camera.look_at(Vector3(0, 0, 0), Vector3.UP)
	add_child(camera)

	var sun := DirectionalLight3D.new()
	sun.name = "ObliqueKeyLight"
	sun.light_energy = 1.8
	sun.rotation_degrees = Vector3(-48, 34, 0)
	add_child(sun)

	var cyan_light := OmniLight3D.new()
	cyan_light.name = "RiftCyan"
	cyan_light.light_color = COL_CYAN
	cyan_light.light_energy = 4.0
	cyan_light.omni_range = 18
	cyan_light.position = Vector3(-5, 5, -3)
	add_child(cyan_light)

	var gold_light := OmniLight3D.new()
	gold_light.name = "GateGold"
	gold_light.light_color = COL_GOLD
	gold_light.light_energy = 2.6
	gold_light.omni_range = 14
	gold_light.position = Vector3(6, 4, -7)
	add_child(gold_light)

	_build_arena()
	player_model = _make_player_model()
	world_root.add_child(player_model)
	gate_model = _make_gate_model()
	world_root.add_child(gate_model)
	_build_hud()

func _build_arena() -> void:
	var plane := MeshInstance3D.new()
	var mesh := PlaneMesh.new()
	mesh.size = ARENA
	plane.mesh = mesh
	plane.material_override = _mat("floor", Color(0.028, 0.032, 0.047), false, 0.0, 0.74)
	plane.name = "AxiomFloor"
	world_root.add_child(plane)

	for x in range(-16, 17, 2):
		var line := MeshInstance3D.new()
		var line_mesh := BoxMesh.new()
		line_mesh.size = Vector3(0.018, 0.012, ARENA.y)
		line.mesh = line_mesh
		line.position = Vector3(x, 0.012, 0)
		line.material_override = _mat("grid_cyan", Color(0.16, 0.55, 0.6, 0.22), true, 0.15, 0.1)
		world_root.add_child(line)
	for z in range(-9, 10, 2):
		var line := MeshInstance3D.new()
		var line_mesh := BoxMesh.new()
		line_mesh.size = Vector3(ARENA.x, 0.012, 0.018)
		line.mesh = line_mesh
		line.position = Vector3(0, 0.014, z)
		line.material_override = _mat("grid_violet", Color(0.32, 0.22, 0.56, 0.18), true, 0.08, 0.1)
		world_root.add_child(line)

	for i in range(120):
		var star := MeshInstance3D.new()
		star.mesh = SphereMesh.new()
		star.scale = Vector3.ONE * rng.randf_range(0.018, 0.055)
		star.position = Vector3(rng.randf_range(-22, 22), rng.randf_range(2.0, 11.0), rng.randf_range(-14, 10))
		var color := COL_CYAN.lerp(COL_GOLD if rng.randf() > 0.7 else COL_VIOLET, rng.randf() * 0.7)
		star.material_override = _mat("star_%d" % i, color, false, 1.2, 0.05)
		world_root.add_child(star)

func _build_hud() -> void:
	var canvas := CanvasLayer.new()
	add_child(canvas)
	overlay = ColorRect.new()
	overlay.color = Color(0.01, 0.012, 0.018, 0.0)
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	canvas.add_child(overlay)
	hud_label = Label.new()
	hud_label.position = Vector2(18, 16)
	hud_label.size = Vector2(430, 190)
	hud_label.add_theme_font_size_override("font_size", 17)
	hud_label.add_theme_color_override("font_color", COL_TEXT)
	canvas.add_child(hud_label)
	status_label = Label.new()
	status_label.position = Vector2(360, 655)
	status_label.size = Vector2(620, 46)
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	status_label.add_theme_font_size_override("font_size", 17)
	status_label.add_theme_color_override("font_color", COL_GOLD)
	canvas.add_child(status_label)

func _mat(key: String, color: Color, transparent := false, emission := 0.0, roughness := 0.42) -> StandardMaterial3D:
	if mat_cache.has(key):
		return mat_cache[key]
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.roughness = roughness
	mat.metallic = 0.18
	if transparent or color.a < 1.0:
		mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		mat.albedo_color.a = color.a
	if emission > 0.0:
		mat.emission_enabled = true
		mat.emission = Color(color.r, color.g, color.b)
		mat.emission_energy_multiplier = emission
	mat_cache[key] = mat
	return mat

func _make_part(mesh: Mesh, material: Material, pos: Vector3, scale := Vector3.ONE, rot := Vector3.ZERO) -> MeshInstance3D:
	var part := MeshInstance3D.new()
	part.mesh = mesh
	part.material_override = material
	part.position = pos
	part.scale = scale
	part.rotation = rot
	return part

func _make_player_model() -> Node3D:
	var root := Node3D.new()
	root.name = "CartographerShip"
	var body := BoxMesh.new()
	body.size = Vector3(0.55, 0.22, 1.12)
	root.add_child(_make_part(body, _mat("ship_body", COL_TEXT, false, 0.16, 0.28), Vector3(0, 0.35, 0)))
	var nose := CylinderMesh.new()
	nose.top_radius = 0.02
	nose.bottom_radius = 0.28
	nose.height = 0.68
	root.add_child(_make_part(nose, _mat("ship_nose", COL_CYAN, false, 0.9, 0.24), Vector3(0, 0.37, -0.68), Vector3.ONE, Vector3(PI * 0.5, 0, 0)))
	var wing := BoxMesh.new()
	wing.size = Vector3(1.35, 0.08, 0.34)
	root.add_child(_make_part(wing, _mat("ship_wings", COL_RED, false, 0.55, 0.34), Vector3(0, 0.25, 0.34)))
	var core := SphereMesh.new()
	root.add_child(_make_part(core, _mat("ship_core", COL_GOLD, false, 1.4, 0.18), Vector3(0, 0.52, -0.06), Vector3.ONE * 0.18))
	return root

func _make_gate_model() -> Node3D:
	var root := Node3D.new()
	root.name = "AxiomGate"
	root.position = Vector3(0, 0.55, -7.0)
	for i in range(3):
		var ring := MeshInstance3D.new()
		var torus := TorusMesh.new()
		torus.inner_radius = 0.038
		torus.outer_radius = 1.25 + i * 0.43
		ring.mesh = torus
		ring.rotation_degrees = Vector3(90, 0, 0)
		ring.material_override = _mat("gate_ring_%d" % i, COL_CYAN.lerp(COL_VIOLET, i * 0.36), true, 1.2, 0.2)
		root.add_child(ring)
		gate_rings.append(ring)
	var core := MeshInstance3D.new()
	core.mesh = SphereMesh.new()
	core.scale = Vector3.ONE * 0.42
	core.material_override = _mat("gate_core", COL_GOLD, true, 1.7, 0.18)
	root.add_child(core)
	return root

func _make_anchor_model(label: String, pos: Vector2) -> Node3D:
	var root := Node3D.new()
	root.name = "Anchor_%s" % label
	root.position = _to_world(pos, 0.28)
	var plinth := MeshInstance3D.new()
	plinth.mesh = BoxMesh.new()
	plinth.scale = Vector3(0.62, 0.13, 0.62)
	plinth.material_override = _mat("anchor_plinth", Color(0.16, 0.18, 0.23), false, 0.05, 0.33)
	root.add_child(plinth)
	var ring := MeshInstance3D.new()
	var torus := TorusMesh.new()
	torus.inner_radius = 0.025
	torus.outer_radius = 0.66
	ring.mesh = torus
	ring.rotation_degrees = Vector3(90, 0, 0)
	ring.material_override = _mat("anchor_ring", COL_CYAN, true, 1.0, 0.18)
	root.add_child(ring)
	var needle := MeshInstance3D.new()
	var needle_mesh := CylinderMesh.new()
	needle_mesh.top_radius = 0.04
	needle_mesh.bottom_radius = 0.12
	needle_mesh.height = 1.1
	needle.mesh = needle_mesh
	needle.position = Vector3(0, 0.55, 0)
	needle.material_override = _mat("anchor_needle", COL_GOLD, false, 0.7, 0.22)
	root.add_child(needle)
	return root

func _reset_run() -> void:
	_clear_dynamic()
	player.pos = Vector2(0, 5.9)
	player.vel = Vector2.ZERO
	player.hp = 100.0
	player.energy = 100.0
	player.heat = 0.0
	player.invuln = 1.3
	player.blink = 0.0
	player.pulse = 28.0
	player.scan = 0.0
	score = carried_score
	wave = 1
	stability = 0.0
	scanned = 0
	core_count = 0
	spawn_timer = 0.45
	shot_timer = 0.0
	time_alive = 0.0
	gate_charge = 0.0
	anchors.clear()
	var data := [
		{ "pos": Vector2(-11.3, -4.7), "need": 18.0, "label": "N-01" },
		{ "pos": Vector2(-2.6, -6.0), "need": 34.0, "label": "K-17" },
		{ "pos": Vector2(9.1, -4.2), "need": 52.0, "label": "V-08" },
		{ "pos": Vector2(3.4, 0.8), "need": 72.0, "label": "A-00" }
	]
	for item in data:
		var model := _make_anchor_model(item.label, item.pos)
		world_root.add_child(model)
		anchors.append({ "pos": item.pos, "need": item.need, "scan": 0.0, "open": false, "label": item.label, "node": model })
	_set_status("YAKINDAKI ANKRAJLARA GIR VE TARAMA HALKASININ ICINDE KAL.", 4.0)
	_update_models(0.0)

func _clear_dynamic() -> void:
	for entry in enemies:
		_safe_free(entry.node)
	for entry in bullets:
		_safe_free(entry.node)
	for entry in cores:
		_safe_free(entry.node)
	for entry in particles:
		_safe_free(entry.node)
	for anchor in anchors:
		_safe_free(anchor.node)
	enemies.clear()
	bullets.clear()
	cores.clear()
	particles.clear()

func _safe_free(node: Node) -> void:
	if is_instance_valid(node):
		node.queue_free()

func _process(delta: float) -> void:
	time_alive += delta
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
	_update_models(delta)
	_update_hud()

func _set_status(text: String, seconds: float) -> void:
	status = text
	status_timer = seconds

func _enemy_limit() -> int:
	return min(18, 7 + wave * 2)

func _next_anchor_text() -> String:
	for anchor in anchors:
		if not anchor.open:
			return "%s %02d%%" % [anchor.label, int(anchor.scan)]
	return "KAPI ACIK"

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
		shot_timer = 0.074 if focused else max(0.12, 0.19 - stability * 0.0018)
		_fire_player(focused)
	if spawn_timer <= 0.0:
		spawn_timer = max(0.21, 0.95 - wave * 0.052 - stability * 0.003)
		if enemies.size() < _enemy_limit():
			_spawn_enemy()
			if wave >= 4 and enemies.size() < _enemy_limit() and rng.randf() < 0.16:
				_spawn_enemy()

	_update_anchors(delta)
	_update_bullets(delta)
	_update_enemies(delta)
	_update_cores(delta)
	_update_particles(delta)

	if Input.is_action_just_pressed("pulse") and player.pulse >= 100.0:
		_use_pulse()
	elif Input.is_action_just_pressed("pulse"):
		_set_status("PULSE HENUZ DOLMADI: %d%%" % int(player.pulse), 0.9)
	if Input.is_action_just_pressed("restart"):
		_reset_run()
	if player.hp <= 0.0:
		_finish_run(false)

func _move_player(delta: float) -> void:
	var input := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	if Input.is_action_just_pressed("dash") and player.blink <= 0.0 and player.energy >= 28.0 and input.length() > 0.1:
		player.vel = input.normalized() * 18.0
		player.energy -= 28.0
		player.blink = 0.62
		player.invuln = max(player.invuln, 0.38)
		_burst(player.pos, COL_TEXT, 28, 8.0)
	elif Input.is_action_just_pressed("dash") and player.energy < 28.0:
		_set_status("BLINK ICIN ENERJI GEREKIYOR: %d%%" % int(player.energy), 0.9)
	else:
		var speed := 5.4 + stability * 0.025
		player.vel = player.vel.move_toward(input.normalized() * speed, 52.0 * delta)
	player.pos += player.vel * delta
	player.pos.x = clamp(player.pos.x, -ARENA.x * 0.5 + 0.9, ARENA.x * 0.5 - 0.9)
	player.pos.y = clamp(player.pos.y, -ARENA.y * 0.5 + 0.9, ARENA.y * 0.5 - 0.9)

func _fire_player(focused: bool) -> void:
	if player.heat > 92.0:
		if status_timer <= 0.15:
			_set_status("SILAH ISISI KRITIK. ATES HATTI SOGUYOR.", 0.7)
		return
	var target := _aim_on_plane()
	var dir := (target - player.pos).normalized()
	var shots := 2 if focused and stability >= 38.0 else 1
	player.heat = clamp(player.heat + (4.4 if focused else 2.15), 0.0, 100.0)
	for i in range(shots):
		var turn := (float(i) - float(shots - 1) * 0.5) * (0.045 if focused else 0.018)
		var out := dir.rotated(turn)
		var node := _make_bullet_model(focused, true)
		bullet_root.add_child(node)
		bullets.append({
			"pos": player.pos + out * 0.72,
			"vel": out * (18.0 if focused else 14.0),
			"friendly": true,
			"life": 0.76 if focused else 0.94,
			"damage": 2 + int(stability / 34.0) if focused else 1 + int(stability / 48.0),
			"radius": 0.15 if focused else 0.13,
			"node": node
		})

func _make_bullet_model(focused: bool, friendly: bool) -> Node3D:
	var node := MeshInstance3D.new()
	node.mesh = SphereMesh.new()
	node.scale = Vector3.ONE * (0.18 if focused else 0.13)
	var color := COL_GOLD if focused else COL_CYAN
	if not friendly:
		color = COL_RED
	node.material_override = _mat("bullet_%s_%s" % [str(focused), str(friendly)], color, false, 1.8, 0.18)
	return node

func _spawn_enemy() -> void:
	var side := rng.randi_range(0, 3)
	var pos := Vector2(rng.randf_range(-ARENA.x * 0.45, ARENA.x * 0.45), -ARENA.y * 0.5 - 1.1)
	if side == 1:
		pos = Vector2(ARENA.x * 0.5 + 1.1, rng.randf_range(-ARENA.y * 0.35, ARENA.y * 0.42))
	elif side == 2:
		pos = Vector2(rng.randf_range(-ARENA.x * 0.45, ARENA.x * 0.45), ARENA.y * 0.5 + 1.1)
	elif side == 3:
		pos = Vector2(-ARENA.x * 0.5 - 1.1, rng.randf_range(-ARENA.y * 0.35, ARENA.y * 0.42))
	var roll := rng.randf()
	var enemy_type := "seeker"
	if wave >= 4 and roll < 0.14:
		enemy_type = "warden"
	elif wave >= 3 and roll < 0.32:
		enemy_type = "mine"
	elif wave >= 2 and roll < 0.62:
		enemy_type = "lancer"
	var hp := 3 + wave
	var speed := 1.95
	var radius := 0.46
	if enemy_type == "lancer":
		hp = 4 + wave
		speed = 1.48
		radius = 0.52
	elif enemy_type == "mine":
		hp = 2 + int(ceil(wave * 0.6))
		speed = 1.18
		radius = 0.42
	elif enemy_type == "warden":
		hp = 10 + wave * 2
		speed = 1.0
		radius = 0.72
	var node := _make_enemy_model(enemy_type)
	enemy_root.add_child(node)
	enemies.append({
		"type": enemy_type,
		"pos": pos,
		"vel": Vector2.ZERO,
		"hp": float(hp),
		"max_hp": float(hp),
		"speed": speed,
		"radius": radius,
		"fire": rng.randf_range(0.55, 1.75),
		"phase": rng.randf_range(0, TAU),
		"node": node
	})

func _make_enemy_model(enemy_type: String) -> Node3D:
	var root := Node3D.new()
	root.name = "Enemy_%s" % enemy_type
	var color := COL_RED
	if enemy_type == "lancer":
		color = COL_GOLD
	elif enemy_type == "mine":
		color = COL_VIOLET
	elif enemy_type == "warden":
		color = COL_GREEN
	var body := MeshInstance3D.new()
	body.mesh = SphereMesh.new()
	body.scale = Vector3(0.48, 0.32, 0.48)
	body.material_override = _mat("enemy_%s_body" % enemy_type, color, false, 0.8, 0.28)
	root.add_child(body)
	if enemy_type == "lancer":
		var spear := BoxMesh.new()
		spear.size = Vector3(0.16, 0.12, 1.18)
		root.add_child(_make_part(spear, _mat("lancer_spear", COL_GOLD, false, 1.0, 0.2), Vector3(0, 0.1, -0.42)))
	elif enemy_type == "mine":
		for i in range(6):
			var spike := CylinderMesh.new()
			spike.top_radius = 0.01
			spike.bottom_radius = 0.06
			spike.height = 0.52
			var part := _make_part(spike, _mat("mine_spikes", COL_VIOLET, false, 1.0, 0.22), Vector3.ZERO, Vector3.ONE, Vector3(PI * 0.5, i * TAU / 6.0, 0))
			part.position = Vector3(cos(i * TAU / 6.0) * 0.34, 0, sin(i * TAU / 6.0) * 0.34)
			root.add_child(part)
	elif enemy_type == "warden":
		var halo := TorusMesh.new()
		halo.inner_radius = 0.035
		halo.outer_radius = 0.62
		root.add_child(_make_part(halo, _mat("warden_halo", COL_GREEN, true, 1.2, 0.16), Vector3(0, 0.08, 0), Vector3.ONE, Vector3(PI * 0.5, 0, 0)))
	var eye := MeshInstance3D.new()
	eye.mesh = SphereMesh.new()
	eye.scale = Vector3.ONE * 0.11
	eye.position = Vector3(0, 0.1, -0.45)
	eye.material_override = _mat("enemy_eye_%s" % enemy_type, COL_BG, false, 0.0, 0.3)
	root.add_child(eye)
	return root

func _update_anchors(delta: float) -> void:
	var near_anchor := false
	for anchor in anchors:
		var distance := anchor.pos.distance_to(player.pos)
		if not anchor.open and distance < 2.7:
			near_anchor = true
			var pressure := 0
			for enemy in enemies:
				if enemy.pos.distance_to(anchor.pos) < 3.1:
					pressure += 1
			var rate := 6.0 if pressure > 0 else 18.0 + core_count * 0.06
			anchor.scan = clamp(anchor.scan + delta * rate, 0.0, 100.0)
			player.scan = anchor.scan
			if anchor.scan >= 100.0:
				anchor.open = true
				scanned += 1
				wave += 1
				stability = clamp(max(stability, anchor.need) + 6.0, 0.0, 100.0)
				if scanned >= anchors.size():
					stability = 100.0
				score += 800 + wave * 140
				high_score = max(high_score, score)
				_burst(anchor.pos, COL_CYAN, 44, 8.0)
				var next_text := "AXIOM KAPISI ACILIYOR." if scanned >= anchors.size() else "SIRADAKI ANKRAJA ILERLE."
				_set_status("%s ANKRAJI TARANDI. %s" % [anchor.label, next_text], 2.6)
			elif pressure > 0 and status_timer <= 0.0:
				_set_status("%s BASKI ALTINDA. TARAMAYI HIZLANDIRMAK ICIN ALANI TEMIZLE." % anchor.label, 1.2)
		elif not anchor.open and distance < 3.35 and status_timer <= 0.0:
			_set_status("%s ANKRAJINA BIRAZ DAHA YAKLAS." % anchor.label, 1.1)
	if not near_anchor:
		player.scan = max(0.0, player.scan - delta * 32.0)
	gate_charge = clamp((float(scanned) / float(anchors.size())) * 82.0 + stability * 0.18, 0.0, 100.0)
	if scanned >= anchors.size():
		_burst(Vector2(0, -7.0), COL_GREEN, 90, 11.0)
		_finish_run(true)

func _update_bullets(delta: float) -> void:
	for i in range(bullets.size() - 1, -1, -1):
		var b := bullets[i]
		b.pos += b.vel * delta
		b.life -= delta
		if b.life <= 0.0 or abs(b.pos.x) > ARENA.x * 0.5 + 2.0 or abs(b.pos.y) > ARENA.y * 0.5 + 2.0:
			_safe_free(b.node)
			bullets.remove_at(i)
			continue
		if b.friendly:
			for j in range(enemies.size() - 1, -1, -1):
				var e := enemies[j]
				if b.pos.distance_to(e.pos) < e.radius + b.radius:
					e.hp -= b.damage
					_burst(b.pos, COL_CYAN, 4, 3.2)
					_safe_free(b.node)
					bullets.remove_at(i)
					if e.hp <= 0.0:
						_kill_enemy(j)
					break
		elif player.invuln <= 0.0 and b.pos.distance_to(player.pos) < PLAYER_RADIUS + b.radius:
			_safe_free(b.node)
			bullets.remove_at(i)
			_hurt_player(b.damage)

func _update_enemies(delta: float) -> void:
	for i in range(enemies.size() - 1, -1, -1):
		var e := enemies[i]
		var to_player := (player.pos - e.pos).normalized()
		e.phase += delta * 3.8
		var desired := to_player * e.speed
		if e.type == "lancer":
			desired += Vector2(cos(e.phase) * 1.5, sin(e.phase * 0.8) * 0.82)
			e.fire -= delta
			if e.fire <= 0.0:
				e.fire = rng.randf_range(1.2, 2.0)
				_enemy_shot(e, 5.0 + wave * 0.16, 0.0)
		elif e.type == "mine":
			if e.pos.distance_to(player.pos) < 3.7:
				desired *= 1.8
		elif e.type == "warden":
			desired += Vector2(cos(e.phase * 0.7) * 1.0, sin(e.phase) * 1.0)
			e.fire -= delta
			if e.fire <= 0.0:
				e.fire = rng.randf_range(1.55, 2.15)
				_enemy_shot(e, 4.0, -0.18)
				_enemy_shot(e, 4.0, 0.18)
		e.vel = e.vel.move_toward(desired, 12.0 * delta)
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
	var node := _make_bullet_model(false, false)
	bullet_root.add_child(node)
	bullets.append({
		"pos": e.pos + dir * (e.radius + 0.22),
		"vel": dir * speed,
		"friendly": false,
		"life": 3.1,
		"damage": 16.0 if e.type == "warden" else 10.0,
		"radius": 0.19 if e.type == "warden" else 0.16,
		"node": node
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
	if e.type == "warden":
		particle_count = 34
	_burst(e.pos, _enemy_color(e.type), particle_count, 7.0)
	if drop or rng.randf() < 0.48:
		var amount := 1
		if e.type == "warden":
			amount = 3
		elif e.type == "lancer":
			amount = 2
		for k in range(amount):
			var node := _make_core_model()
			core_root.add_child(node)
			cores.append({
				"pos": e.pos + Vector2(rng.randf_range(-0.25, 0.25), rng.randf_range(-0.25, 0.25)),
				"vel": Vector2(rng.randf_range(-1.1, 1.1), rng.randf_range(-1.1, 1.1)),
				"life": 13.0,
				"value": 3 if e.type == "warden" else 1,
				"node": node
			})
	if e.type == "mine":
		for k in range(8):
			_enemy_shot(e, 4.1, float(k) / 8.0 * TAU)
	_safe_free(e.node)
	enemies.remove_at(index)

func _enemy_color(enemy_type: String) -> Color:
	if enemy_type == "lancer":
		return COL_GOLD
	if enemy_type == "mine":
		return COL_VIOLET
	if enemy_type == "warden":
		return COL_GREEN
	return COL_RED

func _make_core_model() -> Node3D:
	var root := Node3D.new()
	var gem := MeshInstance3D.new()
	gem.mesh = SphereMesh.new()
	gem.scale = Vector3(0.2, 0.34, 0.2)
	gem.material_override = _mat("core_gem", COL_GREEN, false, 1.55, 0.16)
	root.add_child(gem)
	var ring := TorusMesh.new()
	ring.inner_radius = 0.012
	ring.outer_radius = 0.28
	root.add_child(_make_part(ring, _mat("core_ring", COL_CYAN, true, 1.0, 0.18), Vector3.ZERO, Vector3.ONE, Vector3(PI * 0.5, 0, 0)))
	return root

func _hurt_player(amount: float) -> void:
	if player.invuln > 0.0:
		return
	player.hp = clamp(player.hp - amount, 0.0, 100.0)
	player.invuln = 0.72
	shake = max(shake, 0.35)
	_burst(player.pos, COL_RED, 24, 7.0)
	_set_status("GOVDE HASARI: %d. ENERJI KALKANI TOPLANIYOR." % int(amount), 1.4)

func _update_cores(delta: float) -> void:
	for i in range(cores.size() - 1, -1, -1):
		var c := cores[i]
		c.life -= delta
		var to_player := player.pos - c.pos
		if to_player.length() < 4.8:
			c.vel = c.vel.move_toward(to_player.normalized() * 6.6, 13.0 * delta)
		else:
			c.vel *= 0.982
		c.pos += c.vel * delta
		if c.life <= 0.0:
			_safe_free(c.node)
			cores.remove_at(i)
		elif c.pos.distance_to(player.pos) < PLAYER_RADIUS + CORE_RADIUS:
			_safe_free(c.node)
			cores.remove_at(i)
			var gain := 4.0 * c.value
			core_count += c.value
			stability = clamp(stability + gain, 0.0, 100.0)
			player.energy = clamp(player.energy + 14.0, 0.0, 100.0)
			player.pulse = clamp(player.pulse + 10.0, 0.0, 100.0)
			score += 70 * c.value
			high_score = max(high_score, score)
			_burst(player.pos, COL_GREEN, 9, 4.0)

func _update_particles(delta: float) -> void:
	for i in range(particles.size() - 1, -1, -1):
		var p := particles[i]
		p.pos += p.vel * delta
		p.vel *= 0.985
		p.life -= delta
		if p.life <= 0.0:
			_safe_free(p.node)
			particles.remove_at(i)

func _use_pulse() -> void:
	player.pulse = 0.0
	player.heat = clamp(player.heat - 34.0, 0.0, 100.0)
	shake = 0.42
	for i in range(enemies.size() - 1, -1, -1):
		enemies[i].hp -= 5.0 + wave
		enemies[i].vel += (enemies[i].pos - player.pos) * 1.8
		if enemies[i].hp <= 0.0:
			_kill_enemy(i)
	for i in range(bullets.size() - 1, -1, -1):
		if not bullets[i].friendly:
			_safe_free(bullets[i].node)
			bullets.remove_at(i)
	_burst(player.pos, Color(1, 1, 1), 72, 11.0)
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
		var node := MeshInstance3D.new()
		node.mesh = SphereMesh.new()
		node.scale = Vector3.ONE * rng.randf_range(0.04, 0.12)
		node.material_override = _mat("particle_%s" % str(color), color, true, 1.6, 0.2)
		fx_root.add_child(node)
		var a := rng.randf_range(0, TAU)
		var speed := rng.randf_range(0.5, max_speed)
		particles.append({
			"pos": pos,
			"vel": Vector2(cos(a), sin(a)) * speed,
			"life": rng.randf_range(0.25, 0.78),
			"node": node
		})

func _update_models(_delta: float) -> void:
	var target := _aim_on_plane()
	var look := (target - player.pos).normalized()
	player_model.position = _to_world(player.pos, 0.0)
	player_model.rotation.y = atan2(-look.x, -look.y)
	player_model.visible = not (player.invuln > 0.0 and int(time_alive * 20.0) % 2 == 0)
	camera.position = Vector3(sin(time_alive * 0.17) * 0.35, 15.0, 18.5) + Vector3(rng.randf_range(-shake, shake), 0, rng.randf_range(-shake, shake))
	camera.look_at(Vector3(player.pos.x * 0.16, 0, player.pos.y * 0.08), Vector3.UP)

	for i in range(gate_rings.size()):
		var ring := gate_rings[i]
		ring.rotation.z = time_alive * (0.18 + i * 0.07)
		ring.scale = Vector3.ONE * (0.75 + gate_charge / 100.0 * 0.34 + i * 0.05)
	gate_model.position = Vector3(0, 0.55 + sin(time_alive * 2.0) * 0.08, -7.0)

	for anchor in anchors:
		var node: Node3D = anchor.node
		node.position = _to_world(anchor.pos, 0.28 + sin(time_alive * 2.0 + anchor.pos.x) * 0.035)
		node.rotation.y += 0.012
		node.scale = Vector3.ONE * (1.0 + anchor.scan / 100.0 * 0.18)
		if anchor.open:
			node.scale = Vector3.ONE * 1.24

	for e in enemies:
		var node: Node3D = e.node
		node.position = _to_world(e.pos, 0.48 + sin(time_alive * 5.0 + e.phase) * 0.08)
		var dir := (player.pos - e.pos).normalized()
		node.rotation.y = atan2(-dir.x, -dir.y)
		node.scale = Vector3.ONE * (1.0 + (1.0 - e.hp / e.max_hp) * 0.16)
	for b in bullets:
		b.node.position = _to_world(b.pos, 0.55)
	for c in cores:
		c.node.position = _to_world(c.pos, 0.42 + sin(time_alive * 5.0 + c.pos.x) * 0.08)
		c.node.rotation.y += 0.05
	for p in particles:
		p.node.position = _to_world(p.pos, 0.52)
		p.node.scale *= 0.982

func _update_hud() -> void:
	var line1 := "UNIVERSE-3 / AXIOM RIFT 3D\n"
	var line2 := "SKOR %d   HIGH %d   DALGA %d\n" % [score, high_score, wave]
	var line3 := "GOVDE %02d%%   ENERJI %02d%%   ISI %02d%%\n" % [int(player.hp), int(player.energy), int(player.heat)]
	var line4 := "PULSE %02d%%   STABILITE %02d%%   ANKRAJ %d/%d   HEDEF %s   CEKIRDEK %d" % [int(player.pulse), int(stability), scanned, anchors.size(), _next_anchor_text(), core_count]
	hud_label.text = line1 + line2 + line3 + line4
	status_label.text = status if status_timer > 0.0 or mode == "over" else ""
	if mode == "intro":
		overlay.color = Color(0.01, 0.012, 0.018, 0.32)
		status_label.text = "SPACE / TIKLA: 3D AXIOM RIFT'E GIR"
	elif mode == "over":
		overlay.color = Color(0.01, 0.012, 0.018, 0.48)
	else:
		overlay.color = Color(0.01, 0.012, 0.018, 0.0)

func _aim_on_plane() -> Vector2:
	var mouse := get_viewport().get_mouse_position()
	var origin := camera.project_ray_origin(mouse)
	var normal := camera.project_ray_normal(mouse)
	if abs(normal.y) < 0.001:
		return player.pos + Vector2(0, -1)
	var t := -origin.y / normal.y
	var hit := origin + normal * t
	return Vector2(hit.x, hit.z)

func _to_world(pos: Vector2, y: float) -> Vector3:
	return Vector3(pos.x, y, pos.y)
