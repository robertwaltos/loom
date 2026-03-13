// Copyright Project Loom. All Rights Reserved.

#include "BridgeLoomMobile.h"
#include "Engine/Engine.h"
#include "HAL/PlatformMisc.h"
#include "IConsoleManager.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"

// ── Constructor ──────────────────────────────────────────────────

UBridgeLoomMobile::UBridgeLoomMobile()
{
	PrimaryComponentTick.bCanEverTick = true;
}

// ── Lifecycle ────────────────────────────────────────────────────

void UBridgeLoomMobile::BeginPlay()
{
	Super::BeginPlay();
	CachedScreenSize = FVector2D(
		GSystemResolution.ResX > 0 ? static_cast<float>(GSystemResolution.ResX) : 1920.0f,
		GSystemResolution.ResY > 0 ? static_cast<float>(GSystemResolution.ResY) : 1080.0f);
}

void UBridgeLoomMobile::TickComponent(float DeltaTime,
                                       ELevelTick TickType,
                                       FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);
	TickThermalMonitor(DeltaTime);
}

// ── Scalability ──────────────────────────────────────────────────

void UBridgeLoomMobile::ApplyScalabilitySettings(const FLoomMobileScalabilitySettings& Settings)
{
	ActiveSettings = Settings;

	// Screen percentage (render resolution scale)
	if (IConsoleVariable* CVar = IConsoleManager::Get().FindConsoleVariable(TEXT("r.ScreenPercentage")))
	{
		CVar->Set(Settings.RenderResolutionScale * 100.0f);
	}
	// Shadow quality
	if (IConsoleVariable* CVar = IConsoleManager::Get().FindConsoleVariable(TEXT("r.ShadowQuality")))
	{
		CVar->Set(static_cast<int32>(Settings.ShadowQuality));
	}
	// Anti-aliasing
	if (IConsoleVariable* CVar = IConsoleManager::Get().FindConsoleVariable(TEXT("r.AntiAliasingMethod")))
	{
		CVar->Set(static_cast<int32>(Settings.AntiAliasingMethod));
	}
	// Frame rate cap
	if (GEngine && Settings.TargetFrameRateCap > 0)
	{
		GEngine->SetMaxFPS(static_cast<float>(Settings.TargetFrameRateCap));
	}
}

ELoomMobileQuality UBridgeLoomMobile::AutoDetectQuality() const
{
#if PLATFORM_IOS || PLATFORM_ANDROID
	// Conservative quality tiers based on RAM
	const uint64 TotalMemMB = FPlatformMemory::GetPhysicalGBRam() * 1024ULL;
	if (TotalMemMB >= 8192) return ELoomMobileQuality::Ultra;
	if (TotalMemMB >= 4096) return ELoomMobileQuality::High;
	if (TotalMemMB >= 2048) return ELoomMobileQuality::Medium;
	if (TotalMemMB >= 1024) return ELoomMobileQuality::Low;
	return ELoomMobileQuality::Minimum;
#else
	return ELoomMobileQuality::High;
#endif
}

// ── Touch ────────────────────────────────────────────────────────

void UBridgeLoomMobile::RegisterTouchBindings(const TArray<FLoomTouchBinding>& Bindings)
{
	ActiveBindings = Bindings;
}

void UBridgeLoomMobile::ProcessTouchBegin(int32 FingerIndex, const FVector2D& ScreenPos)
{
	const ELoomTouchZone Zone = HitTestTouchZone(ScreenPos);
	ActiveTouches.Add(FingerIndex, TTuple<FVector2D, ELoomTouchZone>(ScreenPos, Zone));
}

void UBridgeLoomMobile::ProcessTouchMove(int32 FingerIndex, const FVector2D& ScreenPos)
{
	if (TTuple<FVector2D, ELoomTouchZone>* Touch = ActiveTouches.Find(FingerIndex))
	{
		const FVector2D Delta = ScreenPos - Touch->Key;
		Touch->Key = ScreenPos;

		// Drive move-stick input for the first finger in MoveZone
		if (Touch->Value == ELoomTouchZone::LeftStick)
		{
			const float InvSize = CachedScreenSize.X > 0.0f ? 1.0f / (CachedScreenSize.X * 0.15f) : 1.0f;
			MoveStickAxis = FVector2D(
				FMath::Clamp(Delta.X * InvSize, -1.0f, 1.0f),
				FMath::Clamp(-Delta.Y * InvSize, -1.0f, 1.0f));
		}
		else if (Touch->Value == ELoomTouchZone::RightStick)
		{
			const float InvSize = CachedScreenSize.X > 0.0f ? 1.0f / (CachedScreenSize.X * 0.10f) : 1.0f;
			LookStickAxis = FVector2D(
				FMath::Clamp(Delta.X * InvSize, -1.0f, 1.0f),
				FMath::Clamp(-Delta.Y * InvSize, -1.0f, 1.0f));
		}
	}
}

void UBridgeLoomMobile::ProcessTouchEnd(int32 FingerIndex)
{
	if (const TTuple<FVector2D, ELoomTouchZone>* Touch = ActiveTouches.Find(FingerIndex))
	{
		if (Touch->Value == ELoomTouchZone::LeftStick)  MoveStickAxis = FVector2D::ZeroVector;
		if (Touch->Value == ELoomTouchZone::RightStick) LookStickAxis = FVector2D::ZeroVector;
	}
	ActiveTouches.Remove(FingerIndex);
}

// ── Gyroscope ────────────────────────────────────────────────────

void UBridgeLoomMobile::SetGyroEnabled(bool bEnabled)
{
	bGyroEnabled = bEnabled;
}

void UBridgeLoomMobile::ApplyGyroDelta(const FRotator& GyroRate, float DeltaTime)
{
	if (!bGyroEnabled) return;

	if (APlayerController* PC = Cast<APlayerController>(
		    UGameplayStatics::GetPlayerController(GetWorld(), 0)))
	{
		PC->AddYawInput(GyroRate.Yaw   * DeltaTime * GyroSensitivity);
		PC->AddPitchInput(GyroRate.Pitch * DeltaTime * GyroSensitivity);
	}
}

// ── Telemetry ────────────────────────────────────────────────────

FLoomMobileTelemetry UBridgeLoomMobile::GetMobileTelemetry() const
{
	FLoomMobileTelemetry Out;
	Out.CurrentQuality       = CurrentQuality;
	Out.CurrentFrameTimeMs   = GEngine ? (1000.0f / GEngine->GetMaxFPS()) : 16.7f;
	Out.CurrentBatteryPercent = FPlatformMisc::GetBatteryLevel(); // 0-100, -1 if unknown
	Out.bOverheating         = bThermalThrottling;
	Out.ActiveTouchCount     = ActiveTouches.Num();
	Out.bGyroActive          = bGyroEnabled;
	return Out;
}

// ── Haptics ─────────────────────────────────────────────────────

void UBridgeLoomMobile::TriggerHapticPulse(float Intensity, float DurationSeconds)
{
	if (APlayerController* PC = Cast<APlayerController>(
		    UGameplayStatics::GetPlayerController(GetWorld(), 0)))
	{
		FForceFeedbackValues FeedbackValues;
		FeedbackValues.LeftSmall  = FMath::Clamp(Intensity, 0.0f, 1.0f);
		FeedbackValues.RightSmall = FMath::Clamp(Intensity, 0.0f, 1.0f);
		PC->SetForceFeedbackParameters(NAME_None,
		                               FeedbackValues,
		                               false,
		                               false,
		                               false);
	}
}

// ── Private helpers ───────────────────────────────────────────────

ELoomTouchZone UBridgeLoomMobile::HitTestTouchZone(const FVector2D& ScreenPos) const
{
	float BestDist  = MAX_FLT;
	ELoomTouchZone  BestZone = ELoomTouchZone::Gameplay;

	for (const FLoomTouchBinding& Binding : ActiveBindings)
	{
		const FVector2D Anchor = Binding.NormalizedAnchor * CachedScreenSize;
		const float     Radius = Binding.NormalizedRadius  * CachedScreenSize.X;
		const float     Dist   = FVector2D::Distance(ScreenPos, Anchor);

		if (Dist <= Radius && Dist < BestDist)
		{
			BestDist = Dist;
			BestZone = Binding.Zone;
		}
	}
	return BestZone;
}

void UBridgeLoomMobile::TickThermalMonitor(float DeltaTime)
{
	ThermalMonitorAccumulator += DeltaTime;
	if (ThermalMonitorAccumulator < ThermalCheckIntervalSeconds) return;
	ThermalMonitorAccumulator = 0.0f;

	const int32 Battery = FPlatformMisc::GetBatteryLevel();
	const bool  bLowBat = (Battery >= 0 && Battery < BatteryThresholdForDowngrade);

	// Simple heuristic: if the battery is draining unusually fast we throttle
	bThermalThrottling = bLowBat;

	if (bThermalThrottling && CurrentQuality > ELoomMobileQuality::Minimum)
	{
		const ELoomMobileQuality Downgraded =
			static_cast<ELoomMobileQuality>(static_cast<uint8>(CurrentQuality) - 1);
		CurrentQuality = Downgraded;
		OnMobileQualityChanged.Broadcast(Downgraded);
	}
}
