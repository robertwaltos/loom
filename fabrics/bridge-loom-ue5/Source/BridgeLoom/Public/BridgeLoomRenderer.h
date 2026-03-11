// BridgeLoomRenderer.h — Full UE5 rendering pipeline integration
// Manages material instances, LOD, lighting, and post-process from Loom state
// Thread: bridge/bridge-loom-ue5/renderer
// Tier: 2

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "BridgeLoomRenderer.generated.h"

// Time-of-day parameters pushed from Loom world state
USTRUCT(BlueprintType)
struct FLoomTimeOfDay
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float SunAltitude = 45.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float SunAzimuth = 180.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FLinearColor SunColor = FLinearColor(1.0f, 0.95f, 0.8f);

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float SunIntensity = 10.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float FogDensity = 0.02f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FLinearColor FogColor = FLinearColor(0.5f, 0.6f, 0.7f);

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float CloudCoverage = 0.3f;
};

// Weather parameters from Loom Tempest system
USTRUCT(BlueprintType)
struct FLoomWeather
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float RainIntensity = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float SnowIntensity = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float WindSpeed = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    FVector WindDirection = FVector(1, 0, 0);

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float Temperature = 20.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float Humidity = 0.5f;
};

// LOD bias from Loom based on device capability tier
UENUM(BlueprintType)
enum class ELoomQualityTier : uint8
{
    Ultra   UMETA(DisplayName = "Ultra"),
    High    UMETA(DisplayName = "High"),
    Medium  UMETA(DisplayName = "Medium"),
    Low     UMETA(DisplayName = "Low"),
    Mobile  UMETA(DisplayName = "Mobile")
};

/**
 * UBridgeLoomRenderer — Actor component that receives render state
 * from the Loom Bridge and applies it to UE5 rendering systems.
 * Attached to the world manager actor in each level.
 */
UCLASS(ClassGroup=(BridgeLoom), meta=(BlueprintSpawnableComponent))
class BRIDGELOOM_API UBridgeLoomRenderer : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomRenderer();

    // Apply time-of-day from Loom world clock
    UFUNCTION(BlueprintCallable, Category = "BridgeLoom|Render")
    void ApplyTimeOfDay(const FLoomTimeOfDay& TimeOfDay);

    // Apply weather effects from Loom Tempest fabric
    UFUNCTION(BlueprintCallable, Category = "BridgeLoom|Render")
    void ApplyWeather(const FLoomWeather& Weather);

    // Set quality tier (from Loom device detection)
    UFUNCTION(BlueprintCallable, Category = "BridgeLoom|Render")
    void SetQualityTier(ELoomQualityTier Tier);

    // Update entity material parameters from Loom component state
    UFUNCTION(BlueprintCallable, Category = "BridgeLoom|Render")
    void UpdateEntityMaterial(const FString& EntityId, UMaterialInstanceDynamic* Material,
                              float Health, float Energy, bool bIsHighlighted);

    // Get current frame budget usage in milliseconds
    UFUNCTION(BlueprintPure, Category = "BridgeLoom|Render")
    float GetFrameBudgetMs() const { return FrameBudgetMs; }

protected:
    virtual void BeginPlay() override;
    virtual void TickComponent(float DeltaTime, ELevelTick TickType,
                               FActorComponentTickFunction* ThisTickFunction) override;

private:
    // Current state
    FLoomTimeOfDay CurrentTimeOfDay;
    FLoomWeather CurrentWeather;
    ELoomQualityTier CurrentTier = ELoomQualityTier::High;

    // Performance tracking — must stay < 0.5ms per tick
    float FrameBudgetMs = 0.0f;

    // Internal helpers
    void ApplySunLight();
    void ApplyFog();
    void ApplyWind();
    void UpdateLODBias();
};
