// Copyright Project Loom. All Rights Reserved.

#include "BridgeLoomLumen.h"
#include "Engine/DirectionalLight.h"
#include "Engine/SkyLight.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/SkyLightComponent.h"
#include "Components/VolumetricCloudComponent.h"
#include "Components/SkyAtmosphereComponent.h"
#include "Components/ExponentialHeightFogComponent.h"
#include "Atmosphere/AtmosphericFogComponent.h"
#include "Kismet/GameplayStatics.h"
#include "GameFramework/Actor.h"
#include "Engine/World.h"
#include "HAL/IConsoleManager.h"
#include "Math/UnrealMathUtility.h"

UBridgeLoomLumen::UBridgeLoomLumen()
{
	PrimaryComponentTick.bCanEverTick = true;
}

void UBridgeLoomLumen::BeginPlay()
{
	Super::BeginPlay();
	FindSceneActors();
	LastBroadcastPeriod = GameHourToTimeOfDay(StartGameHour);
	SetTimeOfDay(StartGameHour);
}

void UBridgeLoomLumen::TickComponent(float DeltaTime, ELevelTick TickType,
	FActorComponentTickFunction* ThisTickFunction)
{
	Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

	// Advance game time: TimeScaleMinutesPerSecond real seconds → 1 game minute
	// e.g. 24.0 mins/sec → 1440 game-mins per real minute → 24 game-hours per real hour
	const float GameMinutesDelta = DeltaTime * TimeScaleMinutesPerSecond;
	const float GameHoursDelta   = GameMinutesDelta / 60.0f;

	CurrentSkyState.GameHour += GameHoursDelta;
	if (CurrentSkyState.GameHour >= 24.0f)
	{
		CurrentSkyState.GameHour -= 24.0f;
	}

	ApplySkyState();

	// Broadcast on period transition
	const ELoomTimeOfDay NewPeriod = GameHourToTimeOfDay(CurrentSkyState.GameHour);
	if (NewPeriod != LastBroadcastPeriod)
	{
		LastBroadcastPeriod = NewPeriod;
		OnDayNightTransition.Broadcast(NewPeriod, CurrentSkyState.GameHour);
	}
}

// ── Time of day ───────────────────────────────────────────────────

void UBridgeLoomLumen::SetTimeOfDay(float GameHour)
{
	CurrentSkyState.GameHour = FMath::Fmod(GameHour, 24.0f);
	if (CurrentSkyState.GameHour < 0.0f)
	{
		CurrentSkyState.GameHour += 24.0f;
	}
	CurrentSkyState.TimeOfDay = GameHourToTimeOfDay(CurrentSkyState.GameHour);
	LastBroadcastPeriod       = CurrentSkyState.TimeOfDay;
	ApplySkyState();
}

FLoomSkyState UBridgeLoomLumen::GetCurrentSkyState() const
{
	return CurrentSkyState;
}

// ── Weather ───────────────────────────────────────────────────────

void UBridgeLoomLumen::SetWeatherClouds(float Coverage, float Density)
{
	CurrentSkyState.CloudCoverage = FMath::Clamp(Coverage, 0.0f, 1.0f);
	CurrentSkyState.CloudDensity  = FMath::Clamp(Density, 0.0f, 1.0f);
	UpdateCloudParameters(CurrentSkyState.CloudCoverage, CurrentSkyState.CloudDensity);
}

// ── Lumen CVars ───────────────────────────────────────────────────

void UBridgeLoomLumen::EnableLumenGI(bool bEnable)
{
	SetCVar(TEXT("r.Lumen.DiffuseIndirect.Allow"), bEnable ? 1 : 0);
}

void UBridgeLoomLumen::EnableLumenReflections(bool bEnable)
{
	SetCVar(TEXT("r.Lumen.Reflections.Allow"), bEnable ? 1 : 0);
}

void UBridgeLoomLumen::EnableRayTracing(bool bEnable)
{
	SetCVar(TEXT("r.RayTracing.Enable"), bEnable ? 1 : 0);
}

// ── Scene actor discovery ─────────────────────────────────────────

void UBridgeLoomLumen::FindSceneActors()
{
	UWorld* World = GetWorld();
	if (!World) { return; }

	TArray<AActor*> Found;

	UGameplayStatics::GetAllActorsWithTag(World, TEXT("LoomSun"), Found);
	if (Found.Num() > 0) { CachedSunActor = Found[0]; }
	Found.Reset();

	UGameplayStatics::GetAllActorsWithTag(World, TEXT("LoomSkyLight"), Found);
	if (Found.Num() > 0) { CachedSkyLightActor = Found[0]; }
	Found.Reset();

	UGameplayStatics::GetAllActorsWithTag(World, TEXT("LoomAtmosphere"), Found);
	if (Found.Num() > 0) { CachedAtmosphereActor = Found[0]; }
	Found.Reset();

	UGameplayStatics::GetAllActorsWithTag(World, TEXT("LoomClouds"), Found);
	if (Found.Num() > 0) { CachedCloudActor = Found[0]; }
}

// ── Internal sky application ──────────────────────────────────────

void UBridgeLoomLumen::ApplySkyState()
{
	const float Hour = CurrentSkyState.GameHour;
	CurrentSkyState.TimeOfDay = GameHourToTimeOfDay(Hour);

	UpdateSunRotation(Hour);
	UpdateAtmosphereTint(Hour);
	UpdateStarMap(Hour);
}

void UBridgeLoomLumen::UpdateSunRotation(float GameHour)
{
	// Map 0-24 hours to -270 to 90 pitch (sun at horizon at 6h and 18h)
	// At noon (12h) pitch = -90 → sun overhead (UE convention: pitch rotates around Y)
	const float NormalizedHour = GameHour / 24.0f; // 0-1
	const float SunPitch = -90.0f + (NormalizedHour * 360.0f); // Full rotation
	const FRotator SunRotation(SunPitch, 45.0f, 0.0f);

	CurrentSkyState.SunRotation = SunRotation;

	// Intensity: full at noon, dim at dawn/dusk, zero at night
	const float DayFraction = FMath::Clamp(
		1.0f - FMath::Abs((GameHour - 12.0f) / 12.0f), 0.0f, 1.0f);
	const float CurveValue = FMath::Pow(DayFraction, 0.6f); // brightens nonlinearly
	CurrentSkyState.SunIntensityLux = FMath::Lerp(0.0f, 130000.0f, CurveValue);

	if (CachedSunActor.IsValid())
	{
		UDirectionalLightComponent* DL =
			CachedSunActor->FindComponentByClass<UDirectionalLightComponent>();
		if (DL)
		{
			CachedSunActor->SetActorRotation(SunRotation);
			DL->SetIntensity(CurrentSkyState.SunIntensityLux);
		}
	}
}

void UBridgeLoomLumen::UpdateAtmosphereTint(float GameHour)
{
	// Dawn/Dusk: warm orange tint; Noon: white; Night: deep blue
	FLinearColor SkyTint = FLinearColor::White;
	if (GameHour < 6.0f || GameHour > 19.0f)
	{
		// Night
		SkyTint = FLinearColor(0.05f, 0.07f, 0.2f);
	}
	else if (GameHour < 8.0f)
	{
		// Dawn transition
		const float T = FMath::Clamp((GameHour - 6.0f) / 2.0f, 0.0f, 1.0f);
		SkyTint = FLinearColor::LerpUsingHSV(FLinearColor(1.0f, 0.4f, 0.1f), FLinearColor::White, T);
	}
	else if (GameHour > 17.0f)
	{
		// Dusk transition
		const float T = FMath::Clamp((GameHour - 17.0f) / 2.0f, 0.0f, 1.0f);
		SkyTint = FLinearColor::LerpUsingHSV(FLinearColor::White, FLinearColor(1.0f, 0.3f, 0.05f), T);
	}

	if (CachedSkyLightActor.IsValid())
	{
		USkyLightComponent* SLC = CachedSkyLightActor->FindComponentByClass<USkyLightComponent>();
		if (SLC)
		{
			SLC->SetLightColor(SkyTint);
		}
	}
}

void UBridgeLoomLumen::UpdateCloudParameters(float Coverage, float Density)
{
	if (!CachedCloudActor.IsValid()) { return; }

	UVolumetricCloudComponent* VC =
		CachedCloudActor->FindComponentByClass<UVolumetricCloudComponent>();
	if (!VC) { return; }

	// Map Density to layer thickness (0 → 0.5 km, 1 → 4 km)
	VC->SetLayerBottomAltitudeKm(3.0f);
	VC->SetLayerHeightKm(FMath::Lerp(0.5f, 4.0f, Density));

	// Cloud Coverage drives sky-light lit toggle 
	SetCVar(TEXT("r.VolumetricCloud.SkyLightLit"), (Coverage > 0.05f) ? 1 : 0);
}

void UBridgeLoomLumen::UpdateStarMap(float GameHour)
{
	// Stars fully visible at midnight, fade out around dawn/dusk
	float StarAlpha = 0.0f;
	if (GameHour < 5.5f || GameHour > 20.0f)
	{
		StarAlpha = 1.0f;
	}
	else if (GameHour < 7.0f)
	{
		StarAlpha = 1.0f - FMath::Clamp((GameHour - 5.5f) / 1.5f, 0.0f, 1.0f);
	}
	else if (GameHour > 18.0f)
	{
		StarAlpha = FMath::Clamp((GameHour - 18.0f) / 2.0f, 0.0f, 1.0f);
	}
	CurrentSkyState.StarMapAlpha = StarAlpha;
}

ELoomTimeOfDay UBridgeLoomLumen::GameHourToTimeOfDay(float Hour) const
{
	if (Hour < 1.0f)  return ELoomTimeOfDay::Midnight;
	if (Hour < 5.0f)  return ELoomTimeOfDay::PreDawn;
	if (Hour < 7.0f)  return ELoomTimeOfDay::Dawn;
	if (Hour < 10.0f) return ELoomTimeOfDay::Morning;
	if (Hour < 14.0f) return ELoomTimeOfDay::Noon;
	if (Hour < 17.0f) return ELoomTimeOfDay::Afternoon;
	if (Hour < 19.0f) return ELoomTimeOfDay::Dusk;
	if (Hour < 22.0f) return ELoomTimeOfDay::Evening;
	return ELoomTimeOfDay::Night;
}

void UBridgeLoomLumen::SetCVar(const TCHAR* CVarName, int32 Value)
{
	IConsoleVariable* CVar = IConsoleManager::Get().FindConsoleVariable(CVarName);
	if (CVar)
	{
		CVar->Set(Value, ECVF_SetByGameSetting);
	}
}
