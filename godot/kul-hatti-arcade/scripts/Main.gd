extends Node2D
## Dunya kurulumu: zemin cizimi, kamera takibi, HUD, dusman spawn'i, oyun akisi.
## M0 dikey dilim — yer tutucu primitiflerle oynanabilir beat 'em up cekirdegi.

const LEVEL_WIDTH := 2400.0
const GROUND_TOP := 168.0
const GROUND_BOTTOM := 250.0
const VIEW_HALF := 240.0   # 480 / 2

var player: Player
var camera: Camera2D
var hud: Label
var game_over := false

func _ready() -> void:
	# oyuncu
	player = Player.new()
	player.position = Vector2(90, 220)
	player.depth_min = GROUND_TOP
	player.depth_max = GROUND_BOTTOM
	player.died.connect(_on_player_died)
	add_child(player)

	# dusmanlar (sahne boyunca dagilmis)
	for i in range(6):
		_spawn_enemy(440.0 + float(i) * 320.0 + randf_range(-60.0, 60.0))

	# kamera (x'te takip, y sabit)
	camera = Camera2D.new()
	camera.position = Vector2(VIEW_HALF, 135.0)
	camera.limit_left = 0
	camera.limit_top = 0
	camera.limit_right = int(LEVEL_WIDTH)
	camera.limit_bottom = 270
	add_child(camera)
	camera.make_current()

	# HUD
	var layer := CanvasLayer.new()
	add_child(layer)
	hud = Label.new()
	hud.position = Vector2(8, 6)
	hud.add_theme_color_override("font_color", Color(0.85, 0.95, 1.0))
	layer.add_child(hud)

func _spawn_enemy(x: float) -> void:
	var e := Enemy.new()
	e.position = Vector2(x, randf_range(GROUND_TOP, GROUND_BOTTOM))
	e.depth_min = GROUND_TOP
	e.depth_max = GROUND_BOTTOM
	add_child(e)

func _process(_delta: float) -> void:
	if camera and player and not game_over:
		camera.position.x = clampf(player.position.x, VIEW_HALF, LEVEL_WIDTH - VIEW_HALF)
		camera.position.y = 135.0

	var alive := get_tree().get_nodes_in_group("enemy").size()
	if hud and not game_over:
		var php := player.hp if player else 0
		hud.text = "HP %d    DUSMAN %d\nWASD/Ok: hareket   J/Z: yumruk (kombo)" % [php, alive]

	if game_over and Input.is_physical_key_pressed(KEY_R):
		get_tree().reload_current_scene()

	queue_redraw()

func _on_player_died() -> void:
	game_over = true
	if hud:
		hud.text = "SINYAL KESILDI\nR ile yeniden basla"

func _draw() -> void:
	# zemin bandi
	draw_rect(Rect2(0, GROUND_TOP - 12, LEVEL_WIDTH, 270), Color(0.06, 0.07, 0.10))
	draw_rect(Rect2(0, GROUND_TOP, LEVEL_WIDTH, 4), Color(0.13, 0.15, 0.22))
	# arka panel sutunlari (derinlik hissi)
	var cols := int(LEVEL_WIDTH / 80.0)
	for i in range(cols):
		var x := float(i) * 80.0
		draw_rect(Rect2(x + 12, 64, 3, 96), Color(0.10, 0.12, 0.18))
		draw_rect(Rect2(x, 150, 64, 2), Color(0.09, 0.11, 0.16))
	# zemin cizgileri
	for i in range(cols * 2):
		var gx := float(i) * 40.0
		draw_rect(Rect2(gx, GROUND_BOTTOM + 6, 22, 2), Color(0.12, 0.14, 0.2))
