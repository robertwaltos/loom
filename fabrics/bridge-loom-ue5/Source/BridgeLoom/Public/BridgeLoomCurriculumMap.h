// Copyright Koydo. All Rights Reserved.
// BridgeLoomCurriculumMap.h — Curriculum Deep Map bridge from Bible v5 Part 12.
//
// Exposes the full academic-standards mapping to Blueprint:
//   - STEM alignment (15 worlds → NGSS + CCSS)
//   - Language Arts alignment (10 worlds → CCSS)
//   - Financial Literacy alignment (10 worlds → Jump$tart + C3)
//   - Cross-curricular highlights (8 entries)
//   - Age-range / grade-band mapping (K-2, 3-5, 6-8)

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomCurriculumMap.generated.h"

// ─── Enums ────────────────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomCurriculumDomain : uint8
{
    STEM                UMETA(DisplayName = "STEM"),
    LanguageArts        UMETA(DisplayName = "Language Arts"),
    FinancialLiteracy   UMETA(DisplayName = "Financial Literacy"),
};

UENUM(BlueprintType)
enum class ELoomAgeLabel : uint8
{
    Ages5to7    UMETA(DisplayName = "Ages 5-7 (K-2)"),
    Ages8to10   UMETA(DisplayName = "Ages 8-10 (3-5)"),
    Ages11to13  UMETA(DisplayName = "Ages 11-13 (6-8)"),
};

// ─── Structs ──────────────────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomGradeMapping
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    ELoomAgeLabel AgeLabel = ELoomAgeLabel::Ages8to10;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString GradeRange;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString CommonCoreBand;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString NgssGradeBand;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomSTEMAlignment
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString WorldId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString WorldName;

    // Primary Next Generation Science Standards code/description
    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString PrimaryNGSS;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString SecondaryStandards;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString SkillsDeveloped;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomLanguageArtsAlignment
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString WorldId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString WorldName;

    // Primary Common Core State Standards code/description
    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString PrimaryCCSS;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString SecondaryStandards;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString SkillsDeveloped;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomFinancialAlignment
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString WorldId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString WorldName;

    // Jump$tart Coalition + C3 Framework
    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString PrimaryStandards;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString Framework;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString SkillsDeveloped;
};

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomCrossCurricularHighlight
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString EntryName;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString WorldId;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString STEMStandard;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString LanguageArtsStandard;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FString SocialStudiesStandard;
};

// ─── Component ────────────────────────────────────────────────────

UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Curriculum Map Bridge")
class BRIDGELOOM_API UBridgeLoomCurriculumMap : public UActorComponent
{
    GENERATED_BODY()

public:

    UBridgeLoomCurriculumMap();

    virtual void BeginPlay() override;

    // ── Configuration (auto-populated from Bible v5 defaults) ─────

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Curriculum|STEM")
    TArray<FLoomSTEMAlignment> STEMAlignments;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Curriculum|LanguageArts")
    TArray<FLoomLanguageArtsAlignment> LanguageArtsAlignments;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Curriculum|Financial")
    TArray<FLoomFinancialAlignment> FinancialAlignments;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Curriculum|Cross")
    TArray<FLoomCrossCurricularHighlight> CrossCurricularHighlights;

    UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Curriculum")
    TArray<FLoomGradeMapping> GradeMappings;

    // ── Queries ───────────────────────────────────────────────────

    // Returns all standards aligned to a single world ID, across all domains
    UFUNCTION(BlueprintCallable, Category = "Curriculum")
    void GetAlignmentsForWorld(const FString& WorldId,
                               TArray<FLoomSTEMAlignment>& OutSTEM,
                               TArray<FLoomLanguageArtsAlignment>& OutLA,
                               TArray<FLoomFinancialAlignment>& OutFin) const;

    UFUNCTION(BlueprintCallable, Category = "Curriculum")
    bool GetSTEMAlignment(const FString& WorldId, FLoomSTEMAlignment& OutAlignment) const;

    UFUNCTION(BlueprintCallable, Category = "Curriculum")
    bool GetLanguageArtsAlignment(const FString& WorldId, FLoomLanguageArtsAlignment& OutAlignment) const;

    UFUNCTION(BlueprintCallable, Category = "Curriculum")
    bool GetFinancialAlignment(const FString& WorldId, FLoomFinancialAlignment& OutAlignment) const;

    UFUNCTION(BlueprintCallable, Category = "Curriculum")
    TArray<FLoomCrossCurricularHighlight> GetHighlightsForWorld(const FString& WorldId) const;

    UFUNCTION(BlueprintCallable, Category = "Curriculum")
    bool GetGradeMapping(ELoomAgeLabel AgeLabel, FLoomGradeMapping& OutMapping) const;

    // Returns all worlds aligned to a given domain
    UFUNCTION(BlueprintCallable, Category = "Curriculum")
    TArray<FString> GetWorldsForDomain(ELoomCurriculumDomain Domain) const;

private:

    void InitDefaultAlignments();
    void InitDefaultGradeMappings();
    void InitDefaultCrossHighlights();
};
