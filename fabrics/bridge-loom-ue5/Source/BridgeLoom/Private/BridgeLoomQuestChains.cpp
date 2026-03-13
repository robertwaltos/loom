// Copyright Koydo. All Rights Reserved.
// BridgeLoomQuestChains.cpp

#include "BridgeLoomQuestChains.h"

UBridgeLoomQuestChains::UBridgeLoomQuestChains()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UBridgeLoomQuestChains::BeginPlay()
{
    Super::BeginPlay();
    if (QuestDefinitions.IsEmpty()) InitDefaultQuestDefs();
}

// ─── Progression ─────────────────────────────────────────────────

void UBridgeLoomQuestChains::RecordWorldEntryCompletion(const FString& KindlerId,
    const FString& WorldId)
{
    FLoomKindlerQuestState& State = GetOrCreateState(KindlerId);
    State.CompletedEntryWorldIds.Add(WorldId);

    // Check whether any locked quest can now be unlocked
    for (const FLoomQuestChainDefinition& Quest : QuestDefinitions)
    {
        ELoomQuestChainStatus* ExistingStatus = State.QuestStatuses.Find(Quest.QuestId);
        if (ExistingStatus && *ExistingStatus != ELoomQuestChainStatus::Locked) continue;

        EvaluateQuestUnlock(KindlerId, State, Quest);
    }
}

FLoomQuestCompletionResult UBridgeLoomQuestChains::CompleteQuestStep(
    const FString& KindlerId, const FString& QuestId, int32 StepIndex)
{
    FLoomQuestCompletionResult Result;
    Result.QuestId = QuestId;
    Result.bAllStepsComplete = false;
    Result.StepsRemaining    = 0;
    Result.SparkGained       = 0;

    FLoomQuestChainDefinition QuestDef;
    if (!GetQuestById(QuestId, QuestDef)) return Result;

    FLoomKindlerQuestState& State = GetOrCreateState(KindlerId);

    // Mark the questas in-progress if it was available
    ELoomQuestChainStatus& QStatus = State.QuestStatuses.FindOrAdd(QuestId,
        ELoomQuestChainStatus::Locked);
    if (QStatus == ELoomQuestChainStatus::Available)
        QStatus = ELoomQuestChainStatus::InProgress;

    // Record this step
    TSet<int32>& CompletedSteps = State.CompletedSteps.FindOrAdd(QuestId);
    CompletedSteps.Add(StepIndex);

    // Fire step-completed delegate
    if (QuestDef.Steps.IsValidIndex(StepIndex))
    {
        OnQuestStepCompleted.Broadcast(KindlerId, QuestDef.Steps[StepIndex]);
    }

    // Evaluate completion
    int32 TotalSteps   = QuestDef.Steps.Num();
    int32 DoneSteps    = CompletedSteps.Num();
    int32 Remaining    = FMath::Max(0, TotalSteps - DoneSteps);
    bool  bAllComplete = (Remaining == 0);

    Result.StepsRemaining = Remaining;
    Result.bAllStepsComplete = bAllComplete;

    if (bAllComplete)
    {
        QStatus = ELoomQuestChainStatus::Completed;
        Result.SparkGained = FMath::Clamp(QuestDef.SparkReward, SparkGainQuestMin, SparkGainQuestMax);
        OnQuestChainCompleted.Broadcast(KindlerId, Result);
    }

    return Result;
}

// ─── Queries ─────────────────────────────────────────────────────

TArray<FLoomQuestAvailabilityResult> UBridgeLoomQuestChains::GetAllQuestAvailability(
    const FString& KindlerId)
{
    TArray<FLoomQuestAvailabilityResult> Results;
    FLoomKindlerQuestState& State = GetOrCreateState(KindlerId);

    for (const FLoomQuestChainDefinition& Quest : QuestDefinitions)
    {
        FLoomQuestAvailabilityResult AR;
        AR.QuestId = Quest.QuestId;

        ELoomQuestChainStatus* Existing = State.QuestStatuses.Find(Quest.QuestId);
        if (Existing)
        {
            AR.Status = *Existing;
        }
        else
        {
            // Compute on the fly
            TArray<FString> Missing;
            for (const FString& WId : Quest.WorldIds)
                if (!State.CompletedEntryWorldIds.Contains(WId)) Missing.Add(WId);
            AR.Status = Missing.IsEmpty()
                ? ELoomQuestChainStatus::Available
                : ELoomQuestChainStatus::Locked;
            AR.MissingWorldIds = Missing;
        }
        Results.Add(AR);
    }
    return Results;
}

ELoomQuestChainStatus UBridgeLoomQuestChains::GetQuestStatus(
    const FString& KindlerId, const FString& QuestId)
{
    FLoomKindlerQuestState& State = GetOrCreateState(KindlerId);
    ELoomQuestChainStatus* Found = State.QuestStatuses.Find(QuestId);
    if (Found) return *Found;
    return IsQuestUnlocked(State, QuestId)
        ? ELoomQuestChainStatus::Available
        : ELoomQuestChainStatus::Locked;
}

TArray<FLoomQuestChainDefinition> UBridgeLoomQuestChains::GetQuestsByCategory(
    ELoomQuestCategory Category) const
{
    TArray<FLoomQuestChainDefinition> Result;
    for (const FLoomQuestChainDefinition& Q : QuestDefinitions)
        if (Q.Category == Category) Result.Add(Q);
    return Result;
}

bool UBridgeLoomQuestChains::GetQuestById(const FString& QuestId,
    FLoomQuestChainDefinition& OutQuest) const
{
    for (const FLoomQuestChainDefinition& Q : QuestDefinitions)
    {
        if (Q.QuestId == QuestId) { OutQuest = Q; return true; }
    }
    return false;
}

int32 UBridgeLoomQuestChains::GetCompletedStepCount(const FString& KindlerId,
    const FString& QuestId) const
{
    const FLoomKindlerQuestState* State = KindlerStates.Find(KindlerId);
    if (!State) return 0;
    const TSet<int32>* Steps = State->CompletedSteps.Find(QuestId);
    return Steps ? Steps->Num() : 0;
}

// ─── Private helpers ─────────────────────────────────────────────

FLoomKindlerQuestState& UBridgeLoomQuestChains::GetOrCreateState(const FString& KindlerId)
{
    FLoomKindlerQuestState* Existing = KindlerStates.Find(KindlerId);
    if (Existing) return *Existing;

    FLoomKindlerQuestState NewState;
    NewState.KindlerId = KindlerId;
    KindlerStates.Add(KindlerId, MoveTemp(NewState));
    return KindlerStates[KindlerId];
}

void UBridgeLoomQuestChains::EvaluateQuestUnlock(const FString& KindlerId,
    FLoomKindlerQuestState& State,
    const FLoomQuestChainDefinition& Quest)
{
    if (!IsQuestUnlocked(State, Quest.QuestId)) return;

    State.QuestStatuses.Add(Quest.QuestId, ELoomQuestChainStatus::Available);
    OnQuestUnlocked.Broadcast(KindlerId, Quest);
}

bool UBridgeLoomQuestChains::IsQuestUnlocked(const FLoomKindlerQuestState& State,
    const FString& QuestId) const
{
    FLoomQuestChainDefinition Quest;
    if (!GetQuestById(QuestId, Quest)) return false;

    for (const FString& WId : Quest.WorldIds)
    {
        if (!State.CompletedEntryWorldIds.Contains(WId)) return false;
    }
    return true;
}

// ─── Default data (all 20 quest chains) ──────────────────────────

void UBridgeLoomQuestChains::InitDefaultQuestDefs()
{
    auto MakeStep = [](int32 Idx, const FString& WId, const FString& Desc) -> FLoomQuestStep
    {
        FLoomQuestStep S;
        S.StepIndex = Idx; S.WorldId = WId; S.Description = Desc;
        return S;
    };

    auto AddQuest = [&](const FString& Id, const FString& Name,
                        ELoomQuestCategory Cat, const FString& Desc,
                        const TArray<FString>& Worlds,
                        const TArray<FLoomQuestStep>& Steps,
                        int32 Spark)
    {
        FLoomQuestChainDefinition Q;
        Q.QuestId = Id; Q.Name = Name;
        Q.Category = Cat; Q.Description = Desc;
        Q.WorldIds = Worlds; Q.Steps = Steps;
        Q.SparkReward = Spark;
        QuestDefinitions.Add(Q);
    };

    // ── STEM (4) ──────────────────────────────────────────────
    AddQuest(TEXT("climate-detective"), TEXT("The Climate Detective"),
        ELoomQuestCategory::STEM,
        TEXT("Follow the climate mystery from weather data to plant die-offs to ice core evidence to data analysis"),
        { TEXT("cloud-kingdom"), TEXT("meadow-lab"), TEXT("frost-peaks"), TEXT("data-stream") },
        {
            MakeStep(0, TEXT("cloud-kingdom"),  TEXT("Investigate the anomalous cold zone")),
            MakeStep(1, TEXT("meadow-lab"),     TEXT("Examine plant die-off patterns")),
            MakeStep(2, TEXT("frost-peaks"),    TEXT("Analyze ice core evidence")),
            MakeStep(3, TEXT("data-stream"),    TEXT("Complete the final data analysis")),
        }, 50);

    AddQuest(TEXT("energy-chain"), TEXT("The Energy Chain"),
        ELoomQuestCategory::STEM,
        TEXT("Trace energy from generation through mechanical transmission to digital control"),
        { TEXT("circuit-marsh"), TEXT("savanna-workshop"), TEXT("magnet-hills"), TEXT("code-canyon") },
        {
            MakeStep(0, TEXT("circuit-marsh"),      TEXT("Study energy generation from solar panels")),
            MakeStep(1, TEXT("savanna-workshop"),   TEXT("Follow mechanical energy transmission")),
            MakeStep(2, TEXT("magnet-hills"),       TEXT("Observe force application")),
            MakeStep(3, TEXT("code-canyon"),        TEXT("Program digital control systems")),
        }, 50);

    AddQuest(TEXT("water-trail"), TEXT("The Water Trail"),
        ELoomQuestCategory::STEM,
        TEXT("Follow a water molecule from evaporation to ocean to ice to the human body"),
        { TEXT("cloud-kingdom"), TEXT("tideline-bay"), TEXT("frost-peaks"), TEXT("body-atlas") },
        {
            MakeStep(0, TEXT("cloud-kingdom"),  TEXT("Track evaporation processes")),
            MakeStep(1, TEXT("tideline-bay"),   TEXT("Follow the ocean cycle")),
            MakeStep(2, TEXT("frost-peaks"),    TEXT("Study water as ice")),
            MakeStep(3, TEXT("body-atlas"),     TEXT("Find water in the human body")),
        }, 50);

    AddQuest(TEXT("space-mission"), TEXT("The Space Mission"),
        ELoomQuestCategory::STEM,
        TEXT("Design, program, build, and analyze a space mission across four worlds"),
        { TEXT("starfall-observatory"), TEXT("code-canyon"), TEXT("savanna-workshop"), TEXT("data-stream") },
        {
            MakeStep(0, TEXT("starfall-observatory"), TEXT("Plan the astronomy with Riku")),
            MakeStep(1, TEXT("code-canyon"),          TEXT("Write guidance software with Pixel")),
            MakeStep(2, TEXT("savanna-workshop"),     TEXT("Engineer the vehicle with Zara")),
            MakeStep(3, TEXT("data-stream"),          TEXT("Process mission data with Yuki")),
        }, 50);

    // ── Language Arts (3) ─────────────────────────────────────
    AddQuest(TEXT("lost-story"), TEXT("The Lost Story"),
        ELoomQuestCategory::LanguageArts,
        TEXT("A story exists in fragments across four worlds, each in a different language and cultural tradition"),
        { TEXT("story-tree"), TEXT("translation-garden"), TEXT("folklore-bazaar"), TEXT("nonfiction-fleet") },
        {
            MakeStep(0, TEXT("story-tree"),          TEXT("Find the first narrative fragment")),
            MakeStep(1, TEXT("translation-garden"),  TEXT("Translate the second fragment")),
            MakeStep(2, TEXT("folklore-bazaar"),     TEXT("Discover the cultural fragment")),
            MakeStep(3, TEXT("nonfiction-fleet"),    TEXT("Research the final piece")),
        }, 50);

    AddQuest(TEXT("message-bottle"), TEXT("The Message in a Bottle"),
        ELoomQuestCategory::LanguageArts,
        TEXT("Piece together a multi-format message across four worlds"),
        { TEXT("diary-lighthouse"), TEXT("reading-reef"), TEXT("illustration-cove"), TEXT("editing-tower") },
        {
            MakeStep(0, TEXT("reading-reef"),        TEXT("Find the washed-up message")),
            MakeStep(1, TEXT("diary-lighthouse"),    TEXT("Match the diary entry")),
            MakeStep(2, TEXT("illustration-cove"),   TEXT("Decode the illustrations")),
            MakeStep(3, TEXT("editing-tower"),       TEXT("Assemble and edit the full message")),
        }, 40);

    AddQuest(TEXT("great-debate"), TEXT("The Great Debate"),
        ELoomQuestCategory::LanguageArts,
        TEXT("Prepare for and execute a debate: research, structure, deliver"),
        { TEXT("debate-arena"), TEXT("nonfiction-fleet"), TEXT("grammar-bridge"), TEXT("punctuation-station") },
        {
            MakeStep(0, TEXT("nonfiction-fleet"),       TEXT("Research evidence for both sides")),
            MakeStep(1, TEXT("grammar-bridge"),         TEXT("Structure the argument")),
            MakeStep(2, TEXT("punctuation-station"),    TEXT("Perfect the delivery")),
            MakeStep(3, TEXT("debate-arena"),           TEXT("Present the debate")),
        }, 40);

    // ── Financial Literacy (2) ────────────────────────────────
    AddQuest(TEXT("the-startup"), TEXT("The Startup"),
        ELoomQuestCategory::FinancialLiteracy,
        TEXT("Start a virtual business from idea through budgeting to market day to paying taxes"),
        { TEXT("entrepreneurs-workshop"), TEXT("budget-kitchen"), TEXT("market-square"), TEXT("tax-office") },
        {
            MakeStep(0, TEXT("entrepreneurs-workshop"), TEXT("Develop the business idea")),
            MakeStep(1, TEXT("budget-kitchen"),         TEXT("Create the budget")),
            MakeStep(2, TEXT("market-square"),          TEXT("Launch on market day")),
            MakeStep(3, TEXT("tax-office"),             TEXT("File taxes on earnings")),
        }, 40);

    AddQuest(TEXT("community-fund"), TEXT("The Community Fund"),
        ELoomQuestCategory::FinancialLiteracy,
        TEXT("Fund a new school through sharing, giving, saving, and smart spending"),
        { TEXT("sharing-meadow"), TEXT("charity-harbor"), TEXT("savings-vault"), TEXT("needs-wants-bridge") },
        {
            MakeStep(0, TEXT("sharing-meadow"),         TEXT("Pool community resources")),
            MakeStep(1, TEXT("charity-harbor"),         TEXT("Organize charitable giving")),
            MakeStep(2, TEXT("savings-vault"),          TEXT("Set up a savings plan")),
            MakeStep(3, TEXT("needs-wants-bridge"),     TEXT("Prioritize spending decisions")),
        }, 40);

    // ── Cross-Realm (11) ──────────────────────────────────────
    AddQuest(TEXT("time-capsule"), TEXT("The Time Capsule"),
        ELoomQuestCategory::CrossRealm,
        TEXT("Create a time capsule that spans history, science, story, and value"),
        { TEXT("time-gallery"), TEXT("frost-peaks"), TEXT("story-tree"), TEXT("savings-vault") },
        {
            MakeStep(0, TEXT("time-gallery"),   TEXT("Choose items representing the present")),
            MakeStep(1, TEXT("frost-peaks"),    TEXT("Select materials that will survive")),
            MakeStep(2, TEXT("story-tree"),     TEXT("Tell the story of the capsule")),
            MakeStep(3, TEXT("savings-vault"),  TEXT("Ensure it retains value")),
        }, 50);

    AddQuest(TEXT("language-numbers"), TEXT("The Language of Numbers"),
        ELoomQuestCategory::CrossRealm,
        TEXT("Explore what language really means across math, music, code, and words"),
        { TEXT("number-garden"), TEXT("translation-garden"), TEXT("music-meadow"), TEXT("code-canyon") },
        {
            MakeStep(0, TEXT("number-garden"),       TEXT("Discover math as a language")),
            MakeStep(1, TEXT("translation-garden"),  TEXT("Compare human languages")),
            MakeStep(2, TEXT("music-meadow"),        TEXT("Hear music as a language")),
            MakeStep(3, TEXT("code-canyon"),         TEXT("Write code as a language")),
        }, 50);

    AddQuest(TEXT("body-budget"), TEXT("The Body Budget"),
        ELoomQuestCategory::CrossRealm,
        TEXT("Create a body budget: calories, energy, sleep, and emotional health"),
        { TEXT("body-atlas"), TEXT("budget-kitchen"), TEXT("wellness-garden"), TEXT("data-stream") },
        {
            MakeStep(0, TEXT("body-atlas"),         TEXT("Study calorie inputs and outputs")),
            MakeStep(1, TEXT("budget-kitchen"),     TEXT("Plan nutritional budgets")),
            MakeStep(2, TEXT("wellness-garden"),    TEXT("Balance emotional resources")),
            MakeStep(3, TEXT("data-stream"),        TEXT("Track the body budget data")),
        }, 40);

    AddQuest(TEXT("story-money"), TEXT("The Story of Money"),
        ELoomQuestCategory::CrossRealm,
        TEXT("From barter to digital currency to philosophical questions about value"),
        { TEXT("barter-docks"), TEXT("market-square"), TEXT("code-canyon"), TEXT("thinking-grove") },
        {
            MakeStep(0, TEXT("barter-docks"),    TEXT("Experience barter exchange")),
            MakeStep(1, TEXT("market-square"),   TEXT("Discover coins and currency")),
            MakeStep(2, TEXT("code-canyon"),     TEXT("Understand digital currency")),
            MakeStep(3, TEXT("thinking-grove"),  TEXT("Reflect on what value means")),
        }, 50);

    AddQuest(TEXT("invention-school"), TEXT("The Invention of School"),
        ELoomQuestCategory::CrossRealm,
        TEXT("Trace why schools exist from labor to stories to funding to learning"),
        { TEXT("job-fair"), TEXT("story-tree"), TEXT("tax-office"), TEXT("wellness-garden") },
        {
            MakeStep(0, TEXT("job-fair"),           TEXT("Discover child labor history")),
            MakeStep(1, TEXT("story-tree"),         TEXT("Explore education as narrative")),
            MakeStep(2, TEXT("tax-office"),         TEXT("Understand public school funding")),
            MakeStep(3, TEXT("wellness-garden"),    TEXT("Reflect on the experience of learning")),
        }, 40);

    AddQuest(TEXT("ecosystem-economy"), TEXT("The Ecosystem Economy"),
        ELoomQuestCategory::CrossRealm,
        TEXT("Compare natural ecosystems to human economics"),
        { TEXT("meadow-lab"), TEXT("sharing-meadow"), TEXT("tideline-bay"), TEXT("investment-greenhouse") },
        {
            MakeStep(0, TEXT("meadow-lab"),             TEXT("Study energy flows in nature")),
            MakeStep(1, TEXT("sharing-meadow"),         TEXT("Compare to resource sharing")),
            MakeStep(2, TEXT("tideline-bay"),           TEXT("Observe ocean resource cycles")),
            MakeStep(3, TEXT("investment-greenhouse"), TEXT("Map natural diversification")),
        }, 40);

    AddQuest(TEXT("bridge-between"), TEXT("The Bridge Between Worlds"),
        ELoomQuestCategory::CrossRealm,
        TEXT("Three bridges, three domains — what is a bridge, really?"),
        { TEXT("grammar-bridge"), TEXT("savanna-workshop"), TEXT("needs-wants-bridge"), TEXT("thinking-grove") },
        {
            MakeStep(0, TEXT("grammar-bridge"),     TEXT("Use grammar bridges to connect ideas")),
            MakeStep(1, TEXT("savanna-workshop"),   TEXT("Build physical bridges")),
            MakeStep(2, TEXT("needs-wants-bridge"), TEXT("Bridge needs and wants")),
            MakeStep(3, TEXT("thinking-grove"),     TEXT("Reflect with Old Rowan on what bridges mean")),
        }, 40);

    AddQuest(TEXT("archive-expedition"), TEXT("The Archive Expedition"),
        ELoomQuestCategory::CrossRealm,
        TEXT("The Librarian sends you to visit every world and bring one thing back"),
        { TEXT("great-archive") },
        {
            MakeStep(0, TEXT("great-archive"), TEXT("Receive the mission from The Librarian")),
            MakeStep(1, TEXT("great-archive"), TEXT("Visit all 50 worlds and collect one memory from each")),
            MakeStep(2, TEXT("great-archive"), TEXT("Display all 50 contributions in the Archive")),
        }, 50);

    AddQuest(TEXT("fading-investigation"), TEXT("The Fading Investigation"),
        ELoomQuestCategory::CrossRealm,
        TEXT("Use the scientific method to investigate why the Fading happens"),
        { TEXT("great-archive"), TEXT("forgetting-well"), TEXT("thinking-grove"), TEXT("discovery-trail") },
        {
            MakeStep(0, TEXT("great-archive"),    TEXT("Research the Fading phenomenon")),
            MakeStep(1, TEXT("discovery-trail"),  TEXT("Form and test hypotheses")),
            MakeStep(2, TEXT("thinking-grove"),   TEXT("Discuss with Old Rowan")),
            MakeStep(3, TEXT("forgetting-well"),  TEXT("Accept entropy, then fight it")),
        }, 50);

    AddQuest(TEXT("universal-declaration"), TEXT("The Universal Declaration"),
        ELoomQuestCategory::CrossRealm,
        TEXT("Create a Universal Declaration of What Children Deserve to Know"),
        { TEXT("thinking-grove"), TEXT("debate-arena"), TEXT("translation-garden"), TEXT("time-gallery") },
        {
            MakeStep(0, TEXT("debate-arena"),        TEXT("Draft the declaration")),
            MakeStep(1, TEXT("translation-garden"),  TEXT("Translate into many languages")),
            MakeStep(2, TEXT("time-gallery"),        TEXT("Place it in historical context")),
            MakeStep(3, TEXT("thinking-grove"),      TEXT("Reflect on its meaning")),
        }, 50);

    AddQuest(TEXT("compass-origin"), TEXT("Compass's Origin"),
        ELoomQuestCategory::CrossRealm,
        TEXT("Discover who Compass is — the first Kindler, the first child who ever visited these worlds"),
        { TEXT("great-archive"), TEXT("forgetting-well") },
        {
            MakeStep(0, TEXT("great-archive"),    TEXT("Begin investigating Compass's past")),
            MakeStep(1, TEXT("forgetting-well"),  TEXT("Descend through Compass's memories")),
            MakeStep(2, TEXT("great-archive"),    TEXT("Understand Compass's choice to stay")),
        }, 50);
}
