// Copyright Koydo. All Rights Reserved.
// BridgeLoomMiniGames.cpp

#include "BridgeLoomMiniGames.h"
#include "Engine/World.h"
#include "Misc/Guid.h"
#include "Misc/DateTime.h"
#include "Engine/AssetManager.h"
#include "StreamableManager.h"
#include "EngineUtils.h"
#include "GameFramework/Actor.h"

UBridgeLoomMiniGames::UBridgeLoomMiniGames()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UBridgeLoomMiniGames::BeginPlay()
{
    Super::BeginPlay();

    if (GameDefinitions.IsEmpty())
    {
        InitDefaultGameDefs();
    }
}

// ─── Session Lifecycle ────────────────────────────────────────────

bool UBridgeLoomMiniGames::StartGame(const FString& KindlerId, const FString& GameId,
                                      int32 Difficulty)
{
    if (ActiveSessions.Contains(KindlerId))
    {
        UE_LOG(LogTemp, Warning,
               TEXT("BridgeLoomMiniGames: Kindler %s already has an active session"),
               *KindlerId);
        return false;
    }

    const FLoomMiniGameDefinition* Def = GetGameById(GameId);
    if (!Def)
    {
        UE_LOG(LogTemp, Warning,
               TEXT("BridgeLoomMiniGames: Game %s not found"), *GameId);
        return false;
    }

    const int32 ClampedDiff = FMath::Clamp(Difficulty, 1, Def->MaxDifficulty);

    // Compute a reasonable MaxScore: base 1000 scaled by difficulty
    const int32 MaxScore = 1000 * ClampedDiff;

    FLoomMiniGameSession Session;
    Session.SessionId   = FGuid::NewGuid().ToString();
    Session.GameId      = GameId;
    Session.KindlerId   = KindlerId;
    Session.Difficulty  = ClampedDiff;
    Session.Score       = 0;
    Session.MaxScore    = MaxScore;
    Session.State       = ELoomMiniGameState::Starting;
    Session.StartedAtMs = FDateTime::UtcNow().GetTicks() / ETimespan::TicksPerMillisecond;

    ActiveSessions.Add(KindlerId, Session);

    // Async-load and spawn game actor if class is set
    if (!Def->GameActorClass.IsNull())
    {
        TWeakObjectPtr<UBridgeLoomMiniGames> WeakThis(this);
        const FString CapturedKindler = KindlerId;
        const TSoftClassPtr<AActor> CapturedClass = Def->GameActorClass;

        FStreamableManager& StreamMgr = UAssetManager::GetStreamableManager();
        StreamMgr.RequestAsyncLoad(CapturedClass.ToSoftObjectPath(),
            [WeakThis, CapturedKindler, CapturedClass]()
            {
                if (!WeakThis.IsValid()) return;

                UClass* ActorClass = CapturedClass.Get();
                UWorld* World = WeakThis->GetWorld();
                if (!ActorClass || !World) return;

                // Find a tagged spawn point in the level
                AActor* SpawnPoint = nullptr;
                for (TActorIterator<AActor> It(World); It; ++It)
                {
                    if (It->Tags.Contains(TEXT("LoomMiniGameActor")))
                    {
                        SpawnPoint = *It;
                        break;
                    }
                }

                FActorSpawnParameters Params;
                Params.SpawnCollisionHandlingOverride =
                    ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButAlwaysSpawn;

                const FVector Location  = SpawnPoint ? SpawnPoint->GetActorLocation() : FVector::ZeroVector;
                const FRotator Rotation = SpawnPoint ? SpawnPoint->GetActorRotation() : FRotator::ZeroRotator;

                AActor* Spawned = World->SpawnActor<AActor>(ActorClass, Location, Rotation, Params);
                if (Spawned)
                {
                    WeakThis->SpawnedGameActors.Add(CapturedKindler, Spawned);

                    // Transition session state
                    if (FLoomMiniGameSession* S = WeakThis->ActiveSessions.Find(CapturedKindler))
                    {
                        S->State = ELoomMiniGameState::InProgress;
                    }
                }
            });
    }
    else
    {
        // No actor; transition immediately
        if (FLoomMiniGameSession* S = ActiveSessions.Find(KindlerId))
        {
            S->State = ELoomMiniGameState::InProgress;
        }
    }

    // Retrieve snapshot for broadcast (state may still be Starting at this point)
    OnGameStarted.Broadcast(Session);
    return true;
}

bool UBridgeLoomMiniGames::CompleteGame(const FString& KindlerId, int32 FinalScore,
                                         FLoomMiniGameResult& OutResult)
{
    FLoomMiniGameSession* Session = ActiveSessions.Find(KindlerId);
    if (!Session)
    {
        UE_LOG(LogTemp, Warning,
               TEXT("BridgeLoomMiniGames: No active session for Kindler %s"), *KindlerId);
        return false;
    }

    Session->Score = FMath::Clamp(FinalScore, 0, Session->MaxScore);
    Session->State = ELoomMiniGameState::Complete;

    const FString GameId = Session->GameId;

    // Compute spark gain: interpolate [SparkGainMin, SparkGainMax] by normalised score,
    // then scale up lightly with difficulty
    const float NormScore = Session->MaxScore > 0
        ? FMath::Clamp((float)FinalScore / (float)Session->MaxScore, 0.f, 1.f)
        : 0.f;
    const int32 BaseSpark = FMath::RoundToInt(
        FMath::Lerp((float)SparkGainMin, (float)SparkGainMax, NormScore));
    const int32 RawSpark  = FMath::Clamp(BaseSpark + (Session->Difficulty - 1), SparkGainMin, SparkGainMax + 5);

    OutResult.SparkGained      = RawSpark;
    OutResult.LuminanceGained  = LuminanceGainPerGame;
    OutResult.bNewHighScore    = false;
    OutResult.NewDifficultyUnlocked = -1;

    // ── High-score check ──────────────────────────────────────
    FLoomKindlerGameState& KState = KindlerGameStates.FindOrAdd(KindlerId);
    const int32 PrevHigh = KState.HighScores.FindRef(GameId);
    if (FinalScore > PrevHigh)
    {
        KState.HighScores.Add(GameId, FinalScore);
        OutResult.bNewHighScore = true;
        OnHighScoreAchieved.Broadcast(KindlerId, GameId, FinalScore);
    }

    // ── Difficulty unlock check ───────────────────────────────
    const FLoomMiniGameDefinition* Def = GetGameById(GameId);
    if (Def)
    {
        const int32 CurMaxDiff = KState.MaxDifficultyReached.FindRef(GameId);
        const bool bAboveThreshold = NormScore >= DifficultyUnlockThreshold;
        const bool bCanUpgrade     = CurMaxDiff < Def->MaxDifficulty;

        if (bAboveThreshold && bCanUpgrade)
        {
            const int32 NewMax = CurMaxDiff + 1;
            KState.MaxDifficultyReached.Add(GameId, NewMax);
            OutResult.NewDifficultyUnlocked = NewMax;
            OnDifficultyUnlocked.Broadcast(KindlerId, GameId, NewMax);
        }
    }

    KState.TotalGamesPlayed++;

    // Capture session snapshot before teardown for delegate
    FLoomMiniGameSession SessionSnap = *Session;
    TearDownSession(KindlerId);

    OnGameCompleted.Broadcast(SessionSnap, OutResult);
    return true;
}

void UBridgeLoomMiniGames::AbortGame(const FString& KindlerId)
{
    FLoomMiniGameSession* Session = ActiveSessions.Find(KindlerId);
    if (!Session) return;

    Session->State = ELoomMiniGameState::Failed;

    FLoomKindlerGameState& KState = KindlerGameStates.FindOrAdd(KindlerId);
    KState.TotalGamesPlayed++;

    TearDownSession(KindlerId);
}

// ─── Queries ──────────────────────────────────────────────────────

bool UBridgeLoomMiniGames::GetActiveSession(const FString& KindlerId,
                                             FLoomMiniGameSession& OutSession) const
{
    const FLoomMiniGameSession* Session = ActiveSessions.Find(KindlerId);
    if (!Session) return false;
    OutSession = *Session;
    return true;
}

const FLoomMiniGameDefinition* UBridgeLoomMiniGames::GetGameById(const FString& GameId) const
{
    for (const FLoomMiniGameDefinition& Def : GameDefinitions)
    {
        if (Def.GameId == GameId) return &Def;
    }
    return nullptr;
}

TArray<FLoomMiniGameDefinition> UBridgeLoomMiniGames::GetGamesForWorld(
    const FString& WorldId) const
{
    TArray<FLoomMiniGameDefinition> Result;
    for (const FLoomMiniGameDefinition& Def : GameDefinitions)
    {
        if (Def.WorldId == WorldId) Result.Add(Def);
    }
    return Result;
}

int32 UBridgeLoomMiniGames::GetHighScore(const FString& KindlerId,
                                          const FString& GameId) const
{
    const FLoomKindlerGameState* KState = KindlerGameStates.Find(KindlerId);
    if (!KState) return 0;
    return KState->HighScores.FindRef(GameId);
}

int32 UBridgeLoomMiniGames::GetUnlockedDifficulty(const FString& KindlerId,
                                                    const FString& GameId) const
{
    const FLoomKindlerGameState* KState = KindlerGameStates.Find(KindlerId);
    if (!KState) return 1; // everyone starts at difficulty 1
    const int32 MaxReached = KState->MaxDifficultyReached.FindRef(GameId);
    return FMath::Max(MaxReached, 1);
}

// ─── Private Helpers ──────────────────────────────────────────────

void UBridgeLoomMiniGames::TearDownSession(const FString& KindlerId)
{
    // Destroy spawned game actor
    TWeakObjectPtr<AActor>* ActorPtr = SpawnedGameActors.Find(KindlerId);
    if (ActorPtr && ActorPtr->IsValid())
    {
        (*ActorPtr)->Destroy();
    }
    SpawnedGameActors.Remove(KindlerId);
    ActiveSessions.Remove(KindlerId);
}

void UBridgeLoomMiniGames::InitDefaultGameDefs()
{
    GameDefinitions.Empty();

    auto AddGame = [&](const FString& GameId, const FString& WorldId,
                       const FString& Name, const FString& Mechanic,
                       const FString& LO, ELoomMiniGameRealm Realm, int32 MaxDiff)
    {
        FLoomMiniGameDefinition Def;
        Def.GameId            = GameId;
        Def.WorldId           = WorldId;
        Def.DisplayName       = Name;
        Def.Mechanic          = Mechanic;
        Def.LearningObjective = LO;
        Def.Realm             = Realm;
        Def.MaxDifficulty     = MaxDiff;
        GameDefinitions.Add(Def);
    };

    // ── STEM world games ─────────────────────────────────────
    AddGame(TEXT("storm-chaser"),     TEXT("weather-station"),
            TEXT("Storm Chaser"),     TEXT("predict"),
            TEXT("Weather pattern prediction and meteorology"), ELoomMiniGameRealm::STEM, 3);

    AddGame(TEXT("bridge-builder"),   TEXT("circuit-marsh"),
            TEXT("Bridge Builder"),   TEXT("physics-puzzle"),
            TEXT("Engineering principles and structural design"), ELoomMiniGameRealm::STEM, 5);

    AddGame(TEXT("reef-rescue"),      TEXT("tideline-bay"),
            TEXT("Reef Rescue"),      TEXT("ecology-sort"),
            TEXT("Ocean ecosystem and biodiversity management"), ELoomMiniGameRealm::STEM, 4);

    AddGame(TEXT("crystal-math"),     TEXT("number-garden"),
            TEXT("Crystal Math"),     TEXT("equation-match"),
            TEXT("Algebraic equations and number theory"), ELoomMiniGameRealm::STEM, 5);

    AddGame(TEXT("pattern-picker"),   TEXT("number-garden"),
            TEXT("Pattern Picker"),   TEXT("sequence-fill"),
            TEXT("Mathematical sequences and pattern recognition"), ELoomMiniGameRealm::STEM, 4);

    AddGame(TEXT("circuit-sprint"),   TEXT("circuit-marsh"),
            TEXT("Circuit Sprint"),   TEXT("wire-routing"),
            TEXT("Electrical circuit design and logic gates"), ELoomMiniGameRealm::STEM, 5);

    AddGame(TEXT("data-dash"),        TEXT("data-stream"),
            TEXT("Data Dash"),        TEXT("sort-filter"),
            TEXT("Data analysis, sorting, and visualization"), ELoomMiniGameRealm::STEM, 4);

    AddGame(TEXT("gravity-lab"),      TEXT("cloud-kingdom"),
            TEXT("Gravity Lab"),      TEXT("trajectory"),
            TEXT("Physics: gravity, velocity, projectile motion"), ELoomMiniGameRealm::STEM, 5);

    AddGame(TEXT("glacier-guard"),    TEXT("frost-peaks"),
            TEXT("Glacier Guard"),    TEXT("temperature-balance"),
            TEXT("Climate science and thermal dynamics"), ELoomMiniGameRealm::STEM, 3);

    AddGame(TEXT("dna-decoder"),      TEXT("meadow-lab"),
            TEXT("DNA Decoder"),      TEXT("base-pair"),
            TEXT("Genetics and molecular biology basics"), ELoomMiniGameRealm::STEM, 5);

    AddGame(TEXT("solar-sprint"),     TEXT("starfall-observatory"),
            TEXT("Solar Sprint"),     TEXT("orbit-time"),
            TEXT("Astronomy: orbits, light-years, stellar life cycle"), ELoomMiniGameRealm::STEM, 4);

    AddGame(TEXT("savanna-census"),   TEXT("savanna-workshop"),
            TEXT("Savanna Census"),   TEXT("data-collection"),
            TEXT("Biology: animal populations and ecosystem roles"), ELoomMiniGameRealm::STEM, 3);

    // ── Language Arts world games ─────────────────────────────
    AddGame(TEXT("echo-riddle"),      TEXT("story-tree"),
            TEXT("Echo Riddle"),      TEXT("inference"),
            TEXT("Reading comprehension and inferential reasoning"), ELoomMiniGameRealm::LanguageArts, 4);

    AddGame(TEXT("ink-weaver"),       TEXT("story-tree"),
            TEXT("Ink Weaver"),       TEXT("narrative-build"),
            TEXT("Creative writing: plot structure and imagery"), ELoomMiniGameRealm::LanguageArts, 5);

    AddGame(TEXT("word-tides"),       TEXT("tideline-bay"),
            TEXT("Word Tides"),       TEXT("vocab-match"),
            TEXT("Vocabulary expansion and contextual usage"), ELoomMiniGameRealm::LanguageArts, 3);

    AddGame(TEXT("debate-dash"),      TEXT("debate-arena"),
            TEXT("Debate Dash"),      TEXT("argument-sort"),
            TEXT("Argument construction, evidence, and rebuttal"), ELoomMiniGameRealm::LanguageArts, 5);

    AddGame(TEXT("compass-trail"),    TEXT("nonfiction-fleet"),
            TEXT("Compass Trail"),    TEXT("fact-fiction"),
            TEXT("Media literacy: fact-checking and source evaluation"), ELoomMiniGameRealm::LanguageArts, 4);

    AddGame(TEXT("lighthouse-log"),   TEXT("diary-lighthouse"),
            TEXT("Lighthouse Log"),   TEXT("voice-match"),
            TEXT("Personal narrative and author's voice"), ELoomMiniGameRealm::LanguageArts, 3);

    AddGame(TEXT("folklore-forge"),   TEXT("folklore-bazaar"),
            TEXT("Folklore Forge"),   TEXT("trope-select"),
            TEXT("World folklore archetypes and cultural context"), ELoomMiniGameRealm::LanguageArts, 4);

    AddGame(TEXT("rhythm-reader"),    TEXT("music-meadow"),
            TEXT("Rhythm Reader"),    TEXT("lyric-meter"),
            TEXT("Poetry: meter, rhyme, and lyrical structure"), ELoomMiniGameRealm::LanguageArts, 4);

    AddGame(TEXT("syntax-sprint"),    TEXT("thinking-grove"),
            TEXT("Syntax Sprint"),    TEXT("grammar-sort"),
            TEXT("Grammar: sentence structure and syntax rules"), ELoomMiniGameRealm::LanguageArts, 5);

    AddGame(TEXT("memoir-mosaic"),    TEXT("wellness-garden"),
            TEXT("Memoir Mosaic"),    TEXT("memory-sequence"),
            TEXT("Reflective writing and personal identity"), ELoomMiniGameRealm::LanguageArts, 3);

    AddGame(TEXT("press-rush"),       TEXT("nonfiction-fleet"),
            TEXT("Press Rush"),       TEXT("headline-write"),
            TEXT("Journalism: headlines, leads, and news structure"), ELoomMiniGameRealm::LanguageArts, 4);

    // ── Financial Literacy world games ─────────────────────────
    AddGame(TEXT("budget-blitz"),     TEXT("budget-kitchen"),
            TEXT("Budget Blitz"),     TEXT("expense-allocate"),
            TEXT("Personal budgeting: income, needs vs wants, savings"), ELoomMiniGameRealm::FinancialLiteracy, 5);

    AddGame(TEXT("market-match"),     TEXT("market-square"),
            TEXT("Market Match"),     TEXT("supply-demand"),
            TEXT("Economics: supply, demand, and pricing"), ELoomMiniGameRealm::FinancialLiteracy, 4);

    AddGame(TEXT("trade-trails"),     TEXT("market-square"),
            TEXT("Trade Trails"),     TEXT("barter-route"),
            TEXT("Trade: goods, exchange, and global commerce"), ELoomMiniGameRealm::FinancialLiteracy, 3);

    AddGame(TEXT("compound-climb"),   TEXT("market-square"),
            TEXT("Compound Climb"),   TEXT("interest-calc"),
            TEXT("Compound interest and long-term savings growth"), ELoomMiniGameRealm::FinancialLiteracy, 5);

    AddGame(TEXT("pitch-palace"),     TEXT("entrepreneur"),
            TEXT("Pitch Palace"),     TEXT("pitch-build"),
            TEXT("Entrepreneurship: value proposition and pitching"), ELoomMiniGameRealm::FinancialLiteracy, 5);

    AddGame(TEXT("tax-trek"),         TEXT("charity-harbor"),
            TEXT("Tax Trek"),         TEXT("tax-form"),
            TEXT("Taxes: w-2, filing basics, and civic contribution"), ELoomMiniGameRealm::FinancialLiteracy, 4);

    AddGame(TEXT("credit-chase"),     TEXT("market-square"),
            TEXT("Credit Chase"),     TEXT("score-sim"),
            TEXT("Credit scores: factors, impact, and management"), ELoomMiniGameRealm::FinancialLiteracy, 4);

    AddGame(TEXT("coin-cascade"),     TEXT("budget-kitchen"),
            TEXT("Coin Cascade"),     TEXT("coin-count"),
            TEXT("Money math: counting, making change, currency"), ELoomMiniGameRealm::FinancialLiteracy, 3);

    AddGame(TEXT("invest-islands"),   TEXT("entrepreneur"),
            TEXT("Invest Islands"),   TEXT("risk-return"),
            TEXT("Investing: risk, diversification, and return"), ELoomMiniGameRealm::FinancialLiteracy, 5);

    AddGame(TEXT("paycheck-puzzle"),  TEXT("budget-kitchen"),
            TEXT("Paycheck Puzzle"),  TEXT("deduction-calc"),
            TEXT("Paychecks: deductions, net vs gross, take-home pay"), ELoomMiniGameRealm::FinancialLiteracy, 4);

    // ── Crossroads (cross-realm) games ────────────────────────
    AddGame(TEXT("loom-relay"),       TEXT("hub"),
            TEXT("Loom Relay"),       TEXT("multi-step"),
            TEXT("Cross-subject relay: STEM + language arts combined"), ELoomMiniGameRealm::Crossroads, 5);

    AddGame(TEXT("compass-quest"),    TEXT("hub"),
            TEXT("Compass Quest"),    TEXT("npc-dialogue"),
            TEXT("Narrative-driven: choices, consequences, empathy"), ELoomMiniGameRealm::Crossroads, 4);

    AddGame(TEXT("wonder-wheel"),     TEXT("hub"),
            TEXT("Wonder Wheel"),     TEXT("random-challenge"),
            TEXT("Mixed random challenges from any realm"), ELoomMiniGameRealm::Crossroads, 5);

    AddGame(TEXT("kindler-cup"),      TEXT("hub"),
            TEXT("Kindler Cup"),      TEXT("tournament"),
            TEXT("Weekly cross-realm tournament for all kindlers"), ELoomMiniGameRealm::Crossroads, 5);

    AddGame(TEXT("world-weave"),      TEXT("hub"),
            TEXT("World Weave"),      TEXT("collaborative"),
            TEXT("Multiplayer: kindlers build a shared story together"), ELoomMiniGameRealm::Crossroads, 3);

    AddGame(TEXT("time-capsule"),     TEXT("hub"),
            TEXT("Time Capsule"),     TEXT("year-review"),
            TEXT("Annual review: reflect on growth and milestones"), ELoomMiniGameRealm::Crossroads, 3);

    AddGame(TEXT("logic-leap"),       TEXT("thinking-grove"),
            TEXT("Logic Leap"),       TEXT("logic-puzzle"),
            TEXT("Critical thinking: deductive and inductive reasoning"), ELoomMiniGameRealm::Crossroads, 5);

    AddGame(TEXT("spark-surge"),      TEXT("hub"),
            TEXT("Spark Surge"),      TEXT("timed-blitz"),
            TEXT("Speed challenge: fastest correct answers earn spark"), ELoomMiniGameRealm::Crossroads, 5);

    AddGame(TEXT("echo-chamber"),     TEXT("hub"),
            TEXT("Echo Chamber"),     TEXT("perspective"),
            TEXT("Empathy: recognise and challenge cognitive biases"), ELoomMiniGameRealm::Crossroads, 4);

    AddGame(TEXT("mosaic-master"),    TEXT("hub"),
            TEXT("Mosaic Master"),    TEXT("synthesis"),
            TEXT("Synthesis game: connect concepts across all realms"), ELoomMiniGameRealm::Crossroads, 5);
}
