// BridgeLoomAccessibility.h — Accessibility features for Loom UE5 client
// Screen reader support, colorblind modes, subtitle system, and motor aids.
// Thread: bridge/bridge-loom-ue5/accessibility
// Tier: 3

// Copyright Project Loom. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomAccessibility.generated.h"

// ── Enums ─────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomColorblindMode : uint8
{
	None            UMETA(DisplayName = "None (Default)"),
	Protanopia      UMETA(DisplayName = "Protanopia (Red-blind)"),
	Deuteranopia    UMETA(DisplayName = "Deuteranopia (Green-blind)"),
	Tritanopia      UMETA(DisplayName = "Tritanopia (Blue-blind)"),
	Achromatopsia   UMETA(DisplayName = "Achromatopsia (Full colour-blind)"),
	HighContrast    UMETA(DisplayName = "High Contrast"),
};

UENUM(BlueprintType)
enum class ELoomSubtitleStyle : uint8
{
	Standard    UMETA(DisplayName = "Standard"),
	Large       UMETA(DisplayName = "Large"),
	ExtraLarge  UMETA(DisplayName = "Extra Large"),
	HighContrast UMETA(DisplayName = "High Contrast White-on-Black"),
};

UENUM(BlueprintType)
enum class ELoomMotorAid : uint8
{
	None            UMETA(DisplayName = "None"),
	StickyAim       UMETA(DisplayName = "Sticky Aim Assist"),
	AutoSprint      UMETA(DisplayName = "Auto Sprint Toggle"),
	AutoLoot        UMETA(DisplayName = "Auto Loot on Proximity"),
	SimplifiedInput UMETA(DisplayName = "Simplified Input (single-button combos)"),
};

// ── Structs ───────────────────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomSubtitleEntry
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Subtitles")
	FText SpeakerName;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Subtitles")
	FText DialogueLine;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Subtitles")
	float DisplaySeconds = 4.0f;

	// Optional sound description for deaf/hard-of-hearing (e.g. "[Explosion nearby]")
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Subtitles")
	FText AudioDescription;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomAccessibilityProfile
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Accessibility")
	ELoomColorblindMode ColorblindMode = ELoomColorblindMode::None;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Accessibility")
	bool bSubtitlesEnabled = false;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Accessibility")
	ELoomSubtitleStyle SubtitleStyle = ELoomSubtitleStyle::Standard;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Accessibility")
	bool bScreenReaderEnabled = false;

	// 0.5–2.0 UI text scale multiplier
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Accessibility")
	float UITextScale = 1.0f;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Accessibility")
	bool bReduceMotion = false;		// disables screen shake and particle excess

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Accessibility")
	bool bHighContrastUI = false;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Accessibility")
	TArray<ELoomMotorAid> MotorAids;

	// Input hold-to-toggle time in seconds (0 = press-once)
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Accessibility")
	float HoldToToggleSeconds = 0.0f;
};

// ── Component ─────────────────────────────────────────────────────

/**
 * UBridgeLoomAccessibility — Actor component implementing accessibility
 * features for the Loom UE5 client.
 *
 * Features:
 *   - Colorblind LUT post-process filter (Protanopia/Deuteranopia/Tritanopia/Achromatopsia)
 *   - High-contrast mode: boost UI edge outlines and widget contrast
 *   - Subtitle queue with configurable style and speaker attribution
 *   - Audio descriptions for non-speech sound events
 *   - Screen reader: TTS narration of focused UI widgets (platform TTS API)
 *   - Motor aids: sticky aim, auto-sprint-toggle, simplified-input combos
 *   - Reduce-motion: disables screen shake, reduces particle density
 */
UCLASS(ClassGroup=(Loom), meta=(BlueprintSpawnableComponent))
class BRIDGELOOM_API UBridgeLoomAccessibility : public UActorComponent
{
	GENERATED_BODY()

public:
	UBridgeLoomAccessibility();

	virtual void BeginPlay() override;
	virtual void TickComponent(float DeltaTime, ELevelTick TickType,
	                           FActorComponentTickFunction* ThisTickFunction) override;

	// -- Profile management --------------------------------------------------------

	/** Apply a full accessibility profile (e.g. loaded from player prefs). */
	UFUNCTION(BlueprintCallable, Category = "Loom|Accessibility")
	void ApplyProfile(const FLoomAccessibilityProfile& Profile);

	UFUNCTION(BlueprintPure, Category = "Loom|Accessibility")
	FLoomAccessibilityProfile GetActiveProfile() const;

	// -- Colorblind ----------------------------------------------------------------

	UFUNCTION(BlueprintCallable, Category = "Loom|Accessibility")
	void SetColorblindMode(ELoomColorblindMode Mode);

	// -- Subtitles -----------------------------------------------------------------

	/** Push a subtitle line to the display queue. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Accessibility")
	void ShowSubtitle(const FLoomSubtitleEntry& Entry);

	UFUNCTION(BlueprintCallable, Category = "Loom|Accessibility")
	void ClearSubtitles();

	// -- Screen reader / TTS -------------------------------------------------------

	/** Narrate a string via the platform TTS API. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Accessibility")
	void Narrate(const FText& Text, bool bInterruptCurrent = false);

	/** Called by the UI system when a widget gains focus to auto-narrate its label. */
	UFUNCTION(BlueprintCallable, Category = "Loom|Accessibility")
	void OnWidgetFocused(const FText& WidgetLabel, const FText& WidgetHint);

	// -- Motor aids ----------------------------------------------------------------

	UFUNCTION(BlueprintCallable, Category = "Loom|Accessibility")
	void SetMotorAids(const TArray<ELoomMotorAid>& Aids);

	/** Evaluate whether an aim-assist snap is warranted this frame. */
	UFUNCTION(BlueprintPure, Category = "Loom|Accessibility")
	bool ShouldApplyStickyAim(const FVector& AimDirection, const FVector& TargetLocation,
	                           float AimAssistAngleDeg = 5.0f) const;

	// -- Reduce motion -------------------------------------------------------------

	UFUNCTION(BlueprintCallable, Category = "Loom|Accessibility")
	void SetReduceMotion(bool bEnabled);

	UFUNCTION(BlueprintPure, Category = "Loom|Accessibility")
	bool IsReduceMotionEnabled() const { return ActiveProfile.bReduceMotion; }

	// -- Delegates -----------------------------------------------------------------

	DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
		FOnSubtitleQueued, FLoomSubtitleEntry, Entry);
	UPROPERTY(BlueprintAssignable, Category = "Loom|Accessibility")
	FOnSubtitleQueued OnSubtitleQueued;

	DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(
		FOnColorblindModeChanged, ELoomColorblindMode, NewMode);
	UPROPERTY(BlueprintAssignable, Category = "Loom|Accessibility")
	FOnColorblindModeChanged OnColorblindModeChanged;

private:
	FLoomAccessibilityProfile ActiveProfile;

	// Subtitle queue: entry + remaining display seconds
	TArray<TTuple<FLoomSubtitleEntry, float>> SubtitleQueue;
	float SubtitleDisplayAccumulator = 0.0f;

	void TickSubtitles(float DeltaTime);
	void ApplyColorblindLUT(ELoomColorblindMode Mode);
	void ApplyHighContrastUI(bool bEnabled);
};
