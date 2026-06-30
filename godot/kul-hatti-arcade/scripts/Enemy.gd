extends Node2D
class_name Enemy
## Basit takip eden dusman — oyuncuya yaklasir, menzile girince temas hasari verir.
## take_hit ile hasar alir, knockback + hurt-stun, oluce fade->queue_free.

@export var max_hp := 24
@export var speed := 46.0
@export var contact_damage := 6
@export var touch_range := 26.0

var hp := 24
var facing := -1
var depth_min := 168.0
var depth_max := 250.0
var attack_cd := 0.0
var hurt := 0.0
var knockback := Vector2.ZERO
var dead := false

func _ready() -> void:
	add_to_group("enemy")
	hp = max_hp

func _process(delta: float) -> void:
	if dead:
		return

	hurt = maxf(0.0, hurt - delta)
	attack_cd = maxf(0.0, attack_cd - delta)

	var players := get_tree().get_nodes_in_group("player")
	if not players.is_empty():
		var p = players[0]
		var to: Vector2 = p.global_position - global_position
		if to.x != 0.0:
			facing = 1 if to.x > 0.0 else -1

		if knockback.length() > 1.0:
			position += knockback * delta
			knockback = knockback.lerp(Vector2.ZERO, delta * 6.0)
		elif hurt <= 0.0:
			if to.length() > touch_range:
				position += to.normalized() * speed * delta
			elif attack_cd <= 0.0:
				attack_cd = 1.0
				if p.has_method("take_hit"):
					p.take_hit(contact_damage, facing, false)

	position.y = clampf(position.y, depth_min, depth_max)
	queue_redraw()

func take_hit(dmg: int, dir: int, heavy: bool) -> void:
	if dead:
		return
	hp -= dmg
	hurt = 0.25
	knockback = Vector2(float(dir) * (160.0 if heavy else 95.0), 0.0)
	if hp <= 0:
		die()

func die() -> void:
	if dead:
		return
	dead = true
	remove_from_group("enemy")
	var t := create_tween()
	t.tween_property(self, "modulate:a", 0.0, 0.4)
	t.tween_callback(queue_free)

func _draw() -> void:
	draw_circle(Vector2(0, -2), 8.0, Color(0, 0, 0, 0.35))

	var body_col := Color(0.82, 0.4, 0.46)
	if hurt > 0.0:
		body_col = Color(1, 1, 1)

	draw_rect(Rect2(-7, -28, 14, 24), body_col)
	draw_rect(Rect2(-6, -32, 12, 6), Color(0.5, 0.3, 0.34))
	# kirmizi goz (yon)
	var ex := 1.0 if facing > 0 else -3.0
	draw_rect(Rect2(ex, -27, 2, 2), Color(1.0, 0.35, 0.35))
