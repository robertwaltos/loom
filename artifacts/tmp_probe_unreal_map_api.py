import unreal
print(''EDITOR_LEVEL_LIBRARY_HAS_NEW_LEVEL'', hasattr(unreal.EditorLevelLibrary, ''new_level''))
print(''EDITOR_LEVEL_LIBRARY_HAS_LOAD_LEVEL'', hasattr(unreal.EditorLevelLibrary, ''load_level''))
print(''EDITOR_LOADING_HAS_NEW_BLANK_MAP'', hasattr(unreal.EditorLoadingAndSavingUtils, ''new_blank_map''))
print(''EDITOR_ASSET_LIBRARY_EXISTS'', hasattr(unreal, ''EditorAssetLibrary''))
