// Copyright Project Loom. All Rights Reserved.

#include "BridgeLoomVR.h"
#include "HeadMountedDisplayFunctionLibrary.h"
#include "IXRTrackingSystem.h"
#include "Engine/Engine.h"
#include "Engine/World.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/Pawn.h"
#include "Camera/PlayerCameraManager.h"
#include "HAL/IConsoleManager.h"
#include "Kismet/GameplayStatics.h"
#include "Math/UnrealMathUtility.h"

UBridgeLoomVR::UBridgeLoomVR()
{
	PrimaryComponentTick.bCanEverTick = true;
}

void UBridgeLoomVR::BeginPlay()
{
	Super::BeginPlay();
}

void UBridgeLoomVR::TickComponent(float DeltaTime, ELevelTick TickType,
	FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

	TickTeleport(DeltaTime);
	TickSnapTurnCooldown(DeltaTime);
}

// ── Mode ──────────────────────────────────────────────────────────

void UBridgeLoomVR::EnableVR(ELoomVRMode Mode)
{
	if (Mode == CurrentMode) { return; }

	if (!GEngine || !GEngine->XRSystem.IsValid())
	{
		UE_LOG(LogTemp, Warning, TEXT("BridgeLoomVR: XR system not available"));
		if (Mode != ELoomVRMode::Disabled)
		{
			return;
		}
	}

	switch (Mode)
	{
		case ELoomVRMode::Stereo:
			if (GEngine && GEngine->XRSystem.IsValid())
			{
				GEngine->XRSystem->EnableStereo(true);
				UHeadMountedDisplayFunctionLibrary::EnableHMD(true);
			}
			break;

		case ELoomVRMode::Spectator:
			if (GEngine && GEngine->XRSystem.IsValid())
			{
				GEngine->XRSystem->EnableStereo(true);
			}
			break;

		case ELoomVRMode::AR:
			if (GEngine && GEngine->XRSystem.IsValid())
			{
				GEngine->XRSystem->EnableStereo(true);
				// AR overlay: disable scene colour and let camera passthrough
				SetCVarBool(TEXT("r.Mobile.TonemapSubpassEnabled"), false);
			}
			break;

		case ELoomVRMode::Disabled:
		default:
			if (GEngine && GEngine->XRSystem.IsValid())
			{
				GEngine->XRSystem->EnableStereo(false);
				UHeadMountedDisplayFunctionLibrary::EnableHMD(false);
			}
			break;
	}

	CurrentMode = Mode;
	OnVRModeChanged.Broadcast(Mode);

	// (Re)apply comfort vignette enabled state
	ApplyVignette(ComfortSettings.bVignette && Mode != ELoomVRMode::Disabled,
		ComfortSettings.VignetteStrength);
}

// ── Comfort ───────────────────────────────────────────────────────

void UBridgeLoomVR::SetComfortSettings(const FLoomVRComfortSettings& Settings)
{
	ComfortSettings = Settings;

	ApplyVignette(Settings.bVignette && CurrentMode != ELoomVRMode::Disabled,
		Settings.VignetteStrength);

	if (Settings.TargetFrameRate > 0)
	{
		SetTargetFrameRate(Settings.TargetFrameRate);
	}
}

// ── Hand tracking ─────────────────────────────────────────────────

void UBridgeLoomVR::UpdateHandTracking(const FLoomHandTrackingState& HandState)
{
	LastHandState = HandState;
	// Data is available for polling by AnimBP / motion controller components
}

// ── Locomotion ────────────────────────────────────────────────────

void UBridgeLoomVR::TeleportPlayer(const FVector& Destination, float FadeDuration)
{
	if (bTeleporting) { return; }

	UWorld* World = GetWorld();
	if (!World) { return; }

	APlayerController* PC = World->GetFirstPlayerController();
	if (!PC) { return; }

	TeleportDestination  = Destination;
	TeleportFadeDuration = FMath::Max(FadeDuration, 0.05f);
	TeleportFadeTimer    = 0.0f;
	bTeleporting         = true;

	// Phase 1: fade to black
	PC->PlayerCameraManager->StartCameraFade(
		0.0f, 1.0f, TeleportFadeDuration, FLinearColor::Black, false, true);
}

void UBridgeLoomVR::TickTeleport(float DeltaTime)
{
	if (!bTeleporting) { return; }

	TeleportFadeTimer += DeltaTime;

	if (TeleportFadeTimer >= TeleportFadeDuration)
	{
		UWorld* World = GetWorld();
		if (!World) { bTeleporting = false; return; }

		APlayerController* PC = World->GetFirstPlayerController();
		if (!PC) { bTeleporting = false; return; }

		APawn* Pawn = PC->GetPawn();
		if (Pawn)
		{
			Pawn->TeleportTo(TeleportDestination, Pawn->GetActorRotation(), false, true);
		}

		// Phase 2: fade back in
		PC->PlayerCameraManager->StartCameraFade(
			1.0f, 0.0f, TeleportFadeDuration, FLinearColor::Black, false, false);

		bTeleporting = false;
		OnTeleportComplete.Broadcast(TeleportDestination);
	}
}

void UBridgeLoomVR::SnapTurn(bool bRight)
{
	if (SnapTurnCooldown > 0.0f) { return; }
	if (ComfortSettings.SnapTurnDegrees <= 0.0f) { return; }

	UWorld* World = GetWorld();
	if (!World) { return; }

	APlayerController* PC = World->GetFirstPlayerController();
	if (!PC) { return; }

	const float Degrees = bRight
		? ComfortSettings.SnapTurnDegrees
		: -ComfortSettings.SnapTurnDegrees;

	APawn* Pawn = PC->GetPawn();
	if (Pawn)
	{
		const FRotator Current = Pawn->GetActorRotation();
		Pawn->SetActorRotation(FRotator(Current.Pitch, Current.Yaw + Degrees, Current.Roll));
	}

	SnapTurnCooldown = SnapTurnCooldownDuration;
}

void UBridgeLoomVR::TickSnapTurnCooldown(float DeltaTime)
{
	if (SnapTurnCooldown > 0.0f)
	{
		SnapTurnCooldown = FMath::Max(0.0f, SnapTurnCooldown - DeltaTime);
	}
}

// ── Rendering quality ─────────────────────────────────────────────

void UBridgeLoomVR::SetFoveatedRendering(bool bEnable, int32 QualityLevel)
{
	SetCVarBool(TEXT("r.VRS.Enable"), bEnable);
	if (bEnable)
	{
		IConsoleVariable* QualCVar = IConsoleManager::Get().FindConsoleVariable(TEXT("r.VRS.Quality"));
		if (QualCVar)
		{
			QualCVar->Set(FMath::Clamp(QualityLevel, 0, 4), ECVF_SetByGameSetting);
		}
	}
}

void UBridgeLoomVR::SetTargetFrameRate(int32 Hz)
{
	ComfortSettings.TargetFrameRate = Hz;
	if (Hz > 0)
	{
		GEngine->SetMaxFPS(static_cast<float>(Hz));
	}
}

// ── Spatial audio ─────────────────────────────────────────────────

void UBridgeLoomVR::SetSpatialAudioEnabled(bool bEnable)
{
	// Instruct the audio engine to use HRTF spatialization for all sounds
	// when bEnable is true. Uses the SPATIALIZATION_PLUGIN_CVAR if present.
	IConsoleVariable* CVar = IConsoleManager::Get().FindConsoleVariable(
		TEXT("au.SpatializationPlugin.Enable"));
	if (CVar)
	{
		CVar->Set(bEnable ? 1 : 0, ECVF_SetByGameSetting);
	}
}

// ── Helpers ───────────────────────────────────────────────────────

void UBridgeLoomVR::ApplyVignette(bool bEnable, float Strength)
{
	// Post-process vignette is driven via the camera manager's post-process settings
	UWorld* World = GetWorld();
	if (!World) { return; }

	APlayerController* PC = World->GetFirstPlayerController();
	if (!PC || !PC->PlayerCameraManager) { return; }

	// Patch the BlendableWeight of the comfort PP material via CameraManager override
	// (Material is expected to be assigned from project settings; strength via engine PP)
	FPostProcessSettings PPSettings;
	PPSettings.bOverride_VignetteIntensity = true;
	PPSettings.VignetteIntensity = bEnable ? FMath::Clamp(Strength, 0.0f, 1.0f) : 0.0f;
	PC->PlayerCameraManager->SetManualCameraFade(0.0f, FLinearColor::Black, false);
	// Note: full PP blend requires attaching a PPVolume; this sets the engine CVar path:
	SetCVarBool(TEXT("r.VR.Comfort.Vignette"), bEnable);
}

void UBridgeLoomVR::SetCVarBool(const TCHAR* CVarName, bool bEnable)
{
	IConsoleVariable* CVar = IConsoleManager::Get().FindConsoleVariable(CVarName);
	if (CVar)
	{
		CVar->Set(bEnable ? 1 : 0, ECVF_SetByGameSetting);
	}
}
