// Copyright Koydo. All Rights Reserved.
// BridgeLoomSeasonalContent.cpp

#include "BridgeLoomSeasonalContent.h"
#include "Engine/World.h"
#include "TimerManager.h"
#include "Misc/DateTime.h"
#include "Engine/AssetManager.h"
#include "StreamableManager.h"

UBridgeLoomSeasonalContent::UBridgeLoomSeasonalContent()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UBridgeLoomSeasonalContent::BeginPlay()
{
    Super::BeginPlay();

    if (MonthlyEvents.IsEmpty())
    {
        InitDefaultMonthlyEvents();
    }

    // Initial evaluation then set recurring timer
    EvaluateCalendar();

    GetWorld()->GetTimerManager().SetTimer(CalendarTickHandle,
        this, &UBridgeLoomSeasonalContent::EvaluateCalendar,
        CalendarTickInterval, /*bLoop=*/true);
}

// ─── Calendar Queries ─────────────────────────────────────────────

ELoomTimeOfDay UBridgeLoomSeasonalContent::GetCurrentTimeOfDay() const
{
    const int32 Hour = FDateTime::UtcNow().GetHour();
    return HourToTimeOfDay(Hour);
}

bool UBridgeLoomSeasonalContent::GetActiveMonthlyEvent(FLoomMonthlyEvent& OutEvent) const
{
    const ELoomMonth Month = static_cast<ELoomMonth>(FDateTime::UtcNow().GetMonth());
    for (const FLoomMonthlyEvent& Ev : MonthlyEvents)
    {
        if (Ev.Month == Month)
        {
            OutEvent = Ev;
            return true;
        }
    }
    return false;
}

TArray<FLoomTimeLockedContent> UBridgeLoomSeasonalContent::GetAvailableTimeLocked() const
{
    const ELoomTimeOfDay Tod = GetCurrentTimeOfDay();
    TArray<FLoomTimeLockedContent> Result;
    for (const FLoomTimeLockedContent& TLC : TimeLockedContent)
    {
        if (TLC.AvailableTimeOfDay == Tod) Result.Add(TLC);
    }
    return Result;
}

FLoomSeasonalCalendarState UBridgeLoomSeasonalContent::GetCalendarState() const
{
    return CachedState;
}

// ─── Prop Management ──────────────────────────────────────────────

void UBridgeLoomSeasonalContent::SpawnEventProps(const FString& WorldId)
{
    FLoomMonthlyEvent Event;
    if (!GetActiveMonthlyEvent(Event)) return;

    const TSoftClassPtr<AActor>* PropClassPtr = Event.PropClasses.Find(WorldId);
    if (!PropClassPtr || PropClassPtr->IsNull()) return;

    // Despawn any previous props for this world
    DespawnEventProps(WorldId);

    TWeakObjectPtr<UBridgeLoomSeasonalContent> WeakThis(this);
    const FString CapturedWorldId = WorldId;
    const TSoftClassPtr<AActor> CapturedClass = *PropClassPtr;

    FStreamableManager& StreamMgr = UAssetManager::GetStreamableManager();
    StreamMgr.RequestAsyncLoad(CapturedClass.ToSoftObjectPath(),
        [WeakThis, CapturedWorldId, CapturedClass]()
        {
            if (!WeakThis.IsValid()) return;

            UClass* ActorClass = CapturedClass.Get();
            UWorld* World = WeakThis->GetWorld();
            if (!ActorClass || !World) return;

            TArray<TWeakObjectPtr<AActor>>& PropsForWorld =
                WeakThis->SpawnedProps.FindOrAdd(CapturedWorldId);

            const int32 Limit = WeakThis->MaxPropsPerWorld;
            for (int32 i = 0; i < Limit; ++i)
            {
                FActorSpawnParameters Params;
                Params.SpawnCollisionHandlingOverride =
                    ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButAlwaysSpawn;

                const FVector Location = WeakThis->PropSpawnOffset
                    + FVector(i * 200.f, 0.f, 0.f);

                AActor* Spawned = World->SpawnActor<AActor>(
                    ActorClass, Location, FRotator::ZeroRotator, Params);

                if (Spawned)
                {
                    PropsForWorld.Add(Spawned);
                }
            }
        });
}

void UBridgeLoomSeasonalContent::DespawnEventProps(const FString& WorldId)
{
    TArray<TWeakObjectPtr<AActor>>* Props = SpawnedProps.Find(WorldId);
    if (!Props) return;

    for (TWeakObjectPtr<AActor>& ActorPtr : *Props)
    {
        if (ActorPtr.IsValid())
        {
            ActorPtr->Destroy();
        }
    }
    SpawnedProps.Remove(WorldId);
}

void UBridgeLoomSeasonalContent::DespawnAllEventProps()
{
    TArray<FString> WorldKeys;
    SpawnedProps.GetKeys(WorldKeys);
    for (const FString& Key : WorldKeys)
    {
        DespawnEventProps(Key);
    }
}

// ─── Calendar Evaluation ─────────────────────────────────────────

void UBridgeLoomSeasonalContent::EvaluateCalendar()
{
    const FDateTime Now    = FDateTime::UtcNow();
    const int32 NewHour    = Now.GetHour();
    const ELoomMonth NewMonth = static_cast<ELoomMonth>(Now.GetMonth());
    const ELoomTimeOfDay NewTod = HourToTimeOfDay(NewHour);

    // Time-of-day change
    if (NewTod != CachedState.TimeOfDay)
    {
        OnTimeOfDayChanged.Broadcast(CachedState.TimeOfDay, NewTod);
    }

    // Monthly event change
    const ELoomMonth OldMonth = CachedState.CurrentMonth;
    if (NewMonth != OldMonth)
    {
        // Broadcast end of old event
        for (const FLoomMonthlyEvent& Ev : MonthlyEvents)
        {
            if (Ev.Month == OldMonth)
            {
                OnMonthlyEventEnded.Broadcast(Ev);
                break;
            }
        }
        // Broadcast start of new event
        for (const FLoomMonthlyEvent& Ev : MonthlyEvents)
        {
            if (Ev.Month == NewMonth)
            {
                OnMonthlyEventStarted.Broadcast(Ev);
                break;
            }
        }
    }

    // Update cached state
    CachedState.CurrentMonth = NewMonth;
    CachedState.CurrentHour  = NewHour;
    CachedState.TimeOfDay    = NewTod;
}

ELoomTimeOfDay UBridgeLoomSeasonalContent::HourToTimeOfDay(int32 Hour)
{
    // Bands from seasonal-content.ts constants:
    // Dawn 5-7, Morning 7-12, Afternoon 12-17, GoldenHour 17-19,
    // Evening 19-21, Night 21-5
    if (Hour >= 5  && Hour < 7)  return ELoomTimeOfDay::Dawn;
    if (Hour >= 7  && Hour < 12) return ELoomTimeOfDay::Morning;
    if (Hour >= 12 && Hour < 17) return ELoomTimeOfDay::Afternoon;
    if (Hour >= 17 && Hour < 19) return ELoomTimeOfDay::GoldenHour;
    if (Hour >= 19 && Hour < 21) return ELoomTimeOfDay::Evening;
    return ELoomTimeOfDay::Night; // 21-24 and 0-5
}

// ─── Default Monthly Events ───────────────────────────────────────

void UBridgeLoomSeasonalContent::InitDefaultMonthlyEvents()
{
    MonthlyEvents.Empty();

    auto AddEvent = [&](ELoomMonth Month, const FString& Name,
                        TArray<FString> Worlds, const FString& Content,
                        int32 LumBoost)
    {
        FLoomMonthlyEvent Ev;
        Ev.Month              = Month;
        Ev.EventName          = Name;
        Ev.AffectedWorldIds   = Worlds;
        Ev.NewContent         = Content;
        Ev.LuminanceBoost     = LumBoost;
        MonthlyEvents.Add(Ev);
    };

    // Bible v5 Part 6 — 12 monthly events
    AddEvent(ELoomMonth::January,   TEXT("New Year Luminance"),
             { TEXT("hub"), TEXT("starfall-observatory") },
             TEXT("Countdown, firework Niagara, +5 luminance to all worlds"), 5);

    AddEvent(ELoomMonth::February,  TEXT("Stories of the Heart"),
             { TEXT("story-tree"), TEXT("diary-lighthouse"), TEXT("folklore-bazaar") },
             TEXT("Valentine letters, character love-story entries"), 2);

    AddEvent(ELoomMonth::March,     TEXT("Spring Awakening"),
             { TEXT("number-garden"), TEXT("meadow-lab"), TEXT("greenhouse-spiral") },
             TEXT("Blossom Niagara, Baxter nest mini-event"), 3);

    AddEvent(ELoomMonth::April,     TEXT("April Curiosity Month"),
             { TEXT("circuit-marsh"), TEXT("cloud-kingdom"), TEXT("data-stream") },
             TEXT("Hidden question-mark objects that unlock bonus entries"), 2);

    AddEvent(ELoomMonth::May,       TEXT("Earth & Ocean Month"),
             { TEXT("tideline-bay"), TEXT("frost-peaks"), TEXT("savanna-workshop") },
             TEXT("Eco-challenge quests across three STEM worlds"), 3);

    AddEvent(ELoomMonth::June,      TEXT("Midsummer Lanterns"),
             { TEXT("hub"), TEXT("music-meadow") },
             TEXT("Floating lanterns, collaborative melody-building"), 2);

    AddEvent(ELoomMonth::July,      TEXT("Independence & Voices"),
             { TEXT("debate-arena"), TEXT("nonfiction-fleet") },
             TEXT("Historical speech entries, debate championship"), 2);

    AddEvent(ELoomMonth::August,    TEXT("Back-to-Loom Surge"),
             { TEXT("hub") },
             TEXT("Return-bonus doubled, new starter quests"), 5);

    AddEvent(ELoomMonth::September, TEXT("Harvest of Knowledge"),
             { TEXT("budget-kitchen"), TEXT("market-square"), TEXT("entrepreneur") },
             TEXT("Seasonal market stalls, harvest math entries"), 3);

    AddEvent(ELoomMonth::October,   TEXT("The Great Riddle"),
             { TEXT("hub"), TEXT("thinking-grove") },
             TEXT("Mystery threadways, Compass in costume, riddle chain"), 3);

    AddEvent(ELoomMonth::November,  TEXT("Gratitude Garden"),
             { TEXT("wellness-garden"), TEXT("charity-harbor") },
             TEXT("Community boards, kindler-to-kindler gift spark"), 2);

    AddEvent(ELoomMonth::December,  TEXT("The Great Restoration"),
             { TEXT("hub") },
             TEXT("Year-end recap, annual luminance restoration to all worlds"), 5);
}
