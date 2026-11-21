class_name Coach
extends Node
## Guided first run: one short task at a time, a pulsing ring on the button to press, and a one-line "why" for each.
## It watches the real game state, so it advances when you do the thing (by any route) and never blocks the hall.
## The Learning path (guide overlay) is the long-form curriculum this hands over to.
var app
var active := false
var idx := 0
var base_month := 0
var seen := {}                     # dock keys visited since the tutorial started
var card: PanelContainer
var ring: PanelContainer
var _tw: Tween
var forced := false        # started from the pause menu ("Restart tutorial"): shown even in Tycoon
var _tight := false        # the free part of the hall is small: the card folds to a pill
var _open := false         # the player tapped the pill open (until the step changes)
var _folded := false       # the player folded the card (stays folded until tapped)

## kind: "read" = press Got it · "visit" = open a drawer · "state" = a condition on the game
## target: "dock:<key>" | "next" | ""
const STEPS := [
	{"id": "hall", "kind": "read", "title": "This is your datacenter",
		"body": "Each block is a rack. The label says what hardware it is and who rents it; the dots on top show heat. Empty floor is room to grow. Drag to pan, right-drag to orbit, wheel to zoom, V flips the view.",
		"why": "You earn by renting GPU time to customers. Everything else exists to keep those GPUs busy, cool and powered."},
	{"id": "customers", "kind": "visit", "key": "contracts", "target": "dock:contracts", "title": "Find a customer",
		"body": "Open CUSTOMERS. Each offer shows what the customer needs (GPUs for training, tokens per second for inference) and whether you can serve it today.",
		"why": "No contract, no revenue. Customers decide what hardware is worth buying."},
	{"id": "easy", "kind": "state", "target": "dock:contracts", "title": "Take an offer the easy way",
		"body": "Pick an offer, open What you need to buy, and press EASY PATH. The game signs, orders, prepares the hall, deploys and assigns for you. If cash is short, try a smaller offer.",
		"why": "You will see what every part of the machine did on the next few steps."},
	{"id": "time", "kind": "state", "target": "next", "title": "Let time pass",
		"body": "Press NEXT MONTH (or Space, or the ▶▶ speeds). Hardware takes months to arrive: GPUs have the longest lead times.",
		"why": "Lead time is the central tension: you order for demand you can only guess at."},
	{"id": "supply", "kind": "visit", "key": "shop", "target": "dock:shop", "title": "Where did my hardware go?",
		"body": "Open SUPPLY. Your orders and arrival dates are here. The Roadmap tab lists hardware keynotes; announced parts can be pre-ordered before they ship.",
		"why": "Newer hardware is faster, hotter and pricier. Knowing what is coming decides what you buy now."},
	{"id": "facility", "kind": "visit", "key": "facility", "target": "dock:facility", "title": "Racks need power and cooling first",
		"body": "Open FACILITY. Transformers set how many kW you can draw, cooling units set how much heat you can remove. Every watt in becomes a watt of heat.",
		"why": "Power and cooling, not floor space, cap most AI halls. Tight cooling triples failure rates."},
	{"id": "online", "kind": "state", "target": "next", "title": "Wait for the first rack to go live",
		"body": "Keep pressing NEXT MONTH. New racks spend about two months in installation and burn-in. A few fail burn-in and need repair, which is why spares matter.",
		"why": "Commissioning finds dead GPUs and bad optics before customers do."},
	{"id": "revenue", "kind": "state", "target": "next", "title": "First revenue",
		"body": "Advance until the contract goes live. Revenue minus power, staff, depreciation and interest is your profit. Utilisation is everything.",
		"why": "A GPU that sits idle still costs money. Contracts keep them earning."},
	{"id": "path", "kind": "read", "title": "You have run the loop",
		"body": "That is the whole game: customer, hardware, power and cooling, time, revenue. Now go deeper. The Learning path has seven chapters, from power and cooling to networks, money and resilience. Each goal pays a cash reward.",
		"why": "Open it any time from How to play."},
]

func _ready() -> void:
	card = PanelContainer.new(); card.visible = false; card.set_anchors_preset(Control.PRESET_TOP_LEFT)
	card.mouse_filter = Control.MOUSE_FILTER_STOP
	card.add_theme_stylebox_override("panel", Kit.card_sb(Kit.CY, Kit.BG, 3, 14)); app.root.add_child(card)
	ring = PanelContainer.new(); ring.visible = false; ring.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var rs := StyleBoxFlat.new(); rs.bg_color = Color(0, 0, 0, 0); rs.border_color = Kit.AM; rs.set_border_width_all(4); rs.set_corner_radius_all(12); ring.add_theme_stylebox_override("panel", rs); app.root.add_child(ring)
	if not Settings.reduced_motion: _tw = create_tween().set_loops(); _tw.tween_property(ring, "modulate:a", 0.25, 0.55); _tw.tween_property(ring, "modulate:a", 1.0, 0.55)   # reduced motion: a steady ring

func start(at := 0, force := false) -> void:
	active = true; idx = at; seen = {}; base_month = int(app.b.g.month); forced = force; _open = false; _folded = false
	Settings.tutorial = "on"; Settings.tutorial_step = at; Settings.save_all()
	_advance_if_done(); _build()

func stop(done := true) -> void:
	active = false; card.visible = false; ring.visible = false
	if done: Settings.tutorial = "off"; Settings.save_all()

func visited(dock_key: String) -> void:
	if not active: return
	seen[dock_key] = true; tick()

func _done(s: Dictionary) -> bool:
	var g: Dictionary = app.b.g
	match s.id:
		"customers", "supply", "facility": return seen.has(s.key)
		"easy": return g.get("projects", []).size() > 0 or g.activeContracts.size() > 0
		"time": return int(g.month) >= base_month + 2
		"online":
			for h in g.halls:
				for r in h.racks:
					if r.status == "online": return true
			return false
		"revenue": return g.history.any(func(x): return x.revenue > 0)
	return false

func _advance_if_done() -> bool:
	var moved := false
	while idx < STEPS.size() and STEPS[idx].kind != "read" and _done(STEPS[idx]): idx += 1; moved = true
	return moved

## Called whenever the game changes or a drawer opens.
func tick() -> void:
	if not active: return
	if _advance_if_done(): app.audio.play("good"); _open = false
	_build()

## Tycoon is "no hand-holding": the tutorial stays out of it unless the player restarted it from the menu.
func _muted() -> bool:
	return not forced and str(app.b.g.get("mode", "operator")) == "tycoon"

func _next() -> void:
	idx += 1; app.audio.play("click"); _open = false
	if idx >= STEPS.size(): stop(); return
	_advance_if_done(); _build()

func _build() -> void:
	if active and Settings.tutorial_step != idx: Settings.tutorial_step = idx; Settings.save_all()   # so a later session resumes at this step
	for c in card.get_children(): card.remove_child(c); c.queue_free()   # removed now: a dying full card must not size the pill that replaces it
	if not active or idx >= STEPS.size() or _muted(): card.visible = false; ring.visible = false; return
	var s: Dictionary = STEPS[idx]
	card.visible = true
	if _folded or (_tight and not _open):   # a pill: one line, tap to open the card
		var pill := Kit.btn("TUTORIAL %d/%d · %s  ▴" % [idx + 1, STEPS.size(), str(s.title)], func(): _open = true; _folded = false; _build(), "", 14)
		pill.clip_text = true; pill.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS; pill.size_flags_vertical = Control.SIZE_SHRINK_BEGIN; pill.alignment = HORIZONTAL_ALIGNMENT_LEFT; pill.custom_minimum_size = Vector2(150, maxf(40.0, Layout.tap() * 0.85)); card.add_child(pill)
		_fit(); return
	var v := VBoxContainer.new(); v.add_theme_constant_override("separation", 7); card.add_child(v)
	var h := HBoxContainer.new(); h.add_theme_constant_override("separation", 8); v.add_child(h)
	h.add_child(Kit.chip("TUTORIAL  %d / %d" % [idx + 1, STEPS.size()], Kit.CY, 12))
	var sp := Control.new(); sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL; h.add_child(sp)
	var dots := ""; for i in STEPS.size(): dots += "●" if i <= idx else "○"
	h.add_child(Kit.label(dots, 11, Kit.CY))
	var fold := Kit.btn("▾", func(): _folded = true; _open = false; _build(), "", 14); fold.tooltip_text = "Fold the tutorial to a small pill"; fold.custom_minimum_size = Vector2(maxf(36.0, Layout.tap() * 0.8), maxf(30.0, Layout.tap() * 0.8)); h.add_child(fold)
	v.add_child(Kit.label(str(s.title), 20, Kit.TX, true))
	v.add_child(Kit.label(_adapt(str(s.body)), 14, Kit.DIM, true))
	v.add_child(Kit.label("Why: " + str(s.why), 13, Kit.AM, true))
	var f := HFlowContainer.new(); f.add_theme_constant_override("h_separation", 8); f.add_theme_constant_override("v_separation", 6); v.add_child(f)
	if s.kind == "read":
		if s.id == "path":
			f.add_child(Kit.btn("Open the Learning path", func(): _next(); app.guide.visible = true; app.guide.open(), "go", 15))
			f.add_child(Kit.btn("Close", func(): stop(), "", 14))
		else:
			var got := Kit.btn("Got it ▶", _next, "go", 15); f.add_child(got)
			if Kit.pad_mode: got.call_deferred("grab_focus")   # a controller can always dismiss the card
	else:
		f.add_child(Kit.label("Do it in the game; this advances by itself.", 13, Kit.DIM, true))
		f.add_child(Kit.btn("Skip", _next, "", 14))
		f.add_child(Kit.btn("Hide tutorial", func(): stop(), "", 14))
	_fit()

func _fit() -> void:
	card.size = Vector2(_width(), 0.0)
	_place()

## Left edge for floating cards: the free part of the hall (clear of the rail, the camera buttons and the open drawer).
func _left_edge() -> float:
	return app.free_hall_rect().position.x if app.is_inside_tree() else 16.0

## The card stays in the part of the hall that the open drawer leaves free; folded, it is a short pill.
func _width() -> float:
	if not app.is_inside_tree(): return 420.0
	var fw: float = app.free_hall_rect().size.x
	if card.get_child_count() > 0 and card.get_child(card.get_child_count() - 1) is Button: return clampf(fw, 150.0, 340.0)
	return clampf(fw, 220.0, 420.0)

## Bottom-left of the free hall area: never over a drawer, the dock, the Build placement bar or the rack inspector. (Toasts stack above it.)
func _place() -> void:
	if not app.is_inside_tree(): return
	var fr: Rect2 = app.free_hall_rect()
	var w := _width()
	var h := card.get_combined_minimum_size().y
	card.size = Vector2(w, h)
	card.position = Vector2(fr.position.x, maxf(fr.position.y, fr.end.y - h))

func _target(s: Dictionary) -> Control:
	var t := str(s.get("target", ""))
	if t == "next": return app.next_btn
	if t.begins_with("dock:"): return app.dock_btns.get(t.substr(5))
	return null

func _process(_dt: float) -> void:
	var full_page: bool = app.FULL.has(app.cur)   # Design Lab, Supercomputer and Codex use the whole screen: the card would sit on their content
	var live := active and idx < STEPS.size() and not _muted()
	if not live or app.modal() != null: ring.visible = false; card.visible = live and app.modal() == null and not full_page; return
	card.visible = not full_page
	var fr: Rect2 = app.free_hall_rect()
	var tight: bool = Layout.phone or fr.size.x < 300.0 or fr.size.y < 340.0   # phones, or little hall left beside the drawer (handhelds, Procure): fold to a pill
	if tight != _tight: _tight = tight; _build()
	_place()
	var tg := _target(STEPS[idx])
	if tg == null or not tg.is_visible_in_tree(): ring.visible = false; return
	var r := tg.get_global_rect().grow(6.0)
	ring.visible = true; ring.global_position = r.position; ring.size = r.size

## The steps are written for mouse and keyboard; say the same thing in the words of the device in use (touch, controller, phone dock names).
func _adapt(t: String) -> String:
	if Kit.pad_mode:
		t = t.replace("Drag to pan, right-drag to orbit, wheel to zoom, V flips the view.", "Left stick pans, right stick orbits, the triggers zoom, L3 flips the view.")
		t = t.replace("(or Space, or the ▶▶ speeds)", "(or Y)")
	elif Layout.touch:
		t = t.replace("Drag to pan, right-drag to orbit, wheel to zoom, V flips the view.", "Drag to pan, pinch to zoom, two fingers twist to orbit.")
		t = t.replace(" (or Space, or the ▶▶ speeds)", "")
		t = t.replace("Press NEXT MONTH", "Press NEXT").replace("pressing NEXT MONTH", "pressing NEXT")
	if Layout.phone:
		t = t.replace("Open CUSTOMERS", "Open CLIENTS").replace("Open FACILITY", "Open BUILD")
	return t
