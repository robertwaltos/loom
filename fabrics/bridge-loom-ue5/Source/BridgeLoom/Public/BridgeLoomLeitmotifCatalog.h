// Copyright Koydo. All Rights Reserved.
// BridgeLoomLeitmotifCatalog.h — Character Leitmotif Catalog bridge from Bible v5 Part 15.
//
// Every character has a 4–8 bar musical identity.
// On first appearance in a session, PlayMotif() fires the async-loaded USoundBase.
// Compass has an adaptive motif that follows her current mode.
//
// Constants (match leitmotif-catalog.ts exactly):
//   MOTIF_BAR_MIN = 4
//   MOTIF_BAR_MAX = 8
//   TOTAL_LEITMOTIFS = 50

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Sound/SoundBase.h"
#include "BridgeLoomLeitmotifCatalog.generated.h"

// ─── Structs ──────────────────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomLeitmotifDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString CharacterId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString CharacterName;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString MusicalKey;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Tempo;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString LeadInstrument;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Mood;

    // Soft reference — populated in editor or at runtime via asset registry
    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TSoftObjectPtr<USoundBase> MotifSound;
};

// Compass has one adaptive entry per mode
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomCompassMotifMode
{
    GENERATED_BODY()

    // Matches ELoomCompassMode from BridgeLoomVisitorCharacters.h
    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Mode;   // "orienting" | "celebrating" | "challenge" | "quiet"

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TSoftObjectPtr<USoundBase> MotifSound;
};

// ─── Component ────────────────────────────────────────────────────

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnLeitmotifStarted,
    const FString&, CharacterId, const FString&, CharacterName);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnLeitmotifStopped,
    const FString&, CharacterId);

UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Leitmotif Catalog Bridge")
class BRIDGELOOM_API UBridgeLoomLeitmotifCatalog : public UActorComponent
{
    GENERATED_BODY()

public:

    UBridgeLoomLeitmotifCatalog();

    virtual void BeginPlay() override;

    // ── Configuration ─────────────────────────────────────────────

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Leitmotif")
    TArray<FLoomLeitmotifDefinition> Leitmotifs;

    // Compass adaptive motifs, one per mode
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Leitmotif")
    TArray<FLoomCompassMotifMode> CompassMotifModes;

    // Volume scalar applied to every motif playback [0..1]
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Leitmotif")
    float GlobalMotifVolume = 0.8f;

    // Bars min/max (from leitmotif-catalog.ts constants)
    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Leitmotif")
    int32 MotifBarMin = 4;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Leitmotif")
    int32 MotifBarMax = 8;

    // ── Delegates ─────────────────────────────────────────────────

    UPROPERTY(BlueprintAssignable, Category = "Leitmotif|Events")
    FOnLeitmotifStarted OnLeitmotifStarted;

    UPROPERTY(BlueprintAssignable, Category = "Leitmotif|Events")
    FOnLeitmotifStopped OnLeitmotifStopped;

    // ── Methods ───────────────────────────────────────────────────

    // Play a character's leitmotif. Async-loads sound then calls PlaySound2D.
    UFUNCTION(BlueprintCallable, Category = "Leitmotif")
    void PlayMotif(const FString& CharacterId);

    // Play Compass's adaptive motif for the given mode ("orienting" etc.)
    UFUNCTION(BlueprintCallable, Category = "Leitmotif")
    void PlayCompassMotif(const FString& Mode);

    // Stop a currently playing motif (via active UAudioComponent)
    UFUNCTION(BlueprintCallable, Category = "Leitmotif")
    void StopMotif(const FString& CharacterId);

    // Stop all active motifs
    UFUNCTION(BlueprintCallable, Category = "Leitmotif")
    void StopAllMotifs();

    UFUNCTION(BlueprintCallable, Category = "Leitmotif")
    bool GetLeitmotifByCharacterId(const FString& CharacterId,
                                   FLoomLeitmotifDefinition& OutDef) const;

    UFUNCTION(BlueprintPure, Category = "Leitmotif")
    bool IsMotifPlaying(const FString& CharacterId) const;

private:

    void InitDefaultLeitmotifs();

    // CharacterId → active UAudioComponent (may be recycled)
    TMap<FString, TWeakObjectPtr<UAudioComponent>> ActiveMotifs;
};
