// Copyright Koydo. All Rights Reserved.
// BridgeLoomCrossReality.h — Shared-world sessions for VR + flat-screen players.
//
// A single Loom world instance can host VR headset players and desktop/mobile
// flat-screen players simultaneously. This component manages:
//   - Session type flags so the matchmaker routes mixed-input players correctly
//   - Per-player view mode (VR stereo / flat perspective)
//   - Input hint translation: VR hand ray → cursor equivalent for UI
//   - Proximity voice group assignments so XR players hear appropriately
//
// Attach to the GameMode or a World Manager actor.
// Actor tags: LoomXRSession

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomCrossReality.generated.h"

// ─── Enumerations ──────────────────────────────────────────────────

/** How this player is currently experiencing the world. */
UENUM(BlueprintType)
enum class ELoomViewMode : uint8
{
    Flat      UMETA(DisplayName = "Flat Screen (Desktop / Mobile)"),
    VRStereo  UMETA(DisplayName = "VR Stereo (Head-Mounted)"),
    SpectatorOrbital UMETA(DisplayName = "Spectator Orbital Camera"),
    ARPassthrough   UMETA(DisplayName = "AR Passthrough"),
};

/** Cross-reality session policy. */
UENUM(BlueprintType)
enum class ELoomXRPolicy : uint8
{
    /** All view modes allowed in the same session (default). */
    Mixed   UMETA(DisplayName = "Mixed — all view modes"),
    /** Only VR players can join. */
    VROnly  UMETA(DisplayName = "VR Only"),
    /** Only flat-screen players can join. */
    FlatOnly UMETA(DisplayName = "Flat Only"),
};

// ─── Structs ───────────────────────────────────────────────────────

/** Registered per-player cross-reality info. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomXRPlayerInfo
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    FString PlayerId;

    UPROPERTY(BlueprintReadOnly)
    ELoomViewMode ViewMode = ELoomViewMode::Flat;

    /**
     * World-space ray origin of the dominant hand pointer (VR) or mouse ray
     * projected into world space (flat).  Updated every tick by ReportPointerRay.
     */
    UPROPERTY(BlueprintReadOnly)
    FVector PointerOrigin = FVector::ZeroVector;

    UPROPERTY(BlueprintReadOnly)
    FVector PointerDirection = FVector::ForwardVector;

    UPROPERTY(BlueprintReadOnly)
    bool bPointerActive = false;

    /** Whether voice is spatialised relative to world position. */
    UPROPERTY(BlueprintReadOnly)
    bool bSpatialVoice = true;
};

/** Session-level cross-reality state. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomXRSessionInfo
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    ELoomXRPolicy Policy = ELoomXRPolicy::Mixed;

    UPROPERTY(BlueprintReadOnly)
    int32 FlatPlayerCount = 0;

    UPROPERTY(BlueprintReadOnly)
    int32 VRPlayerCount = 0;

    UPROPERTY(BlueprintReadOnly)
    bool bCrossRealityActive = false;
};

// ─── Component ────────────────────────────────────────────────────

/**
 * UBridgeLoomCrossReality — ActorComponent managing mixed-reality sessions.
 *
 *  - RegisterPlayer / UnregisterPlayer track each player's view mode
 *  - SetSessionPolicy controls matchmaking gate (Mixed / VR-only / Flat-only)
 *  - ReportPointerRay uploads per-frame dominant-hand or mouse ray
 *  - GetPlayersOfMode returns filtered lists for zone or voice logic
 *
 * Design notes:
 *  - VR players have collision shapes treated as full-body (capsule ~1.75 m)
 *  - Flat players have standard third-person capsule
 *  - No gameplay asymmetry by default; VR hand UI interaction is routed through
 *    the same InputAction pipeline as mouse clicks via UBridgeLoomInputComponent
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Loom Cross-Reality")
class BRIDGELOOM_API UBridgeLoomCrossReality : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomCrossReality();

    // ── Configuration ─────────────────────────────────────────────

    /** Session XR policy.  Can be changed at runtime before match starts. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "CrossReality|Config")
    ELoomXRPolicy SessionPolicy = ELoomXRPolicy::Mixed;

    /** Maximum VR players per session (0 = unlimited). */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "CrossReality|Config",
              meta = (ClampMin = "0", ClampMax = "64"))
    int32 MaxVRPlayers = 8;

    /** Whether VR and flat players see each other's pointer beams. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "CrossReality|Config")
    bool bShowCrossRealityPointers = true;

    // ── Player Registration ────────────────────────────────────────

    /**
     * Register a player and their initial view mode.
     * Returns false if the session policy blocks the player's view mode.
     */
    UFUNCTION(BlueprintCallable, Category = "CrossReality")
    bool RegisterPlayer(const FString& PlayerId, ELoomViewMode ViewMode);

    /** Unregister a player (called on disconnect). */
    UFUNCTION(BlueprintCallable, Category = "CrossReality")
    void UnregisterPlayer(const FString& PlayerId);

    /** Update a registered player's view mode (e.g. player puts on headset mid-session). */
    UFUNCTION(BlueprintCallable, Category = "CrossReality")
    void SetPlayerViewMode(const FString& PlayerId, ELoomViewMode NewMode);

    // ── Pointer Tracking ──────────────────────────────────────────

    /** Called every tick from the player's input handler with current pointer ray. */
    UFUNCTION(BlueprintCallable, Category = "CrossReality")
    void ReportPointerRay(const FString& PlayerId,
                          const FVector& Origin, const FVector& Direction,
                          bool bActive);

    /** Get world-space pointer ray for a given player (for UI hit-test etc.). */
    UFUNCTION(BlueprintPure, Category = "CrossReality")
    bool GetPointerRay(const FString& PlayerId,
                       FVector& OutOrigin, FVector& OutDirection) const;

    // ── Queries ───────────────────────────────────────────────────

    /** Return all registered player infos of the given view mode. */
    UFUNCTION(BlueprintPure, Category = "CrossReality")
    TArray<FLoomXRPlayerInfo> GetPlayersOfMode(ELoomViewMode Mode) const;

    /** Current session info snapshot. */
    UFUNCTION(BlueprintPure, Category = "CrossReality")
    FLoomXRSessionInfo GetSessionInfo() const;

    /** True if at least one VR and one flat player are concurrently in the session. */
    UFUNCTION(BlueprintPure, Category = "CrossReality")
    bool IsCrossRealityActive() const;

    // ── Session Policy ────────────────────────────────────────────

    /** Change the session policy (takes effect for subsequent RegisterPlayer calls). */
    UFUNCTION(BlueprintCallable, Category = "CrossReality")
    void SetSessionPolicy(ELoomXRPolicy Policy);

    // ── Delegates ─────────────────────────────────────────────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnPlayerViewModeChanged,
        const FString&, PlayerId, ELoomViewMode, NewMode);

    UPROPERTY(BlueprintAssignable, Category = "CrossReality|Events")
    FOnPlayerViewModeChanged OnPlayerViewModeChanged;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnXRSessionStateChanged,
        const FLoomXRSessionInfo&, SessionInfo);

    UPROPERTY(BlueprintAssignable, Category = "CrossReality|Events")
    FOnXRSessionStateChanged OnXRSessionStateChanged;

    // ── UActorComponent ───────────────────────────────────────────

    virtual void BeginPlay() override;

private:
    TMap<FString, FLoomXRPlayerInfo> PlayerInfoMap;

    void RebuildSessionInfo();
    FLoomXRSessionInfo CachedSessionInfo;
};
