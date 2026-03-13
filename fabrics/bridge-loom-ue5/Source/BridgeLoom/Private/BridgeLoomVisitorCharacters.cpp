// Copyright Koydo. All Rights Reserved.
// BridgeLoomVisitorCharacters.cpp

#include "BridgeLoomVisitorCharacters.h"
#include "Engine/StreamableManager.h"
#include "Engine/AssetManager.h"
#include "EngineUtils.h"
#include "GameFramework/Actor.h"

UBridgeLoomVisitorCharacters::UBridgeLoomVisitorCharacters()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UBridgeLoomVisitorCharacters::BeginPlay()
{
    Super::BeginPlay();
    if (RecurringVisitors.IsEmpty()) InitDefaultVisitors();
}

void UBridgeLoomVisitorCharacters::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    // Clean up any spawned visitors
    for (auto& Pair : SpawnedVisitors)
    {
        if (Pair.Value.IsValid())
        {
            Pair.Value->Destroy();
        }
    }
    SpawnedVisitors.Empty();
    Super::EndPlay(EndPlayReason);
}

// ─── Compass ─────────────────────────────────────────────────────

FLoomCompassModeResult UBridgeLoomVisitorCharacters::ResolveCompassMode(
    const FLoomKindlerVisitorState& State) const
{
    FLoomCompassModeResult Result;

    if (State.bIsInForgettingWell)
    {
        Result.Mode   = ELoomCompassMode::Challenge;
        Result.Reason = TEXT("Kindler is in the Forgetting Well");
        return Result;
    }

    if (State.bRecentDiscovery)
    {
        Result.Mode   = ELoomCompassMode::Celebrating;
        Result.Reason = TEXT("Kindler just made a discovery");
        return Result;
    }

    if (State.bIsLost)
    {
        Result.Mode   = ELoomCompassMode::Orienting;
        Result.Reason = TEXT("Kindler is lost");
        return Result;
    }

    // Check elapsed time since last visit
    int64 NowMs = FDateTime::UtcNow().ToUnixTimestamp() * 1000LL;
    int64 Elapsed = NowMs - State.LastVisitMs;
    if (State.LastVisitMs > 0 && Elapsed > AbsenceThresholdMs)
    {
        Result.Mode   = ELoomCompassMode::Orienting;
        Result.Reason = TEXT("Kindler absent for more than 7 days");
        return Result;
    }

    Result.Mode   = ELoomCompassMode::Quiet;
    Result.Reason = TEXT("Kindler is present and exploring normally");
    return Result;
}

// ─── World entry ─────────────────────────────────────────────────

void UBridgeLoomVisitorCharacters::OnKindlerEnteredWorld(
    const FString& KindlerId, const FString& WorldId,
    FLoomKindlerVisitorState& InOutState)
{
    InOutState.CurrentWorldId = WorldId;

    // Resolve and fire compass mode
    FLoomCompassModeResult NewMode = ResolveCompassMode(InOutState);
    OnCompassModeChanged.Broadcast(KindlerId, NewMode);

    // Spawn matching recurring visitors
    for (const FLoomRecurringVisitorDefinition& Visitor : RecurringVisitors)
    {
        if (Visitor.WorldIds.Contains(WorldId))
        {
            SpawnRecurringVisitor(KindlerId, Visitor.CharacterId, WorldId);
        }
    }

    // Spawn matching legendary figures (first visit only)
    for (const FLoomLegendaryFigureDefinition& Figure : LegendaryFigures)
    {
        if (Figure.WorldId == WorldId && IsLegendaryFirstVisit(Figure.CharacterId, InOutState))
        {
            InOutState.SeenLegendaryIds.Add(Figure.CharacterId);
            SpawnLegendaryFigure(KindlerId, Figure.CharacterId);
            OnLegendaryFirstSeen.Broadcast(KindlerId, Figure.CharacterId, Figure.Name);
        }
    }
}

// ─── Spawning ────────────────────────────────────────────────────

void UBridgeLoomVisitorCharacters::SpawnRecurringVisitor(
    const FString& KindlerId, const FString& CharacterId, const FString& WorldId)
{
    // Don't double-spawn
    TWeakObjectPtr<AActor>* Existing = SpawnedVisitors.Find(CharacterId);
    if (Existing && Existing->IsValid()) return;

    FLoomRecurringVisitorDefinition Def;
    if (!GetRecurringVisitorById(CharacterId, Def)) return;

    if (Def.VisitorActorClass.IsNull())
    {
        // No actor class — still fire the event so UI layer can handle it
        OnVisitorAppeared.Broadcast(KindlerId, CharacterId, WorldId);
        return;
    }

    TWeakObjectPtr<UBridgeLoomVisitorCharacters> WeakThis(this);
    const FString CapturedKindler  = KindlerId;
    const FString CapturedCharId   = CharacterId;
    const FString CapturedWorldId  = WorldId;
    FSoftObjectPath ClassPath      = Def.VisitorActorClass.ToSoftObjectPath();

    FStreamableManager& SM = UAssetManager::GetStreamableManager();
    SM.RequestAsyncLoad(ClassPath,
        FStreamableDelegate::CreateLambda([WeakThis, CapturedKindler, CapturedCharId, CapturedWorldId, ClassPath]()
        {
            if (!WeakThis.IsValid()) return;
            UBridgeLoomVisitorCharacters* Self = WeakThis.Get();

            UClass* VisitorClass = Cast<UClass>(ClassPath.ResolveObject());
            if (!VisitorClass) return;

            UWorld* World = Self->GetWorld();
            if (!World) return;

            // Find spawn point tagged "LoomVisitorSpawnPoint"
            FTransform SpawnTransform = FTransform::Identity;
            for (TActorIterator<AActor> It(World); It; ++It)
            {
                if (It->ActorHasTag(TEXT("LoomVisitorSpawnPoint")))
                {
                    SpawnTransform = It->GetActorTransform();
                    break;
                }
            }

            FActorSpawnParameters Params;
            Params.SpawnCollisionHandlingOverride =
                ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButAlwaysSpawn;

            AActor* Spawned = World->SpawnActor<AActor>(VisitorClass, SpawnTransform, Params);
            if (Spawned)
            {
                Self->SpawnedVisitors.Add(CapturedCharId, Spawned);
                Self->OnVisitorAppeared.Broadcast(CapturedKindler, CapturedCharId, CapturedWorldId);
            }
        }));
}

void UBridgeLoomVisitorCharacters::SpawnLegendaryFigure(
    const FString& KindlerId, const FString& CharacterId)
{
    FLoomLegendaryFigureDefinition Def;
    if (!GetLegendaryFigureById(CharacterId, Def)) return;

    if (Def.FigureActorClass.IsNull())
    {
        OnVisitorAppeared.Broadcast(KindlerId, CharacterId, Def.WorldId);
        return;
    }

    TWeakObjectPtr<UBridgeLoomVisitorCharacters> WeakThis(this);
    const FString CapturedKindler = KindlerId;
    const FString CapturedCharId  = CharacterId;
    const FString CapturedWorldId = Def.WorldId;
    FSoftObjectPath ClassPath     = Def.FigureActorClass.ToSoftObjectPath();

    FStreamableManager& SM = UAssetManager::GetStreamableManager();
    SM.RequestAsyncLoad(ClassPath,
        FStreamableDelegate::CreateLambda([WeakThis, CapturedKindler, CapturedCharId, CapturedWorldId, ClassPath]()
        {
            if (!WeakThis.IsValid()) return;
            UBridgeLoomVisitorCharacters* Self = WeakThis.Get();

            UClass* FigureClass = Cast<UClass>(ClassPath.ResolveObject());
            if (!FigureClass) return;

            UWorld* World = Self->GetWorld();
            if (!World) return;

            FTransform SpawnTransform = FTransform::Identity;
            for (TActorIterator<AActor> It(World); It; ++It)
            {
                if (It->ActorHasTag(TEXT("LoomLegendarySpawnPoint")))
                {
                    SpawnTransform = It->GetActorTransform();
                    break;
                }
            }

            FActorSpawnParameters Params;
            Params.SpawnCollisionHandlingOverride =
                ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButAlwaysSpawn;

            AActor* Spawned = World->SpawnActor<AActor>(FigureClass, SpawnTransform, Params);
            if (Spawned)
            {
                Self->SpawnedVisitors.Add(CapturedCharId, Spawned);
                Self->OnVisitorAppeared.Broadcast(CapturedKindler, CapturedCharId, CapturedWorldId);
            }
        }));
}

void UBridgeLoomVisitorCharacters::DespawnVisitor(const FString& CharacterId)
{
    TWeakObjectPtr<AActor>* Found = SpawnedVisitors.Find(CharacterId);
    if (Found && Found->IsValid())
    {
        (*Found)->Destroy();
    }
    SpawnedVisitors.Remove(CharacterId);
    OnVisitorDeparted.Broadcast(CharacterId);
}

// ─── Queries ─────────────────────────────────────────────────────

TArray<FString> UBridgeLoomVisitorCharacters::GetVisitorsForWorld(const FString& WorldId) const
{
    TArray<FString> Result;
    for (const FLoomRecurringVisitorDefinition& V : RecurringVisitors)
        if (V.WorldIds.Contains(WorldId)) Result.Add(V.CharacterId);
    for (const FLoomLegendaryFigureDefinition& F : LegendaryFigures)
        if (F.WorldId == WorldId) Result.Add(F.CharacterId);
    return Result;
}

bool UBridgeLoomVisitorCharacters::GetRecurringVisitorById(const FString& CharacterId,
    FLoomRecurringVisitorDefinition& OutDef) const
{
    for (const FLoomRecurringVisitorDefinition& V : RecurringVisitors)
    {
        if (V.CharacterId == CharacterId) { OutDef = V; return true; }
    }
    return false;
}

bool UBridgeLoomVisitorCharacters::GetLegendaryFigureById(const FString& CharacterId,
    FLoomLegendaryFigureDefinition& OutDef) const
{
    for (const FLoomLegendaryFigureDefinition& F : LegendaryFigures)
    {
        if (F.CharacterId == CharacterId) { OutDef = F; return true; }
    }
    return false;
}

bool UBridgeLoomVisitorCharacters::IsLegendaryFirstVisit(const FString& CharacterId,
    const FLoomKindlerVisitorState& State) const
{
    return !State.SeenLegendaryIds.Contains(CharacterId);
}

// ─── Default data ────────────────────────────────────────────────

void UBridgeLoomVisitorCharacters::InitDefaultVisitors()
{
    // ── Compass definition ────────────────────────────────────
    CompassDefinition.Description =
        TEXT("Compass is the first Kindler — a child who chose to stay and guide others. "
             "They take a different form depending on what you need most right now.");
    CompassDefinition.Secret =
        TEXT("Compass was once lost here too. They found their way. So will you.");

    auto AddCompassMode = [&](ELoomCompassMode Mode, const FString& Trigger,
                              const FString& Behavior, const FString& AnimTag)
    {
        FLoomCompassModeDefinition M;
        M.Mode = Mode; M.Trigger = Trigger;
        M.Behavior = Behavior; M.AnimationTag = AnimTag;
        CompassDefinition.Modes.Add(M);
    };

    AddCompassMode(ELoomCompassMode::Orienting,
        TEXT("Lost, absent more than 7 days"),
        TEXT("Compass walks slowly beside the Kindler, pointing gently, speaking softly."),
        TEXT("compass_orienting"));

    AddCompassMode(ELoomCompassMode::Celebrating,
        TEXT("Recent discovery or achievement"),
        TEXT("Compass leaps, sparkles trail behind them, voice bright and excited."),
        TEXT("compass_celebrating"));

    AddCompassMode(ELoomCompassMode::Challenge,
        TEXT("Kindler is in the Forgetting Well"),
        TEXT("Compass stands firm, grounded, steady — a beacon in the dark."),
        TEXT("compass_challenge"));

    AddCompassMode(ELoomCompassMode::Quiet,
        TEXT("Ambient — exploring normally"),
        TEXT("Compass hovers nearby, occasionally pointing out small things of interest."),
        TEXT("compass_quiet"));

    // ── Recurring Visitors (9) ────────────────────────────────
    auto AddRecurring = [&](const FString& Id, const FString& Name,
                            const FString& Title, const FString& Desc,
                            const FString& Trigger, const FString& SignatureLine,
                            const TArray<FString>& Worlds)
    {
        FLoomRecurringVisitorDefinition V;
        V.CharacterId = Id; V.Name = Name; V.Title = Title;
        V.Description = Desc; V.AppearsTrigger = Trigger;
        V.SignatureLine = SignatureLine; V.WorldIds = Worlds;
        RecurringVisitors.Add(V);
    };

    AddRecurring(
        TEXT("idris-al-rashid"),
        TEXT("Idris al-Rashid"),
        TEXT("The Cartographer"),
        TEXT("A traveling mapmaker from a long-ago era who somehow found his way into the Loom. He is never surprised to see you."),
        TEXT("player enters calculation-caves, map-room, or folklore-bazaar"),
        TEXT("Every map is a lie — a beautiful, useful lie. Let me show you."),
        { TEXT("calculation-caves"), TEXT("map-room"), TEXT("folklore-bazaar") });

    AddRecurring(
        TEXT("valentina-da-silva"),
        TEXT("Valentina da Silva"),
        TEXT("The Investigative Journalist"),
        TEXT("A sharp, careful thinker who arrived here after chasing a story that turned out to be bigger than she expected."),
        TEXT("player enters nonfiction-fleet, data-stream, or debate-arena"),
        TEXT("Three sources. Always three sources. And ask who benefits."),
        { TEXT("nonfiction-fleet"), TEXT("data-stream"), TEXT("debate-arena") });

    AddRecurring(
        TEXT("elias-osei"),
        TEXT("Elias Osei"),
        TEXT("The Keeper of Lost Things"),
        TEXT("A gentle, elderly man who has been collecting stories and objects left behind in the Loom. He knows where things go when they're forgotten."),
        TEXT("player enters story-tree, great-archive, or forgetting-well"),
        TEXT("Nothing is truly lost. Just misplaced. Very, very carefully misplaced."),
        { TEXT("story-tree"), TEXT("great-archive"), TEXT("forgetting-well") });

    AddRecurring(
        TEXT("ada-lovelace"),
        TEXT("Ada Lovelace"),
        TEXT("The First Programmer (Recurring)"),
        TEXT("Ada appears as a recurring visitor in code and circuits — not a legend who appears once, but a companion who keeps returning."),
        TEXT("player enters code-canyon or circuit-marsh"),
        TEXT("The engine does not think. But it can show you thinking you could not have had alone."),
        { TEXT("code-canyon"), TEXT("circuit-marsh") });

    AddRecurring(
        TEXT("harriet-tubman"),
        TEXT("Harriet Tubman"),
        TEXT("The Navigator (Recurring)"),
        TEXT("Harriet appears wherever questions of freedom, courage, and finding the way forward live."),
        TEXT("player enters forgetting-well or debate-arena"),
        TEXT("I never ran my train off the track, and I never lost a passenger."),
        { TEXT("forgetting-well"), TEXT("debate-arena") });

    AddRecurring(
        TEXT("charles-darwin"),
        TEXT("Charles Darwin"),
        TEXT("The Patient Observer"),
        TEXT("Darwin wanders the natural worlds of the Loom, endlessly curious, wonderfully humble about how little he still knows."),
        TEXT("player enters meadow-lab or frost-peaks"),
        TEXT("The love for all living creatures is the most noble attribute of man."),
        { TEXT("meadow-lab"), TEXT("frost-peaks") });

    AddRecurring(
        TEXT("maryam-mirzakhani"),
        TEXT("Maryam Mirzakhani"),
        TEXT("The Geometer"),
        TEXT("A mathematician who finds beauty in surfaces and dimensions that most people never see."),
        TEXT("player enters calculation-caves, data-stream, or number-garden"),
        TEXT("The more I spent time on mathematics, the more excited I got."),
        { TEXT("calculation-caves"), TEXT("data-stream"), TEXT("number-garden") });

    AddRecurring(
        TEXT("james-baldwin"),
        TEXT("James Baldwin"),
        TEXT("The Voice"),
        TEXT("James appears wherever words matter most — in the stories we tell, the truths we avoid, the arguments we make."),
        TEXT("player enters story-tree or rhyme-docks"),
        TEXT("Not everything that is faced can be changed, but nothing can be changed until it is faced."),
        { TEXT("story-tree"), TEXT("rhyme-docks") });

    AddRecurring(
        TEXT("marie-tharp"),
        TEXT("Marie Tharp"),
        TEXT("The Mapper of the Unseen"),
        TEXT("Marie mapped the ocean floor when no one thought it could be done — and no one would believe her at first."),
        TEXT("player enters map-room or frost-peaks"),
        TEXT("Seeing is believing, they say. I saw it before I believed it. That is how science works."),
        { TEXT("map-room"), TEXT("frost-peaks") });

    // ── Legendary Figures (12) ────────────────────────────────
    auto AddLegendary = [&](const FString& Id, const FString& Name,
                            const FString& WorldId, const FString& Behavior)
    {
        FLoomLegendaryFigureDefinition F;
        F.CharacterId = Id; F.Name = Name;
        F.WorldId = WorldId; F.Behavior = Behavior;
        LegendaryFigures.Add(F);
    };

    AddLegendary(
        TEXT("gregor-mendel"),
        TEXT("Gregor Mendel"),
        TEXT("meadow-lab"),
        TEXT("FirstVisit: Gives a brief dramatic monologue about pea plants. Ambient: Quietly tending a small symbolic garden in the corner."));

    AddLegendary(
        TEXT("al-khwarizmi"),
        TEXT("Al-Khwarizmi"),
        TEXT("calculation-caves"),
        TEXT("FirstVisit: Writes a single elegant equation on the wall and watches the player discover what it means. Ambient: Studying scrolls near the cave entrance."));

    AddLegendary(
        TEXT("marie-curie"),
        TEXT("Marie Curie"),
        TEXT("magnet-hills"),
        TEXT("FirstVisit: Demonstrates radioactive glow and speaks about persistence. Ambient: Running experiments at a small worktable."));

    AddLegendary(
        TEXT("nikola-tesla"),
        TEXT("Nikola Tesla"),
        TEXT("circuit-marsh"),
        TEXT("FirstVisit: Sparks fly dramatically, then he calms and speaks about energy. Ambient: Sitting alone, sketching electrical diagrams."));

    AddLegendary(
        TEXT("rosalind-franklin"),
        TEXT("Rosalind Franklin"),
        TEXT("body-atlas"),
        TEXT("FirstVisit: Shows Photo 51 and speaks about evidence and credit. Ambient: Working calmly at a crystallography station."));

    AddLegendary(
        TEXT("johannes-kepler"),
        TEXT("Johannes Kepler"),
        TEXT("starfall-observatory"),
        TEXT("FirstVisit: Traces an ellipse in starlight and explains orbit. Ambient: Stargazing alone, occasionally writing in a journal."));

    AddLegendary(
        TEXT("florence-nightingale"),
        TEXT("Florence Nightingale"),
        TEXT("data-stream"),
        TEXT("FirstVisit: Shows her polar area chart — the first infographic — and explains how data saved lives. Ambient: Reviewing charts quietly."));

    AddLegendary(
        TEXT("mary-anning"),
        TEXT("Mary Anning"),
        TEXT("frost-peaks"),
        TEXT("FirstVisit: Brushes dust off a fossil embedded in the ice and speaks about what it means. Ambient: Chipping at rock near the cliffs."));

    AddLegendary(
        TEXT("wangari-maathai"),
        TEXT("Wangari Maathai"),
        TEXT("meadow-lab"),
        TEXT("FirstVisit: Plants a symbolic tree and speaks about resistance and hope. Ambient: Walking through the meadow, naming every plant."));

    AddLegendary(
        TEXT("langston-hughes"),
        TEXT("Langston Hughes"),
        TEXT("rhyme-docks"),
        TEXT("FirstVisit: Recites a short poem he wrote for this world specifically. Ambient: Sitting on a dock, humming jazz, occasionally writing."));

    AddLegendary(
        TEXT("william-harvey"),
        TEXT("William Harvey"),
        TEXT("body-atlas"),
        TEXT("FirstVisit: Traces the path of blood circulation with a glowing light. Ambient: Studying a translucent heart model."));

    AddLegendary(
        TEXT("homer"),
        TEXT("Homer"),
        TEXT("rhyme-docks"),
        TEXT("FirstVisit: Tells the opening lines of the Odyssey in a voice that fills the whole world. Ambient: Sitting in shadow near the water, telling stories to no one."));
}
