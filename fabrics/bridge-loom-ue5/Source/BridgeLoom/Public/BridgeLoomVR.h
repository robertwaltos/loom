// Copyright Project Loom. All Rights Reserved.
// Thread: bridge/bridge-loom-ue5/vr
// Tier: 1
//
// VR/AR rendering pipeline for Project Loom.
// Handles: stereo enable/disable, comfort settings, hand tracking IK,
// teleport locomotion, snap-turn, foveated rendering, and spatial UI.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomVR.generated.h"

// ── VR mode ──────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomVRMode : uint8
{
	Disabled    UMETA(DisplayName = "Disabled"),
	Stereo      UMETA(DisplayName = "Stereo VR"),
	Spectator   UMETA(DisplayName = "Spectator (flat + VR view)"),
	AR          UMETA(DisplayName = "AR Overlay"),
};

// ── Hand tracking state ──────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomHandTrackingState
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|VR")
	FTransform LeftPose;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|VR")
	FTransform RightPose;

	/** Pinch strength 0-1 (thumb-index distance mapped to 0=open 1=pinched) */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|VR")
	float LeftPinch = 0.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|VR")
	float RightPinch = 0.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|VR")
	bool bTrackingValid = false;
};

// ── Comfort settings ─────────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomVRComfortSettings
{
	GENERATED_BODY()

	/** Tunnel-vision vignette during locomotion */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|VR")
	bool bVignette = true;

	/** 0-1 strength of the comfort vignette */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|VR",
		meta = (ClampMin = "0.0", ClampMax = "1.0"))
	float VignetteStrength = 0.6f;

	/** Replace continuous thumbstick locomotion with teleport */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|VR")
	bool bTeleportLocomotion = false;

	/** Degrees per snap-turn step (0 = smooth turn) */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|VR",
		meta = (ClampMin = "0.0", ClampMax = "90.0"))
	float SnapTurnDegrees = 30.0f;

	/** Mirror the reduce-motion flag from accessibility profile */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|VR")
	bool bReduceMotion = false;

	/** Target frame rate (72, 90, 120 Hz depending on HMD) */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|VR")
	int32 TargetFrameRate = 90;
};

/**
 * UBridgeLoomVR
 *
 * ActorComponent that manages the VR/AR session lifecycle and comfort layer.
 * Attach to the PlayerController or a persistent camera rig actor.
 *
 * Features:
 *   - Enable/disable stereo rendering (wraps GEngine->XRSystem)
 *   - Comfort vignette via post-process material toggle
 *   - Hand tracking data → motion controller IK targets
 *   - Teleport with camera fade (FadeToBlack → move → FadeIn)
 *   - Snap-turn with cooldown guard
 *   - Foveated rendering CVar control (r.VRS.Enable)
 *   - AR "pass-through" overlay mode
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent))
class BRIDGELOOM_API UBridgeLoomVR : public UActorComponent
{
	GENERATED_BODY()

public:
	UBridgeLoomVR();

	virtual void BeginPlay() override;
	virtual void TickComponent(float DeltaTime, ELevelTick TickType,
		FActorComponentTickFunction* ThisTickFunction) override;

	// ── Mode ─────────────────────────────────────────────────────

	/** Enter or exit VR/AR mode. */
	UFUNCTION(BlueprintCallable, Category = "Loom|VR")
	void EnableVR(ELoomVRMode Mode);

	UFUNCTION(BlueprintPure, Category = "Loom|VR")
	ELoomVRMode GetCurrentMode() const { return CurrentMode; }

	// ── Comfort ──────────────────────────────────────────────────

	UFUNCTION(BlueprintCallable, Category = "Loom|VR")
	void SetComfortSettings(const FLoomVRComfortSettings& Settings);

	UFUNCTION(BlueprintPure, Category = "Loom|VR")
	FLoomVRComfortSettings GetComfortSettings() const { return ComfortSettings; }

	// ── Hand tracking ────────────────────────────────────────────

	/** Push a hand tracking frame (called every render frame from XR subsystem). */
	UFUNCTION(BlueprintCallable, Category = "Loom|VR")
	void UpdateHandTracking(const FLoomHandTrackingState& HandState);

	UFUNCTION(BlueprintPure, Category = "Loom|VR")
	FLoomHandTrackingState GetLastHandState() const { return LastHandState; }

	// ── Locomotion ───────────────────────────────────────────────

	/**
	 * Fade to black → teleport player to Destination → fade back in.
	 * Duration controls camera fade duration on each side.
	 */
	UFUNCTION(BlueprintCallable, Category = "Loom|VR")
	void TeleportPlayer(const FVector& Destination, float FadeDuration = 0.15f);

	/** Instantly rotate the camera rig by SnapTurnDegrees (respects cooldown). */
	UFUNCTION(BlueprintCallable, Category = "Loom|VR")
	void SnapTurn(bool bRight);

	// ── Rendering quality ─────────────────────────────────────────

	/**
	 * Toggle Variable Rate Shading / Foveated Rendering.
	 * Quality sets the foveal region size (higher = smaller high-res region).
	 */
	UFUNCTION(BlueprintCallable, Category = "Loom|VR")
	void SetFoveatedRendering(bool bEnable, int32 QualityLevel = 2);

	/** Set HMD target refresh rate. */
	UFUNCTION(BlueprintCallable, Category = "Loom|VR")
	void SetTargetFrameRate(int32 Hz);

	// ── Spatial audio ─────────────────────────────────────────────

	/** Enable or disable HRTF head-tracked spatial audio. */
	UFUNCTION(BlueprintCallable, Category = "Loom|VR")
	void SetSpatialAudioEnabled(bool bEnable);

	// ── Delegates ────────────────────────────────────────────────

	DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnVRModeChanged, ELoomVRMode, NewMode);
	UPROPERTY(BlueprintAssignable, Category = "Loom|VR")
	FOnVRModeChanged OnVRModeChanged;

	DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnTeleportComplete, FVector, NewLocation);
	UPROPERTY(BlueprintAssignable, Category = "Loom|VR")
	FOnTeleportComplete OnTeleportComplete;

private:
	ELoomVRMode            CurrentMode     = ELoomVRMode::Disabled;
	FLoomVRComfortSettings ComfortSettings;
	FLoomHandTrackingState LastHandState;

	bool  bTeleporting           = false;
	float TeleportFadeTimer      = 0.0f;
	float TeleportFadeDuration   = 0.15f;
	FVector TeleportDestination  = FVector::ZeroVector;

	float SnapTurnCooldown       = 0.0f;
	static constexpr float SnapTurnCooldownDuration = 0.3f;

	void TickTeleport(float DeltaTime);
	void TickSnapTurnCooldown(float DeltaTime);
	void ApplyVignette(bool bEnable, float Strength);
	void SetCVarBool(const TCHAR* CVarName, bool bEnable);
};
