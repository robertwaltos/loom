// BridgeLoomRenderer.cpp — Full rendering pipeline implementation
// Thread: bridge/bridge-loom-ue5/renderer
// Tier: 2

#include "BridgeLoomRenderer.h"
#include "Engine/DirectionalLight.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/ExponentialHeightFogComponent.h"
#include "Kismet/GameplayStatics.h"

UBridgeLoomRenderer::UBridgeLoomRenderer()
{
    PrimaryComponentTick.bCanEverTick = true;
    PrimaryComponentTick.TickGroup = TG_PrePhysics;
    // Budget: entire Bridge Loom must be < 0.5ms
    PrimaryComponentTick.TickInterval = 0.0f;
}

void UBridgeLoomRenderer::BeginPlay()
{
    Super::BeginPlay();
    UpdateLODBias();
}

void UBridgeLoomRenderer::TickComponent(float DeltaTime, ELevelTick TickType,
                                         FActorComponentTickFunction* ThisTickFunction)
{
    Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

    const double StartTime = FPlatformTime::Seconds();

    // Interpolate rendering state smoothly
    ApplySunLight();
    ApplyFog();
    ApplyWind();

    const double EndTime = FPlatformTime::Seconds();
    FrameBudgetMs = static_cast<float>((EndTime - StartTime) * 1000.0);
}

void UBridgeLoomRenderer::ApplyTimeOfDay(const FLoomTimeOfDay& TimeOfDay)
{
    CurrentTimeOfDay = TimeOfDay;
}

void UBridgeLoomRenderer::ApplyWeather(const FLoomWeather& Weather)
{
    CurrentWeather = Weather;
}

void UBridgeLoomRenderer::SetQualityTier(ELoomQualityTier Tier)
{
    CurrentTier = Tier;
    UpdateLODBias();
}

void UBridgeLoomRenderer::UpdateEntityMaterial(
    const FString& EntityId,
    UMaterialInstanceDynamic* Material,
    float Health,
    float Energy,
    bool bIsHighlighted)
{
    if (!Material) return;

    Material->SetScalarParameterValue(TEXT("Health"), FMath::Clamp(Health, 0.0f, 1.0f));
    Material->SetScalarParameterValue(TEXT("Energy"), FMath::Clamp(Energy, 0.0f, 1.0f));
    Material->SetScalarParameterValue(TEXT("HighlightIntensity"), bIsHighlighted ? 1.0f : 0.0f);

    // Wetness from rain
    Material->SetScalarParameterValue(TEXT("Wetness"),
        FMath::Clamp(CurrentWeather.RainIntensity, 0.0f, 1.0f));

    // Snow accumulation
    Material->SetScalarParameterValue(TEXT("SnowAmount"),
        FMath::Clamp(CurrentWeather.SnowIntensity * 0.5f, 0.0f, 1.0f));
}

void UBridgeLoomRenderer::ApplySunLight()
{
    TArray<AActor*> Lights;
    UGameplayStatics::GetAllActorsOfClass(GetWorld(), ADirectionalLight::StaticClass(), Lights);

    for (AActor* Actor : Lights)
    {
        if (ADirectionalLight* Sun = Cast<ADirectionalLight>(Actor))
        {
            FRotator SunRotation(
                -CurrentTimeOfDay.SunAltitude,
                CurrentTimeOfDay.SunAzimuth,
                0.0f
            );
            Sun->SetActorRotation(SunRotation);

            if (UDirectionalLightComponent* LightComp = Sun->GetComponent<UDirectionalLightComponent>())
            {
                LightComp->SetIntensity(CurrentTimeOfDay.SunIntensity);
                LightComp->SetLightColor(CurrentTimeOfDay.SunColor);
            }
            break; // Only process primary sun
        }
    }
}

void UBridgeLoomRenderer::ApplyFog()
{
    TArray<AActor*> FogActors;
    UGameplayStatics::GetAllActorsWithTag(GetWorld(), TEXT("LoomFog"), FogActors);

    for (AActor* Actor : FogActors)
    {
        if (UExponentialHeightFogComponent* Fog =
            Actor->FindComponentByClass<UExponentialHeightFogComponent>())
        {
            Fog->SetFogDensity(CurrentTimeOfDay.FogDensity);
            Fog->SetFogInscatteringColor(CurrentTimeOfDay.FogColor);

            // Rain increases fog
            const float RainFogBoost = CurrentWeather.RainIntensity * 0.03f;
            Fog->SetFogDensity(CurrentTimeOfDay.FogDensity + RainFogBoost);
        }
    }
}

void UBridgeLoomRenderer::ApplyWind()
{
    // Wind Direction Source drives foliage, Niagara particles, cloth,
    // and Chaos destruction. The Loom Tempest system provides wind
    // data via the weather update; we forward it to UE5.

    const FVector WindDir = CurrentWeather.WindDirection.GetSafeNormal();
    const float WindSpeed = CurrentWeather.WindSpeed;

    if (WindSpeed <= KINDA_SMALL_NUMBER) return;

    // Apply via console variables (global wind for SpeedTree/foliage)
    if (GEngine)
    {
        // UE5 global wind: direction * speed in cm/s
        const FVector WindVelocity = WindDir * WindSpeed * 100.0f;
        FString Cmd = FString::Printf(
            TEXT("r.Wind.GlobalWindSpeed %f"), WindSpeed);
        GEngine->Exec(GetWorld(), *Cmd);
    }

    // Find Wind Directional Source actors and update them
    TArray<AActor*> WindSources;
    UGameplayStatics::GetAllActorsWithTag(
        GetWorld(), TEXT("LoomWind"), WindSources);

    for (AActor* Actor : WindSources)
    {
        // Rotate the wind source to match Loom wind direction
        const FRotator WindRot = WindDir.Rotation();
        Actor->SetActorRotation(WindRot);
    }
}

void UBridgeLoomRenderer::UpdateLODBias()
{
    int32 LODBias = 0;
    switch (CurrentTier)
    {
    case ELoomQualityTier::Ultra:  LODBias = -1; break;
    case ELoomQualityTier::High:   LODBias = 0;  break;
    case ELoomQualityTier::Medium: LODBias = 1;  break;
    case ELoomQualityTier::Low:    LODBias = 2;  break;
    case ELoomQualityTier::Mobile: LODBias = 3;  break;
    }

    // Apply global LOD bias via console variable
    if (GEngine)
    {
        FString Command = FString::Printf(TEXT("r.ForceLOD %d"), LODBias);
        GEngine->Exec(GetWorld(), *Command);
    }
}
