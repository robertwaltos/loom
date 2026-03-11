// Copyright Project Loom. All Rights Reserved.
// Thread: bridge/bridge-loom-ue5/metahuman
// Tier: 1
//
// MetaHuman integration for Tier 3/4 NPCs and player avatars.
//
// UE 5.5 MetaHuman pipeline:
//   1. MetaHuman Creator generates character presets
//   2. RigLogic drives skeletal deformation from blend shapes
//   3. Groom system handles strand-based hair/beard/eyebrows
//   4. Live Link or direct blend shape application for facial animation
//   5. MetaHuman Animator for performance capture (offline only)
//
// The Loom drives facial animation via:
//   - FacialPose FlatBuffer messages (52 ARKit blend shapes)
//   - Emotion tags from NPC AI → blend shape target presets
//   - Speech visemes from TTS → automatic lip sync
//
// Budget: MetaHuman characters are expensive. Limit to Tier 3/4 NPCs
// within close range. Beyond 20m, swap to optimized skeletal mesh.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "GameplayTagContainer.h"
#include "BridgeLoomMetaHuman.generated.h"

// ── Emotion Preset ──────────────────────────────────────────────

UENUM(BlueprintType)
enum class ELoomEmotion : uint8
{
	Neutral     UMETA(DisplayName = "Neutral"),
	Happy       UMETA(DisplayName = "Happy"),
	Sad         UMETA(DisplayName = "Sad"),
	Angry       UMETA(DisplayName = "Angry"),
	Surprised   UMETA(DisplayName = "Surprised"),
	Fearful     UMETA(DisplayName = "Fearful"),
	Disgusted   UMETA(DisplayName = "Disgusted"),
	Contempt    UMETA(DisplayName = "Contempt"),
	Curious     UMETA(DisplayName = "Curious"),
	Stern       UMETA(DisplayName = "Stern"),
	Pleading    UMETA(DisplayName = "Pleading"),
	Suspicious  UMETA(DisplayName = "Suspicious"),
};

// ── Facial Pose Data ────────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomFacialPose
{
	GENERATED_BODY()

	// ARKit 52 blend shapes mapped by name → weight (0-1)
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Face")
	TMap<FName, float> BlendShapes;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Face")
	ELoomEmotion Emotion = ELoomEmotion::Neutral;

	// Lip sync from Loom TTS pipeline
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Face")
	FName CurrentViseme = NAME_None;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Face")
	float SpeechAmplitude = 0.0f;

	// Eye gaze target in world space (optional)
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Face")
	FVector GazeTarget = FVector::ZeroVector;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|Face")
	bool bHasGazeTarget = false;
};

// ── MetaHuman Config ────────────────────────────────────────────

USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomMetaHumanConfig
{
	GENERATED_BODY()

	/** MetaHuman preset name from MetaHuman Creator */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|MetaHuman")
	FString PresetName;

	/** Distance beyond which we swap to low-poly mesh (cm) */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|MetaHuman")
	float LODSwapDistance = 2000.0f;

	/** Whether this character uses strand-based hair (Groom) */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|MetaHuman")
	bool bUseGroomHair = true;

	/** Whether to enable RigLogic runtime deformation */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|MetaHuman")
	bool bEnableRigLogic = true;

	/** NPC tier — determines animation quality budget */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|MetaHuman")
	int32 NPCTier = 3;

	/** Gameplay tags identifying this character's archetype */
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|MetaHuman")
	FGameplayTagContainer ArchetypeTags;
};

// ── LOD Level ───────────────────────────────────────────────────

UENUM(BlueprintType)
enum class EMetaHumanLOD : uint8
{
	/** Full MetaHuman: RigLogic + Groom hair + cloth + full blend shapes */
	Full        UMETA(DisplayName = "Full Quality"),
	/** Reduced: baked hair cards, simplified cloth, reduced blend shapes */
	Medium      UMETA(DisplayName = "Medium"),
	/** Low: static mesh swap, basic animation, no facial */
	Low         UMETA(DisplayName = "Low"),
	/** Crowd: Mass Entity representation, no individual mesh */
	Crowd       UMETA(DisplayName = "Crowd / Mass Entity"),
};

/**
 * UBridgeLoomMetaHuman
 *
 * ActorComponent that drives MetaHuman facial animation, LOD management,
 * and Groom hair from Loom server data.
 *
 * Attach to any Actor with a SkeletalMeshComponent using a MetaHuman
 * skeleton. The component will:
 *   1. Apply facial blend shapes from FLoomFacialPose
 *   2. Drive emotion presets → blend shape targets
 *   3. Handle lip sync from Loom TTS viseme stream
 *   4. Manage LOD transitions based on camera distance
 *   5. Control Groom component visibility per LOD
 *
 * MetaHuman Creator (UE 5.5):
 *   - Characters are created in the cloud tool and imported as plugins
 *   - Each character = GameFeature Plugin containing skeleton + groom + materials
 *   - RigLogic provides the deformation rig (DNA file per character)
 *
 * Performance budget per MetaHuman:
 *   - Full quality: ~2ms GPU at 1080p (limit 5 on screen)
 *   - Medium: ~0.5ms GPU (limit 20)
 *   - Low: ~0.1ms GPU (limit 100)
 *   - Crowd: handled by Mass Entity (<0.01ms each, unlimited)
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent))
class BRIDGELOOM_API UBridgeLoomMetaHuman : public UActorComponent
{
	GENERATED_BODY()

public:
	UBridgeLoomMetaHuman();

	virtual void BeginPlay() override;
	virtual void TickComponent(float DeltaTime, ELevelTick TickType,
		FActorComponentTickFunction* ThisTickFunction) override;

	// ─── Configuration ──────────────────────────────────────────

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|MetaHuman")
	FLoomMetaHumanConfig Config;

	// ─── Facial Animation ───────────────────────────────────────

	/** Apply a facial pose received from the Loom server. */
	UFUNCTION(BlueprintCallable, Category = "Loom|MetaHuman")
	void ApplyFacialPose(const FLoomFacialPose& Pose);

	/** Set emotion which maps to blend shape presets. */
	UFUNCTION(BlueprintCallable, Category = "Loom|MetaHuman")
	void SetEmotion(ELoomEmotion NewEmotion);

	/** Set speech viseme for lip sync. */
	UFUNCTION(BlueprintCallable, Category = "Loom|MetaHuman")
	void SetViseme(FName VisemeName, float Amplitude);

	/** Set gaze target for eye tracking. */
	UFUNCTION(BlueprintCallable, Category = "Loom|MetaHuman")
	void SetGazeTarget(FVector WorldTarget);

	/** Clear gaze target (return to forward look). */
	UFUNCTION(BlueprintCallable, Category = "Loom|MetaHuman")
	void ClearGazeTarget();

	// ─── LOD ────────────────────────────────────────────────────

	/** Get current MetaHuman LOD level. */
	UFUNCTION(BlueprintPure, Category = "Loom|MetaHuman")
	EMetaHumanLOD GetCurrentLOD() const { return CurrentLOD; }

	/** Force a specific LOD level (overrides distance-based). */
	UFUNCTION(BlueprintCallable, Category = "Loom|MetaHuman")
	void ForceLOD(EMetaHumanLOD LODLevel);

	/** Clear forced LOD, return to distance-based. */
	UFUNCTION(BlueprintCallable, Category = "Loom|MetaHuman")
	void ClearForcedLOD();

	// ─── Query ──────────────────────────────────────────────────

	/** Whether this character is currently speaking (has active viseme). */
	UFUNCTION(BlueprintPure, Category = "Loom|MetaHuman")
	bool IsSpeaking() const { return bIsSpeaking; }

	/** Get the entity ID this MetaHuman represents. */
	UFUNCTION(BlueprintPure, Category = "Loom|MetaHuman")
	FString GetEntityId() const { return EntityId; }

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Loom|MetaHuman")
	FString EntityId;

protected:
	void UpdateLOD(float DistanceToCamera);
	void ApplyBlendShapes(const TMap<FName, float>& Shapes);
	void ApplyEmotionPreset(ELoomEmotion Emotion, float BlendAlpha);
	void UpdateGaze(float DeltaTime);
	void TransitionLOD(EMetaHumanLOD NewLOD);

private:
	// Cached component references
	UPROPERTY()
	TObjectPtr<USkeletalMeshComponent> FaceMesh;

	// State
	EMetaHumanLOD CurrentLOD = EMetaHumanLOD::Full;
	ELoomEmotion CurrentEmotion = ELoomEmotion::Neutral;
	ELoomEmotion TargetEmotion = ELoomEmotion::Neutral;
	float EmotionBlendAlpha = 1.0f;
	bool bIsSpeaking = false;
	bool bForcedLOD = false;
	FVector CurrentGazeTarget = FVector::ZeroVector;
	bool bHasGazeTarget = false;

	// ARKit blend shape name → morph target name mapping
	static const TMap<FName, FName>& GetARKitToMorphTargetMap();

	// Emotion → blend shape preset mapping
	static const TMap<FName, float>& GetEmotionPreset(ELoomEmotion Emotion);
};
