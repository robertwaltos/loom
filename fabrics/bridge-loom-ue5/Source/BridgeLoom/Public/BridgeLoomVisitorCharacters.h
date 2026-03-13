// Copyright Koydo. All Rights Reserved.
// BridgeLoomVisitorCharacters.h — Visitor Characters & Legendary Figures bridge from Bible v5 Part 13.
//
// Three categories of cross-world characters:
//   - The Compass (universal guide, 4 adaptive modes + a secret)
//   - 9 Recurring Visitors (themed travelers, world-specific triggers)
//   - 12 Legendary Figures (Historical, appear once then become ambient)
//
// Constants (match visitor-characters.ts exactly):
//   TOTAL_RECURRING_VISITORS = 9
//   TOTAL_LEGENDARY_FIGURES  = 12
//   COMPASS_MODE_COUNT       = 4

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "GameFramework/Actor.h"
#include "BridgeLoomVisitorCharacters.generated.h"

// ─── Enums ────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomCompassMode : uint8
{
    Orienting   UMETA(DisplayName = "Orienting"),
    Celebrating UMETA(DisplayName = "Celebrating"),
    Challenge   UMETA(DisplayName = "Challenge"),
    Quiet       UMETA(DisplayName = "Quiet"),
};

UENUM(BlueprintType)
enum class ELoomVisitorCategory : uint8
{
    Compass     UMETA(DisplayName = "Compass"),
    Recurring   UMETA(DisplayName = "Recurring Visitor"),
    Legendary   UMETA(DisplayName = "Legendary Figure"),
};

UENUM(BlueprintType)
enum class ELoomLegendaryVisibility : uint8
{
    FirstVisit  UMETA(DisplayName = "First Visit (active)"),
    Ambient     UMETA(DisplayName = "Ambient (background)"),
};

// ─── Structs ──────────────────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomCompassModeDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    ELoomCompassMode Mode = ELoomCompassMode::Quiet;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Trigger;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Behavior;

    // Optional MetaHuman animation montage tag for this mode
    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString AnimationTag;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomCompassDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Description;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Secret;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TArray<FLoomCompassModeDefinition> Modes;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TSoftClassPtr<AActor> CompassActorClass;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomRecurringVisitorDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString CharacterId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Name;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Title;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Description;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString AppearsTrigger;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString SignatureLine;

    // Worlds this visitor can appear in
    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TArray<FString> WorldIds;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TSoftClassPtr<AActor> VisitorActorClass;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomLegendaryFigureDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString CharacterId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Name;

    // The single world this figure is bound to
    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString WorldId;

    // Description of their silent/ambient behavior when first seen
    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Behavior;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TSoftClassPtr<AActor> FigureActorClass;
};

// Per-Kindler visitor state
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomKindlerVisitorState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    FString KindlerId;

    UPROPERTY(BlueprintReadOnly)
    TSet<FString> SeenLegendaryIds;

    UPROPERTY(BlueprintReadOnly)
    TSet<FString> MetRecurringIds;

    UPROPERTY(BlueprintReadOnly)
    int64 LastVisitMs = 0;

    UPROPERTY(BlueprintReadOnly)
    FString CurrentWorldId;

    UPROPERTY(BlueprintReadOnly)
    bool bIsLost = false;

    UPROPERTY(BlueprintReadOnly)
    bool bRecentDiscovery = false;

    UPROPERTY(BlueprintReadOnly)
    bool bIsInForgettingWell = false;

    UPROPERTY(BlueprintReadOnly)
    int32 SparkLevel = 0;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomCompassModeResult
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    ELoomCompassMode Mode = ELoomCompassMode::Quiet;

    UPROPERTY(BlueprintReadOnly)
    FString Reason;
};

// ─── Delegates ────────────────────────────────────────────────────

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnCompassModeChanged,
    const FString&, KindlerId, ELoomCompassMode, NewMode);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FOnVisitorAppeared,
    const FString&, CharacterId, const FString&, WorldId, ELoomVisitorCategory, Category);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnVisitorDeparted,
    const FString&, CharacterId, const FString&, WorldId);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnLegendaryFirstSeen,
    const FString&, KindlerId, const FString&, CharacterId);

// ─── Component ────────────────────────────────────────────────────

UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Visitor Characters Bridge")
class BRIDGELOOM_API UBridgeLoomVisitorCharacters : public UActorComponent
{
    GENERATED_BODY()

public:

    UBridgeLoomVisitorCharacters();

    virtual void BeginPlay() override;

    // ── Configuration ─────────────────────────────────────────────

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Visitors")
    FLoomCompassDefinition CompassDef;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Visitors")
    TArray<FLoomRecurringVisitorDefinition> RecurringVisitors;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Visitors")
    TArray<FLoomLegendaryFigureDefinition> LegendaryFigures;

    // Time after which Compass switches to Orienting mode (ms, default 7 days)
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Visitors")
    int64 AbsenceThresholdMs = 7LL * 24 * 60 * 60 * 1000;

    // ── Delegates ─────────────────────────────────────────────────

    UPROPERTY(BlueprintAssignable, Category = "Visitors|Events")
    FOnCompassModeChanged OnCompassModeChanged;

    UPROPERTY(BlueprintAssignable, Category = "Visitors|Events")
    FOnVisitorAppeared OnVisitorAppeared;

    UPROPERTY(BlueprintAssignable, Category = "Visitors|Events")
    FOnVisitorDeparted OnVisitorDeparted;

    UPROPERTY(BlueprintAssignable, Category = "Visitors|Events")
    FOnLegendaryFirstSeen OnLegendaryFirstSeen;

    // ── Compass ───────────────────────────────────────────────────

    // Evaluate and return the correct Compass mode for a Kindler's current state
    UFUNCTION(BlueprintCallable, Category = "Visitors")
    FLoomCompassModeResult ResolveCompassMode(const FLoomKindlerVisitorState& State);

    // ── Spawning & Tracking ───────────────────────────────────────

    // Spawn (or already-present) a recurring visitor in the current world
    UFUNCTION(BlueprintCallable, Category = "Visitors")
    void SpawnRecurringVisitor(const FString& KindlerId, const FString& CharacterId,
                               const FString& WorldId);

    // Spawn a legendary figure for a first-visit encounter
    UFUNCTION(BlueprintCallable, Category = "Visitors")
    void SpawnLegendaryFigure(const FString& KindlerId, const FString& CharacterId);

    // Dismiss/despawn a visitor from the scene
    UFUNCTION(BlueprintCallable, Category = "Visitors")
    void DespawnVisitor(const FString& CharacterId);

    // Record that a Kindler entered a world; auto-evaluates which visitors appear
    UFUNCTION(BlueprintCallable, Category = "Visitors")
    void OnKindlerEnteredWorld(const FString& KindlerId, const FString& WorldId,
                               FLoomKindlerVisitorState& InOutState);

    // ── Queries ───────────────────────────────────────────────────

    UFUNCTION(BlueprintCallable, Category = "Visitors")
    TArray<FLoomRecurringVisitorDefinition> GetVisitorsForWorld(const FString& WorldId) const;

    UFUNCTION(BlueprintCallable, Category = "Visitors")
    bool GetRecurringVisitorById(const FString& CharacterId,
                                  FLoomRecurringVisitorDefinition& OutDef) const;

    UFUNCTION(BlueprintCallable, Category = "Visitors")
    bool GetLegendaryFigureById(const FString& CharacterId,
                                 FLoomLegendaryFigureDefinition& OutDef) const;

    UFUNCTION(BlueprintPure, Category = "Visitors")
    bool IsLegendaryFirstVisit(const FString& CharacterId,
                                const FLoomKindlerVisitorState& State) const;

private:

    // CharacterId → spawned actor
    TMap<FString, TWeakObjectPtr<AActor>> SpawnedVisitors;

    void InitDefaultVisitors();
};
