// Copyright Koydo. All Rights Reserved.
// BridgeLoomMiniGames.h — UE5 bridge for the Bible v5 World Mini-Games Registry.
//
// Each of the 50+ Loom worlds has a signature mini-game that teaches its core
// concept through play. All games are repeatable, support 5 difficulty tiers,
// and award 3–8 Spark per successful run.
//
// UE5 side responsibilities:
//  - Session lifecycle: StartGame / CompleteGame / AbortGame
//  - Camera handoff to the mini-game actor's camera
//  - Input context swap (push LoomMiniGame context onto the input stack)
//  - High-score and difficulty tracking in persistent kindler state
//  - Luminance award relay to BridgeLoomKindlerProgression (via delegate)
//
// Actor tags used: LoomMiniGameActor

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomMiniGames.generated.h"

// ─── Enumerations ──────────────────────────────────────────────────

/** Thematic realm the mini-game belongs to. */
UENUM(BlueprintType)
enum class ELoomMiniGameRealm : uint8
{
    STEM                UMETA(DisplayName = "STEM"),
    LanguageArts        UMETA(DisplayName = "Language Arts"),
    FinancialLiteracy   UMETA(DisplayName = "Financial Literacy"),
    Crossroads          UMETA(DisplayName = "Crossroads"),
};

/** Lifecycle state of a mini-game session. */
UENUM(BlueprintType)
enum class ELoomMiniGameState : uint8
{
    Idle        UMETA(DisplayName = "Idle"),
    Starting    UMETA(DisplayName = "Starting"),
    InProgress  UMETA(DisplayName = "In Progress"),
    Complete    UMETA(DisplayName = "Complete"),
    Failed      UMETA(DisplayName = "Failed / Aborted"),
};

// ─── Structs ───────────────────────────────────────────────────────

/** Static definition for a mini-game (mirrors MiniGameDefinition in TS). */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomMiniGameDefinition
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MiniGame")
    FString GameId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MiniGame")
    FString WorldId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MiniGame")
    FString DisplayName;

    /** One-sentence description of the play mechanic. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MiniGame")
    FString Mechanic;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MiniGame")
    FString LearningObjective;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MiniGame")
    ELoomMiniGameRealm Realm = ELoomMiniGameRealm::STEM;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MiniGame",
              meta = (ClampMin = "1", ClampMax = "5"))
    int32 MaxDifficulty = 5;

    /** Soft reference to the gameplay actor that implements this mini-game. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MiniGame")
    TSoftClassPtr<AActor> GameActorClass;
};

/** Live state tracked for a single mini-game play session. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomMiniGameSession
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "MiniGame")
    FString SessionId;

    UPROPERTY(BlueprintReadOnly, Category = "MiniGame")
    FString GameId;

    UPROPERTY(BlueprintReadOnly, Category = "MiniGame")
    FString KindlerId;

    UPROPERTY(BlueprintReadOnly, Category = "MiniGame",
              meta = (ClampMin = "1", ClampMax = "5"))
    int32 Difficulty = 1;

    UPROPERTY(BlueprintReadOnly, Category = "MiniGame")
    int32 Score = 0;

    UPROPERTY(BlueprintReadOnly, Category = "MiniGame")
    int32 MaxScore = 100;

    UPROPERTY(BlueprintReadOnly, Category = "MiniGame")
    ELoomMiniGameState State = ELoomMiniGameState::Idle;

    /** Unix-ms start time for session logging. */
    UPROPERTY(BlueprintReadOnly, Category = "MiniGame")
    int64 StartedAtMs = 0;
};

/** Result produced when a session completes. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomMiniGameResult
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "MiniGame")
    int32 SparkGained = 0;

    UPROPERTY(BlueprintReadOnly, Category = "MiniGame")
    int32 LuminanceGained = 0;

    UPROPERTY(BlueprintReadOnly, Category = "MiniGame")
    bool bNewHighScore = false;

    /**
     * If >= 0, this difficulty tier is now unlocked for this game.
     * -1 means no new tier was unlocked.
     */
    UPROPERTY(BlueprintReadOnly, Category = "MiniGame")
    int32 NewDifficultyUnlocked = -1;
};

/** Persistent per-kindler record of mini-game progress. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomKindlerGameState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadWrite, Category = "MiniGame")
    FString KindlerId;

    /** GameId → all-time high score. */
    UPROPERTY(BlueprintReadWrite, Category = "MiniGame")
    TMap<FString, int32> HighScores;

    /** GameId → highest difficulty tier reached. */
    UPROPERTY(BlueprintReadWrite, Category = "MiniGame")
    TMap<FString, int32> MaxDifficultyReached;

    UPROPERTY(BlueprintReadWrite, Category = "MiniGame",
              meta = (ClampMin = "0"))
    int32 TotalGamesPlayed = 0;
};

// ─── Component ────────────────────────────────────────────────────

/**
 * UBridgeLoomMiniGames — ActorComponent bridging the TS mini-games-registry
 * to UE5 session management, camera, and input systems.
 *
 * Features:
 *  - StartGame: validates state, spawns game actor, pushes camera + input context
 *  - CompleteGame: scores the session, computes Spark + luminance, fires delegates
 *  - AbortGame: cleanly tears down a session without awarding spark
 *  - GetHighScore / GetUnlockedDifficulty: stateless kindler-state queries
 *  - Max 1 active session per player controller (prevents re-entry)
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Loom Mini-Games")
class BRIDGELOOM_API UBridgeLoomMiniGames : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomMiniGames();

    // ── Configuration ─────────────────────────────────────────────

    /** Mini-game catalog — seeded with 50 games from Bible v5 in BeginPlay. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MiniGame|Config")
    TArray<FLoomMiniGameDefinition> GameDefinitions;

    /** Minimum Spark award per completed session. Default: 3. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MiniGame|Config",
              meta = (ClampMin = "0", ClampMax = "50"))
    int32 SparkGainMin = 3;

    /** Maximum Spark award at perfect score. Default: 8. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MiniGame|Config",
              meta = (ClampMin = "1", ClampMax = "50"))
    int32 SparkGainMax = 8;

    /** World luminance gain per completed game. Default: 1. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MiniGame|Config",
              meta = (ClampMin = "0", ClampMax = "10"))
    int32 LuminanceGainPerGame = 1;

    /**
     * Score percentage threshold (0–1) required to unlock the next difficulty.
     * E.g. 0.8 = 80% of MaxScore unlocks the next tier.
     */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "MiniGame|Config",
              meta = (ClampMin = "0.0", ClampMax = "1.0"))
    float DifficultyUnlockThreshold = 0.8f;

    // ── Session Lifecycle ─────────────────────────────────────────

    /**
     * Begin a mini-game session for the given kindler / player controller.
     * Spawns the game actor at the nearest LoomMiniGameActor tagged actor.
     * Returns false if a session is already active or GameId not found.
     */
    UFUNCTION(BlueprintCallable, Category = "MiniGame")
    bool StartGame(const FString& GameId,
                   const FString& KindlerId,
                   int32 Difficulty,
                   APlayerController* PC,
                   UPARAM(ref) FLoomKindlerGameState& InOutState);

    /**
     * Submit the completed session with its final score.
     * Computes Spark, luminance, high-score, and difficulty unlock.
     * Returns an invalid result (SparkGained = -1) if no active session found.
     */
    UFUNCTION(BlueprintCallable, Category = "MiniGame")
    FLoomMiniGameResult CompleteGame(const FString& KindlerId,
                                     int32 FinalScore,
                                     UPARAM(ref) FLoomKindlerGameState& InOutState);

    /**
     * Abort the active session without awarding any spark or progression.
     * Tears down the game actor and restores camera/input.
     */
    UFUNCTION(BlueprintCallable, Category = "MiniGame")
    void AbortGame(const FString& KindlerId);

    // ── State Queries ─────────────────────────────────────────────

    /** Returns the current active session for the given kindler (may be Idle). */
    UFUNCTION(BlueprintPure, Category = "MiniGame")
    bool GetActiveSession(const FString& KindlerId,
                          FLoomMiniGameSession& OutSession) const;

    /** Look up a game definition by ID. */
    UFUNCTION(BlueprintPure, Category = "MiniGame")
    bool GetGameById(const FString& GameId,
                     FLoomMiniGameDefinition& OutDef) const;

    /** All games registered for a specific world. */
    UFUNCTION(BlueprintPure, Category = "MiniGame")
    TArray<FLoomMiniGameDefinition> GetGamesForWorld(const FString& WorldId) const;

    UFUNCTION(BlueprintPure, Category = "MiniGame")
    int32 GetHighScore(const FLoomKindlerGameState& State,
                       const FString& GameId) const;

    UFUNCTION(BlueprintPure, Category = "MiniGame")
    int32 GetUnlockedDifficulty(const FLoomKindlerGameState& State,
                                 const FString& GameId) const;

    // ── Delegates ─────────────────────────────────────────────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnGameStarted,
        FString, GameId, FString, KindlerId);

    UPROPERTY(BlueprintAssignable, Category = "MiniGame|Events")
    FOnGameStarted OnGameStarted;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FOnGameCompleted,
        FString, GameId, FString, KindlerId, FLoomMiniGameResult, Result);

    UPROPERTY(BlueprintAssignable, Category = "MiniGame|Events")
    FOnGameCompleted OnGameCompleted;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FOnHighScoreAchieved,
        FString, GameId, FString, KindlerId, int32, NewHighScore);

    UPROPERTY(BlueprintAssignable, Category = "MiniGame|Events")
    FOnHighScoreAchieved OnHighScoreAchieved;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FOnDifficultyUnlocked,
        FString, GameId, FString, KindlerId, int32, NewDifficulty);

    UPROPERTY(BlueprintAssignable, Category = "MiniGame|Events")
    FOnDifficultyUnlocked OnDifficultyUnlocked;

    // ── UActorComponent ───────────────────────────────────────────

    virtual void BeginPlay() override;

private:
    // KindlerId → active session
    TMap<FString, FLoomMiniGameSession> ActiveSessions;

    // KindlerId → spawned game actor
    TMap<FString, TWeakObjectPtr<AActor>> SpawnedGameActors;

    // Seed GameDefinitions with 50 canonical Bible v5 mini-games
    void InitDefaultGameDefs();

    // Compute spark from score percentage + difficulty modifier
    int32 ComputeSparkGain(int32 Score, int32 MaxScore, int32 Difficulty) const;

    // Tear down the spawned actor and restore player camera/input
    void TearDownSession(const FString& KindlerId, APlayerController* PC);
};
