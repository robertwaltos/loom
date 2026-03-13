// Copyright Project Loom. All Rights Reserved.

#include "BridgeLoomAccessibility.h"
#include "HAL/PlatformMisc.h"
#include "Engine/Engine.h"
#include "Engine/World.h"
#include "GameFramework/PlayerCameraManager.h"
#include "Kismet/GameplayStatics.h"

// ── Constructor ──────────────────────────────────────────────────

UBridgeLoomAccessibility::UBridgeLoomAccessibility()
{
	PrimaryComponentTick.bCanEverTick = true;
}

// ── Lifecycle ────────────────────────────────────────────────────

void UBridgeLoomAccessibility::BeginPlay()
{
	Super::BeginPlay();
}

void UBridgeLoomAccessibility::TickComponent(float DeltaTime,
                                              ELevelTick TickType,
                                              FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
	TickSubtitles(DeltaTime);
}

// ── Profile ──────────────────────────────────────────────────────

void UBridgeLoomAccessibility::ApplyProfile(const FLoomAccessibilityProfile& Profile)
{
	ActiveProfile = Profile;
	SetColorblindMode(Profile.ColorblindMode);
	SetMotorAids(Profile.MotorAids);
	SetReduceMotion(Profile.bReduceMotion);
}

// ── Colorblind LUT ───────────────────────────────────────────────

void UBridgeLoomAccessibility::SetColorblindMode(ELoomColorblindMode Mode)
{
	ActiveProfile.ColorblindMode = Mode;
	ApplyColorblindLUT(Mode);
	OnColorblindModeChanged.Broadcast(Mode);
}

void UBridgeLoomAccessibility::ApplyColorblindLUT(ELoomColorblindMode Mode)
{
	// Map mode to console variable index understood by UE5's built-in colorblind CVars
	// r.ColorGrading.ColorVisionDeficiency: 0=none,1=deuteranopia,2=protanopia,3=tritanopia
	int32 CVarValue = 0;
	switch (Mode)
	{
	case ELoomColorblindMode::Deuteranopia:  CVarValue = 1; break;
	case ELoomColorblindMode::Protanopia:    CVarValue = 2; break;
	case ELoomColorblindMode::Tritanopia:    CVarValue = 3; break;
	case ELoomColorblindMode::Achromatopsia: CVarValue = 4; break; // partial sim
	default:                                 CVarValue = 0; break;
	}

	if (IConsoleVariable* CVar =
		    IConsoleManager::Get().FindConsoleVariable(
		        TEXT("r.PostProcessing.ColorVisionDeficiencyType")))
	{
		CVar->Set(CVarValue);
	}
	if (IConsoleVariable* CVar =
		    IConsoleManager::Get().FindConsoleVariable(
		        TEXT("r.PostProcessing.ColorVisionDeficiencySeverity")))
	{
		CVar->Set(Mode != ELoomColorblindMode::None ? 1.0f : 0.0f);
	}
}

// ── Subtitles ────────────────────────────────────────────────────

void UBridgeLoomAccessibility::ShowSubtitle(const FLoomSubtitleEntry& Entry)
{
	SubtitleQueue.Add(Entry);
	OnSubtitleQueued.Broadcast(Entry);
}

void UBridgeLoomAccessibility::ClearSubtitles()
{
	SubtitleQueue.Empty();
}

void UBridgeLoomAccessibility::TickSubtitles(float DeltaTime)
{
	if (SubtitleQueue.Num() == 0) return;

	FLoomSubtitleEntry& Top = SubtitleQueue[0];
	Top.DisplayDurationSeconds -= DeltaTime;
	if (Top.DisplayDurationSeconds <= 0.0f)
	{
		SubtitleQueue.RemoveAt(0);
	}
}

// ── Screen reader / TTS ──────────────────────────────────────────

void UBridgeLoomAccessibility::Narrate(const FText& Text, bool bInterrupt)
{
#if PLATFORM_IOS || PLATFORM_ANDROID
	if (bInterrupt)
	{
		// Platform TTS — best-effort, no-op on unsupported platforms
		FString TextStr = Text.ToString();
		FPlatformMisc::SpeakText(TextStr);
	}
	else
	{
		NarrateQueue.Add(Text);
	}
#endif
}

void UBridgeLoomAccessibility::OnWidgetFocused(const FText& WidgetLabel,
                                                const FText& WidgetHint)
{
	if (ActiveProfile.bScreenReaderEnabled)
	{
		const FText Combined = FText::Format(
			NSLOCTEXT("Loom", "WidgetFocusFmt", "{0}. {1}"), WidgetLabel, WidgetHint);
		Narrate(Combined, false);
	}
}

// ── Motor aids ───────────────────────────────────────────────────

void UBridgeLoomAccessibility::SetMotorAids(const TSet<ELoomMotorAid>& Aids)
{
	ActiveProfile.MotorAids = Aids;
}

bool UBridgeLoomAccessibility::ShouldApplyStickyAim(const FVector& AimOrigin,
                                                      const FVector& AimDirection,
                                                      const FVector& TargetLocation) const
{
	if (!ActiveProfile.MotorAids.Contains(ELoomMotorAid::StickyAim))
	{
		return false;
	}

	const FVector ToTarget = (TargetLocation - AimOrigin).GetSafeNormal();
	const float   DotProd  = FVector::DotProduct(AimDirection.GetSafeNormal(), ToTarget);
	const float   AngleDeg = FMath::RadiansToDegrees(FMath::Acos(FMath::Clamp(DotProd, -1.0f, 1.0f)));

	return AngleDeg <= ActiveProfile.AimAssistAngleDeg;
}

// ── Reduce-motion ────────────────────────────────────────────────

void UBridgeLoomAccessibility::SetReduceMotion(bool bReduce)
{
	ActiveProfile.bReduceMotion = bReduce;

	// Lower camera shake scale globally when reduce-motion is active
	if (APlayerCameraManager* CamMgr = UGameplayStatics::GetPlayerCameraManager(GetWorld(), 0))
	{
		CamMgr->DefaultModifyCamera = !bReduce; // suppress auto blend-anim
		// UE5 exposes camera shake scale via the ViewTarget's modifier stack;
		// a scalar of 0 is the safest cross-version approach
		if (IConsoleVariable* CVar =
			    IConsoleManager::Get().FindConsoleVariable(TEXT("r.CameraShakeScaleFactor")))
		{
			CVar->Set(bReduce ? 0.0f : 1.0f);
		}
	}
}
