// Copyright Koydo. All Rights Reserved.
// BridgeLoomEntryTypes.cpp

#include "BridgeLoomEntryTypes.h"

UBridgeLoomEntryTypes::UBridgeLoomEntryTypes()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UBridgeLoomEntryTypes::BeginPlay()
{
    Super::BeginPlay();
    if (UnsolvedMysteries.IsEmpty() && LivingExperiments.IsEmpty() && ThoughtExperiments.IsEmpty())
        InitDefaultEntries();
}

// ─── Complete an entry ────────────────────────────────────────────

FLoomExpandedEntryResult UBridgeLoomEntryTypes::CompleteEntry(const FString& EntryId)
{
    FLoomExpandedEntryResult Result;
    Result.EntryId    = EntryId;
    Result.SparkGained = ComputeSparkGain();

    // Search mysteries
    for (const FLoomUnsolvedMysteryEntry& E : UnsolvedMysteries)
    {
        if (E.EntryId == EntryId)
        {
            Result.EntryType = ELoomEntryTypeName::UnsolvedMystery;
            OnExpandedEntryCompleted.Broadcast(Result);
            return Result;
        }
    }
    // Search living experiments
    for (const FLoomLivingExperimentEntry& E : LivingExperiments)
    {
        if (E.EntryId == EntryId)
        {
            Result.EntryType = ELoomEntryTypeName::LivingExperiment;
            OnExpandedEntryCompleted.Broadcast(Result);
            return Result;
        }
    }
    // Search thought experiments
    for (const FLoomThoughtExperimentEntry& E : ThoughtExperiments)
    {
        if (E.EntryId == EntryId)
        {
            Result.EntryType = ELoomEntryTypeName::ThoughtExperiment;
            OnExpandedEntryCompleted.Broadcast(Result);
            return Result;
        }
    }

    // Entry not found — still award spark and fire delegate
    OnExpandedEntryCompleted.Broadcast(Result);
    return Result;
}

// ─── Getters ─────────────────────────────────────────────────────

bool UBridgeLoomEntryTypes::GetMysteryById(const FString& EntryId,
    FLoomUnsolvedMysteryEntry& OutEntry) const
{
    for (const FLoomUnsolvedMysteryEntry& E : UnsolvedMysteries)
    {
        if (E.EntryId == EntryId) { OutEntry = E; return true; }
    }
    return false;
}

bool UBridgeLoomEntryTypes::GetExperimentById(const FString& EntryId,
    FLoomLivingExperimentEntry& OutEntry) const
{
    for (const FLoomLivingExperimentEntry& E : LivingExperiments)
    {
        if (E.EntryId == EntryId) { OutEntry = E; return true; }
    }
    return false;
}

bool UBridgeLoomEntryTypes::GetThoughtExperimentById(const FString& EntryId,
    FLoomThoughtExperimentEntry& OutEntry) const
{
    for (const FLoomThoughtExperimentEntry& E : ThoughtExperiments)
    {
        if (E.EntryId == EntryId) { OutEntry = E; return true; }
    }
    return false;
}

TArray<FString> UBridgeLoomEntryTypes::GetEntryIdsForWorld(const FString& WorldId) const
{
    TArray<FString> Result;
    for (const FLoomUnsolvedMysteryEntry& E : UnsolvedMysteries)
        if (E.WorldIds.Contains(WorldId)) Result.Add(E.EntryId);
    for (const FLoomLivingExperimentEntry& E : LivingExperiments)
        if (E.WorldIds.Contains(WorldId)) Result.Add(E.EntryId);
    for (const FLoomThoughtExperimentEntry& E : ThoughtExperiments)
        if (E.WorldIds.Contains(WorldId)) Result.Add(E.EntryId);
    return Result;
}

ELoomEntryTypeName UBridgeLoomEntryTypes::GetEntryType(const FString& EntryId) const
{
    for (const FLoomUnsolvedMysteryEntry& E : UnsolvedMysteries)
        if (E.EntryId == EntryId) return ELoomEntryTypeName::UnsolvedMystery;
    for (const FLoomLivingExperimentEntry& E : LivingExperiments)
        if (E.EntryId == EntryId) return ELoomEntryTypeName::LivingExperiment;
    return ELoomEntryTypeName::ThoughtExperiment;
}

// ─── Spark helper ─────────────────────────────────────────────────

int32 UBridgeLoomEntryTypes::ComputeSparkGain() const
{
    return FMath::RandRange(SparkGainMin, SparkGainMax);
}

// ─── Default data ────────────────────────────────────────────────

void UBridgeLoomEntryTypes::InitDefaultEntries()
{
    // ── Unsolved Mysteries ─────────────────────────────────────
    auto AddMystery = [&](const FString& Id, const FString& Title,
                          ELoomMysteryStatus Status,
                          const FString& Known, const FString& Unknown,
                          const FString& Prompt5, const FString& Prompt8,
                          const TArray<FString>& Worlds)
    {
        FLoomUnsolvedMysteryEntry E;
        E.EntryId = Id; E.Title = Title; E.Status = Status;
        E.KnownTerritory = Known; E.UnknownTerritory = Unknown;
        E.ExplorerPrompt.Ages5to7  = Prompt5;
        E.ExplorerPrompt.Ages8to10 = Prompt8;
        E.WorldIds = Worlds;
        UnsolvedMysteries.Add(E);
    };

    AddMystery(
        TEXT("dark-matter"), TEXT("What is Dark Matter?"),
        ELoomMysteryStatus::Open,
        TEXT("We can detect dark matter's gravity; it makes up ~27% of the universe."),
        TEXT("We have never seen or touched a single dark matter particle."),
        TEXT("If the universe has invisible stuff — how do scientists know it's there?"),
        TEXT("Dark matter bends light and holds galaxies together. What experiment could finally reveal it?"),
        { TEXT("starfall-observatory"), TEXT("data-stream") });

    AddMystery(
        TEXT("consciousness"), TEXT("What Is Consciousness?"),
        ELoomMysteryStatus::Contested,
        TEXT("We know the brain creates awareness — and can describe much of its structure."),
        TEXT("No theory fully explains why anything feels like something."),
        TEXT("When you dream, who is watching the dream?"),
        TEXT("Could a computer ever truly feel something, or only act like it does?"),
        { TEXT("body-atlas"), TEXT("code-canyon") });

    AddMystery(
        TEXT("life-elsewhere"), TEXT("Is There Life Elsewhere in the Universe?"),
        ELoomMysteryStatus::Open,
        TEXT("Life appeared on Earth within a few hundred million years of it forming."),
        TEXT("We have found no confirmed evidence of life anywhere else yet."),
        TEXT("The universe has billions and billions of planets. Do any have creatures on them?"),
        TEXT("What are the conditions life needs, and how many places in the galaxy might have them?"),
        { TEXT("starfall-observatory"), TEXT("tideline-bay") });

    AddMystery(
        TEXT("origin-of-language"), TEXT("How Did Human Language Begin?"),
        ELoomMysteryStatus::Contested,
        TEXT("We know language is uniquely human and that all languages share deep structure."),
        TEXT("No one knows exactly when, where, or how the first words were spoken."),
        TEXT("Before words, how did people share ideas? What was the first thing anyone ever said?"),
        TEXT("Was language invented once, or did it emerge separately in different places?"),
        { TEXT("story-tree"), TEXT("folklore-bazaar") });

    AddMystery(
        TEXT("deep-ocean"), TEXT("What Lives in the Deep Ocean?"),
        ELoomMysteryStatus::Open,
        TEXT("We have explored less than 20% of Earth's oceans."),
        TEXT("Most deep-ocean species are unknown to science."),
        TEXT("The deep ocean is totally dark and incredibly cold. What strange creatures live there?"),
        TEXT("Why do deep-sea creatures sometimes glow? What evolutionary advantage could that give?"),
        { TEXT("tideline-bay"), TEXT("meadow-lab") });

    // ── Living Experiments ────────────────────────────────────
    auto AddExp = [&](const FString& Id, const FString& Title,
                      ELoomExperimentStatus Status,
                      const FString& Question, const FString& Data,
                      const FString& Changes, const FString& Connection,
                      const TArray<FString>& Worlds)
    {
        FLoomLivingExperimentEntry E;
        E.EntryId = Id; E.Title = Title; E.Status = Status;
        E.TheQuestion = Question; E.CurrentData = Data;
        E.WhatChangesThis = Changes; E.WorldConnection = Connection;
        E.WorldIds = Worlds;
        LivingExperiments.Add(E);
    };

    AddExp(
        TEXT("climate-tipping-points"),
        TEXT("Are We Close to Climate Tipping Points?"),
        ELoomExperimentStatus::Ongoing,
        TEXT("At what temperature increase do large Earth systems flip irreversibly?"),
        TEXT("Global average temperature has risen ~1.1°C above pre-industrial. Greenland ice sheet mass loss is accelerating."),
        TEXT("New satellite ice data, updated climate models, and international carbon emission pledges."),
        TEXT("The Cloud Kingdom tracks storm intensity as a proxy for energy imbalance."),
        { TEXT("cloud-kingdom"), TEXT("frost-peaks"), TEXT("data-stream") });

    AddExp(
        TEXT("gut-microbiome"),
        TEXT("How Does the Gut Microbiome Affect the Brain?"),
        ELoomExperimentStatus::Ongoing,
        TEXT("Do the bacteria in your gut influence mood, cognition, and behavior?"),
        TEXT("Studies show gut microbiome changes correlate with anxiety and depression in mice. Human trials ongoing."),
        TEXT("Larger human randomized controlled trials and new sequencing technology."),
        TEXT("The Body Atlas documents the gut-brain axis as a new frontier in biology."),
        { TEXT("body-atlas"), TEXT("greenhouse-spiral") });

    AddExp(
        TEXT("bee-colony-collapse"),
        TEXT("What Is Causing Bee Colony Collapse?"),
        ELoomExperimentStatus::Ongoing,
        TEXT("Why are managed honeybee colonies dying at unusually high rates?"),
        TEXT("~30-40% annual losses reported since 2006. Linked factors: pesticides, pathogens, habitat loss."),
        TEXT("Neonicotinoid pesticide regulations, new treatments for varroa mite, and habitat restoration results."),
        TEXT("Meadow Lab tracks pollinator counts as a signal of ecosystem health."),
        { TEXT("meadow-lab"), TEXT("tideline-bay") });

    AddExp(
        TEXT("poverty-universal-basic-income"),
        TEXT("Does Universal Basic Income Reduce Poverty?"),
        ELoomExperimentStatus::Ongoing,
        TEXT("If everyone received a basic income with no conditions, what would happen to work and wellbeing?"),
        TEXT("Pilot programs in Finland, Kenya, and Stockton CA show modest wellbeing improvements."),
        TEXT("Scale-up results in major economies and long-term employment data."),
        TEXT("The Market Square models what happens to spending when baseline security is guaranteed."),
        { TEXT("market-square"), TEXT("budget-kitchen") });

    // ── Thought Experiments ───────────────────────────────────
    auto AddThought = [&](const FString& Id, const FString& Title,
                          const FString& Origin, const FString& Setup,
                          const FString& Question, const FString& Tests,
                          const FString& NoAnswer, const FString& GuideMoment,
                          const TArray<FString>& Worlds)
    {
        FLoomThoughtExperimentEntry E;
        E.EntryId = Id; E.Title = Title; E.Origin = Origin;
        E.TheSetup = Setup; E.TheQuestion = Question;
        E.WhatItTests = Tests; E.NoAnswer = NoAnswer;
        E.GuideMoment = GuideMoment;
        E.WorldIds = Worlds;
        ThoughtExperiments.Add(E);
    };

    AddThought(
        TEXT("trolley-problem"),
        TEXT("The Trolley Problem"),
        TEXT("Philippa Foot, 1967, expanded by Judith Jarvis Thomson"),
        TEXT("A runaway trolley is headed toward five people on the track. You can pull a lever to divert it to a side track, where it will kill one person."),
        TEXT("Should you pull the lever?"),
        TEXT("The moral difference between action and inaction; whether consequences alone determine right from wrong."),
        TEXT("Philosophers have debated this for decades. Most people pull the lever — but almost no one would push a large man off a bridge to stop the trolley, even if the math is the same."),
        TEXT("'What changed? The numbers are the same — but something feels different. What is that feeling telling you?'"),
        { TEXT("debate-arena"), TEXT("story-tree") });

    AddThought(
        TEXT("ship-of-theseus"),
        TEXT("The Ship of Theseus"),
        TEXT("Ancient Greece — attributed to Plutarch"),
        TEXT("The hero Theseus had a famous ship. Over the years, every plank was replaced. Is it still the same ship?"),
        TEXT("If everything about something changes, is it still the same thing?"),
        TEXT("Identity, continuity, and what makes something 'the same' over time."),
        TEXT("There is no single correct answer. Thinkers disagree — and the debate continues in courts, in art, and in questions about identity."),
        TEXT("'You grow new cells every few years. Are you the same person you were when you were five?'"),
        { TEXT("number-garden"), TEXT("code-canyon") });

    AddThought(
        TEXT("veil-of-ignorance"),
        TEXT("The Veil of Ignorance"),
        TEXT("John Rawls, 1971, in A Theory of Justice"),
        TEXT("Imagine you are designing a society — but you don't know what role you'll be born into. You might be rich or poor, any nationality, any ability level."),
        TEXT("What rules would you choose?"),
        TEXT("Fairness, justice, and whether people's choices about equality change when self-interest is removed."),
        TEXT("Rawls argued people would choose fairness. Other philosophers disagree about what 'fair' means when no one knows their position."),
        TEXT("'If you didn't know whether you'd be the one with the most or the least — what rules would feel safe?'"),
        { TEXT("debate-arena"), TEXT("market-square") });

    AddThought(
        TEXT("chinese-room"),
        TEXT("The Chinese Room"),
        TEXT("John Searle, 1980"),
        TEXT("A person sits in a room, passing symbols through slots using a rulebook. To people outside, it looks like the room understands Chinese. But the person inside understands nothing."),
        TEXT("Does following rules about meaning give you meaning?"),
        TEXT("Whether computation is enough for understanding, and whether minds can exist in machines."),
        TEXT("Searle argued no — understanding requires more than symbol manipulation. Many AI researchers disagree."),
        TEXT("'If a computer says the right words — does it understand what they mean?'"),
        { TEXT("code-canyon"), TEXT("body-atlas") });
}
