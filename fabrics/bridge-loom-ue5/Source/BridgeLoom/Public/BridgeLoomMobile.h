// BridgeLoomMobile.h — Mobile platform optimisations and touch controls
// Manages render scalability, touch bindings, gyro aiming, and battery awareness.
// Thread: bridge/bridge-loom-ue5/mobile
// Tier: 3

// Copyright Project Loom. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "GameFramework/PlayerController.h"
#include "BridgeLoomMobile.generated.h"

// ── Enums ─────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomMobileQuality : uint8
{
	Ultra   UMETA(DisplayName = "Ultra (High-end)"),
	High    UMETA(DisplayName = "High"),
	Medium  UMETA(DisplayName = "Medium"),
	Low     UMETA(DisplayName = "Low"),
	Battery UMETA(DisplayName = "Battery Saver"),
};

UENUM(BlueprintType)
enum class ELoomTouchZone : uint8
{
	LeftThumb    UMETA(DisplayName = "Left Virtual Stick"),
	RightThumb   UMETA(DisplayName = "Right Virtual Stick / Look"),
	ActionButton UMETA(DisplayName = "Action Button"),
	JumpButton   UMETA(DisplayName = "Jump Button"),
	MapButton    UMETA(DisplayName = "Map / Menu"),
	SprintToggle UMETA(DisplayName = "Sprint Toggle"),
};

// ── Structs ───────────────────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomMobileScalabilitySettings
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mobile")
	ELoomMobileQuality QualityTier = ELoomMobileQuality::Medium;

	// 0.5–1.0; scales render target resolution
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mobile")
	float ResolutionScale = 0.75f;

	// Maximum frames per second (30 or 60 on most mobile targets)
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mobile")
	int32 TargetFPS = 30;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mobile")
	bool bUseMobileHDR = true;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mobile")
	bool bEnableDynamicResolution = true;

	// Disable Lumen on low-end hardware (falls back to screen-space GI)
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mobile")
	bool bUseLumen = false;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mobile")
	bool bUseShadows = true;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mobile")
	int32 MaxShadowCascades = 1;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomTouchBinding
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mobile|Touch")
	ELoomTouchZone Zone = ELoomTouchZone::ActionButton;

	// Screen-space anchor (0–1 normalised)
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mobile|Touch")
	FVector2D ScreenAnchor = FVector2D(0.5f, 0.5f);

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mobile|Touch")
	float Radius = 0.08f;	// normalised screen size

	// Whether the zone shows a virtual joystick HUD widget
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mobile|Touch")
	bool bIsVirtualStick = false;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomMobileTelemetry
{
	GENERATED_BODY()

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Loom|Mobile")
	float BatteryLevel = 1.0f;		// 0–1

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Loom|Mobile")
	bool bThermalThrottling = false;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Loom|Mobile")
	float AverageFPS = 30.0f;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Loom|Mobile")
	ELoomMobileQuality AutoSelectedQuality = ELoomMobileQuality::Medium;
};

// ── Component ─────────────────────────────────────────────────────

/**
 * UBridgeLoomMobile — Actor component managing mobile-specific rendering
 * scalability, touch input processing, and battery/thermal adaptation.
 *
 * Features:
 *   - Quality tier detection from device capability tier (GPU score)
 *   - Dynamic resolution scaling + automatic frame-rate capping
 *   - Virtual joystick and action-button touch zones
 *   - Gyro-assisted aiming (configurable sensitivity)
 *   - Battery / thermal monitoring: auto-downgrade quality if throttling
 *   - Vibration feedback routing via Loom game-event hooks
 */
UCLASS(ClassGroup=(Loom), meta=(BlueprintSpawnableComponent))
class BRIDGELOOM_API UBridgeLoomMobile : public UActorComponent
{
	GENERATED_BODY()

public:
	UBridgeLoomMobile();

	virtual void BeginPlay() override;
	virtual void TickComponent(float DeltaTime, ELevelTick TickType,
	                           FActorComponentTickFunction* ThisTickFunction) override;

	// -- Scalability ---------------------------------------------------------------

	UFUNCTION(BlueprintCallable, Category = "Loom|Mobile")
	void ApplyScalabilitySettings(const FLoomMobileScalabilitySettings& Settings);

	/** Auto-detect best quality tier for the current device and apply it. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Mobile")
	ELoomMobileQuality AutoDetectQuality();

	// -- Touch input ---------------------------------------------------------------

	UFUNCTION(BlueprintCallable, Category = "Loom|Mobile|Touch")
	void RegisterTouchBindings(const TArray<FLoomTouchBinding>& Bindings);

	UFUNCTION(BlueprintCallable, Category = "Loom|Mobile|Touch")
	void ProcessTouchBegin(int32 FingerIndex, const FVector2D& ScreenPosition);

	UFUNCTION(BlueprintCallable, Category = "Loom|Mobile|Touch")
	void ProcessTouchMove(int32 FingerIndex, const FVector2D& ScreenPosition);

	UFUNCTION(BlueprintCallable, Category = "Loom|Mobile|Touch")
	void ProcessTouchEnd(int32 FingerIndex);

	// -- Gyro aiming ---------------------------------------------------------------

	UFUNCTION(BlueprintCallable, Category = "Loom|Mobile")
	void SetGyroEnabled(bool bEnabled, float Sensitivity = 1.0f);

	/** Feed raw gyroscope delta (degrees/sec) from the platform layer each tick. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Mobile")
	void ApplyGyroDelta(const FRotator& GyroDeltaDegreesPerSec, float DeltaTime);

	// -- Battery / thermal ---------------------------------------------------------

	UFUNCTION(BlueprintPure, Category = "Loom|Mobile")
	FLoomMobileTelemetry GetMobileTelemetry() const;

	// -- Haptics -------------------------------------------------------------------

	/** Trigger a short vibration pulse (e.g. on hit). */
	UFUNCTION(BlueprintCallable, Category = "Loom|Mobile")
	void TriggerHapticPulse(float Amplitude, float DurationSeconds);

	// -- Configuration -------------------------------------------------------------

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mobile")
	TArray<FLoomTouchBinding> DefaultTouchBindings;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mobile")
	FLoomMobileScalabilitySettings DefaultSettings;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Mobile")
	float ThermalThrottleBatteryThreshold = 0.15f;	// auto-lower quality below 15%

	// -- Delegate ------------------------------------------------------------------

	DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(
		FOnMobileQualityChanged, ELoomMobileQuality, OldTier, ELoomMobileQuality, NewTier);
	UPROPERTY(BlueprintAssignable, Category = "Loom|Mobile")
	FOnMobileQualityChanged OnMobileQualityChanged;

private:
	FLoomMobileScalabilitySettings ActiveSettings;
	TArray<FLoomTouchBinding>       ActiveBindings;
	TMap<int32, ELoomTouchZone>     ActiveTouches;	// FingerIndex -> zone

	bool  bGyroEnabled     = false;
	float GyroSensitivity  = 1.0f;

	FLoomMobileTelemetry CachedTelemetry;
	float TelemetryUpdateAccumulator = 0.0f;

	void TickThermalMonitor(float DeltaTime);
	ELoomTouchZone HitTestTouchZone(const FVector2D& ScreenPos) const;
};
