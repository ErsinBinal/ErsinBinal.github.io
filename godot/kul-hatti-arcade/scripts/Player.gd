extends Node2D
class_name Player
## Oyuncu — 8 yon hareket (yatay + derinlik bandi), 3'lu kombo yumruk,
## knockback, i-frame, can. Yer tutucu _draw() ile cizilir.

signal died
signal health_changed(hp: int, max_hp: int)

const SPEED := 135.0
const ATTACK_RANGE_X := 38.0
const ATTACK_RANGE_Y := 22.0

@export var max_hp := 100

var hp := 100
var facing := 1                 # 1 = saga, -1 = sola
var depth_min := 168.0          # Main tarafindan ayarlanir
var depth_max := 250.0
var attack_timer := 0.0         # >0 iken hareket kilitli (vurus animasyonu)
var combo_index := 0            # 1..3
var combo_window := 0.0         # ardisik vurus penceresi
var iframe := 0.0
var hurt_flash := 0.0
var walk_anim := 0.0
var knockback := Vector2.ZERO
var dead := false

func _ready() -> void:
	add_to_group("player")
	hp = max_hp
	health_changed.emit(hp, max_hp)

func _process(delta: float) -> void:
	if dead:
		return

	iframe = maxf(0.0, iframe - delta)
	hurt_flash = maxf(0.0, hurt_flash - delta)
	attack_timer = maxf(0.0, attack_timer - delta)
	combo_window = maxf(0.0, combo_window - delta)
	if combo_window <= 0.0:
		combo_index = 0

	# knockback
	if knockback.length() > 1.0:
		position += knockback * delta
		knockback = knockback.lerp(Vector2.ZERO, delta * 8.0)

	# hareket (vurus sirasinda kilitli)
	if attack_timer <= 0.0:
		var move := Vector2.ZERO
		if Input.is_physical_key_pressed(KEY_LEFT) or Input.is_physical_key_pressed(KEY_A):
			move.x -= 1.0
		if Input.is_physical_key_pressed(KEY_RIGHT) or Input.is_physical_key_pressed(KEY_D):
			move.x += 1.0
		if Input.is_physical_key_pressed(KEY_UP) or Input.is_physical_key_pressed(KEY_W):
			move.y -= 1.0
		if Input.is_physical_key_pressed(KEY_DOWN) or Input.is_physical_key_pressed(KEY_S):
			move.y += 1.0
		if move != Vector2.ZERO:
			move = move.normalized()
			position += move * SPEED * delta
			if move.x != 0.0:
				facing = 1 if move.x > 0.0 else -1
			walk_anim += delta * 9.0

	position.y = clampf(position.y, depth_min, depth_max)
	queue_redraw()

func _unhandled_input(event: InputEvent) -> void:
	if dead:
		return
	if event is InputEventKey and event.pressed and not event.echo:
		var kc := (event as InputEventKey).physical_keycode
		if kc == KEY_J or kc == KEY_Z:
			attack()

func attack() -> void:
	if attack_timer > 0.0:
		return
	combo_index = (combo_index % 3) + 1
	combo_window = 0.6
	attack_timer = 0.26
	var heavy := combo_index == 3
	var dmg := 16 if heavy else 8
	for e in get_tree().get_nodes_in_group("enemy"):
		if not is_instance_valid(e):
			continue
		var dx: float = e.global_position.x - global_position.x
		var dy: float = e.global_position.y - global_position.y
		if signf(dx) == float(facing) and absf(dx) < ATTACK_RANGE_X and absf(dy) < ATTACK_RANGE_Y:
			if e.has_method("take_hit"):
				e.take_hit(dmg, facing, heavy)

func take_hit(dmg: int, dir: int, _heavy: bool) -> void:
	if dead or iframe > 0.0:
		return
	hp -= dmg
	iframe = 0.7
	hurt_flash = 0.25
	knockback = Vector2(float(dir) * 110.0, 0.0)
	health_changed.emit(hp, max_hp)
	if hp <= 0:
		dead = true
		died.emit()

func _draw() -> void:
	# ayak golgesi
	draw_circle(Vector2(0, -2), 8.0, Color(0, 0, 0, 0.35))

	var body_col := Color(0.78, 0.86, 1.0)
	if hurt_flash > 0.0:
		body_col = Color(1, 1, 1)

	# yuruyus salinimi (hafif)
	var bob := 0.0
	if attack_timer <= 0.0:
		bob = sin(walk_anim) * 1.5

	# govde (ayak origin'de, yukari dogru)
	draw_rect(Rect2(-7, -30 + bob, 14, 26), body_col)
	# kafa
	draw_rect(Rect2(-6, -34 + bob, 12, 6), Color(0.6, 0.7, 0.9))
	# visor (yon)
	var vx := 0.0 if facing > 0 else -4.0
	draw_rect(Rect2(vx, -32 + bob, 4, 2), Color(0.3, 0.85, 1.0))

	# yumruk (vurus aninda)
	if attack_timer > 0.10:
		var ax := 7.0 if facing > 0 else -19.0
		draw_rect(Rect2(ax, -22 + bob, 12, 4), Color(1.0, 0.8, 0.35))
