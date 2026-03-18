import unreal

LEVEL_PATH = "/Game/Maps/KoydoLaunch"
TEMPLATE_PATH = "/Engine/Maps/Templates/OpenWorld"
PLAYER_START_Z = 220.0

level_editor = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
editor_asset_library = unreal.EditorAssetLibrary
editor_level_library = unreal.EditorLevelLibrary

if editor_asset_library.does_asset_exist(LEVEL_PATH):
    unreal.log("Deleting existing map so it can be recreated cleanly: {}".format(LEVEL_PATH))
    if not editor_asset_library.delete_asset(LEVEL_PATH):
        raise RuntimeError("Failed to delete existing map {}".format(LEVEL_PATH))

if not level_editor.new_level_from_template(LEVEL_PATH, TEMPLATE_PATH):
    raise RuntimeError("Failed to create level from template {} -> {}".format(TEMPLATE_PATH, LEVEL_PATH))

player_starts = [actor for actor in editor_level_library.get_all_level_actors() if actor.get_class().get_name() == 'PlayerStart']
for actor in player_starts[1:]:
    editor_level_library.destroy_actor(actor)

if player_starts:
    player_start = player_starts[0]
    player_start.set_actor_location(unreal.Vector(0.0, 0.0, PLAYER_START_Z), False, False)
    player_start.set_actor_rotation(unreal.Rotator(0.0, 0.0, 0.0), False)
else:
    player_start = editor_level_library.spawn_actor_from_class(unreal.PlayerStart, unreal.Vector(0.0, 0.0, PLAYER_START_Z), unreal.Rotator(0.0, 0.0, 0.0))

player_start.set_actor_label('KoydoPlayerStart')
player_start.set_editor_property('player_start_tag', unreal.Name('Loom'))

world = editor_level_library.get_editor_world()
world_settings = world.get_world_settings()
world_settings.set_editor_property('kill_z', -1000000.0)
world_settings.set_editor_property('b_enable_world_bounds_checks', False)

if not level_editor.save_current_level():
    raise RuntimeError("Failed to save {}".format(LEVEL_PATH))

unreal.log("Created {} from template {}".format(LEVEL_PATH, TEMPLATE_PATH))
