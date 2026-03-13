// Copyright Koydo. All Rights Reserved.
// BridgeLoomSeasonalContent.h — UE5 bridge for Bible v5 Seasonal & Live Content.
//
// Worlds change with the real calendar (12 monthly events) and with the time of
// day (dawn/morning/afternoon/golden-hour/evening/night). This component drives:
//   - Monthly event prop spawning via async-loaded actor classes
//   - Time-of-day detection from wall-clock UTC hour
//   - Lighting preset handoff to BridgeLoomLumen (via delegate)
//   - Luminance boost awards to BridgeLoomKindlerProgression (via delegate)
//
// The component self-ticks at CalendarTickInterval to re-evaluate the clock.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "BridgeLoomSeasonalContent.generated.h"

// ─── Enumerations ──────────────────────────────────────────────────

/** Six time-of-day bands matching seasonal-content.ts. */
UENUM(BlueprintType)
enum class ELoomTimeOfDay : uint8
{
    Dawn        UMETA(DisplayName = "Dawn (05–07)"),
    Morning     UMETA(DisplayName = "Morning (07–12)"),
    Afternoon   UMETA(DisplayName = "Afternoon (12–17)"),
    GoldenHour  UMETA(DisplayName = "Golden Hour (17–19)"),
    Evening     UMETA(DisplayName = "Evening (19–21)"),
    Night       UMETA(DisplayName = "Night (21–05)"),
};

/** Calendar month (1-indexed). */
UENUM(BlueprintType)
enum class ELoomMonth : uint8
{
    January   = 1  UMETA(DisplayName = "January"),
    February  = 2  UMETA(DisplayName = "February"),
    March     = 3  UMETA(DisplayName = "March"),
    April     = 4  UMETA(DisplayName = "April"),
    May       = 5  UMETA(DisplayName = "May"),
    June      = 6  UMETA(DisplayName = "June"),
    July      = 7  UMETA(DisplayName = "July"),
    August    = 8  UMETA(DisplayName = "August"),
    September = 9  UMETA(DisplayName = "September"),
    October   = 10 UMETA(DisplayName = "October"),
    November  = 11 UMETA(DisplayName = "November"),
    December  = 12 UMETA(DisplayName = "December"),
};

// ─── Structs ───────────────────────────────────────────────────────

/** A monthly event definition from the seasonal calendar. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomMonthlyEvent
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Seasonal")
    ELoomMonth Month = ELoomMonth::January;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Seasonal")
    FString EventName;

    /** WorldIds whose decorations change during this event. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Seasonal")
    TArray<FString> AffectedWorldIds;

    /** Human-readable description of new content for this month. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Seasonal")
    FString NewContent;

    /** Luminance boost applied to affected worlds when the event starts. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Seasonal",
              meta = (ClampMin = "0", ClampMax = "20"))
    int32 LuminanceBoost = 2;

    /**
     * Per-affected-world prop actor class to spawn when this month is active.
     * Key = WorldId, Value = soft class reference to the decoration actor.
     */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Seasonal")
    TMap<FString, TSoftClassPtr<AActor>> PropClasses;
};

/** Content restricted to a specific time-of-day band. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomTimeLockedContent
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Seasonal")
    FString ContentId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Seasonal")
    FString Description;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Seasonal")
    ELoomTimeOfDay AvailableTimeOfDay = ELoomTimeOfDay::Morning;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Seasonal")
    FString WorldId;
};

/** Snapshot of the current calendar + clock state. */
USTRUCT(BlueprintType)
struct BRIDGELOOM_API FLoomSeasonalCalendarState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, Category = "Seasonal")
    ELoomMonth CurrentMonth = ELoomMonth::January;

    /** UTC hour [0–23]. */
    UPROPERTY(BlueprintReadOnly, Category = "Seasonal",
              meta = (ClampMin = "0", ClampMax = "23"))
    int32 CurrentHour = 9;

    UPROPERTY(BlueprintReadOnly, Category = "Seasonal")
    ELoomTimeOfDay TimeOfDay = ELoomTimeOfDay::Morning;

    /** Indices into the MonthlyEvents array that are currently active. */
    UPROPERTY(BlueprintReadOnly, Category = "Seasonal")
    TArray<int32> ActiveEventIndices;
};

// ─── Component ────────────────────────────────────────────────────

/**
 * UBridgeLoomSeasonalContent — ActorComponent bridging TS seasonal-content to UE5.
 *
 * Features:
 *  - Self-ticking calendar: re-evaluates month/hour at CalendarTickInterval
 *  - SpawnEventProps: async-loads and places decorator actors per affected world
 *  - DespawnEventProps: despawns previous month's actors cleanly
 *  - GetCurrentTimeOfDay: stateless UTC-hour to ELoomTimeOfDay mapping
 *  - Delegates: OnTimeOfDayChanged, OnMonthlyEventStarted, OnMonthlyEventEnded
 */
UCLASS(ClassGroup = (BridgeLoom), meta = (BlueprintSpawnableComponent),
       DisplayName = "Loom Seasonal Content")
class BRIDGELOOM_API UBridgeLoomSeasonalContent : public UActorComponent
{
    GENERATED_BODY()

public:
    UBridgeLoomSeasonalContent();

    // ── Configuration ─────────────────────────────────────────────

    /** Monthly event definitions (defaults seeded in BeginPlay from Bible v5). */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Seasonal|Config")
    TArray<FLoomMonthlyEvent> MonthlyEvents;

    /** Time-locked content definitions. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Seasonal|Config")
    TArray<FLoomTimeLockedContent> TimeLockedContent;

    /**
     * How often (in seconds) the calendar re-evaluates month/hour.
     * Default: 60 s (once per real minute).
     */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Seasonal|Config",
              meta = (ClampMin = "10.0", ClampMax = "3600.0"))
    float CalendarTickInterval = 60.0f;

    /**
     * Maximum number of event prop actors per world per month.
     * Prevents runaway spawning if the prop pool is large.
     */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Seasonal|Config",
              meta = (ClampMin = "1", ClampMax = "50"))
    int32 MaxPropsPerWorld = 10;

    /** World-space transform offset applied when spawning each event prop. */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Seasonal|Config")
    FVector PropSpawnOffset = FVector(0.f, 0.f, 0.f);

    // ── Calendar Queries ─────────────────────────────────────────

    /** Return the current UTC hour mapped to the correct band. */
    UFUNCTION(BlueprintPure, Category = "Seasonal")
    ELoomTimeOfDay GetCurrentTimeOfDay() const;

    /** Return the currently active monthly event (if any). May be invalid. */
    UFUNCTION(BlueprintPure, Category = "Seasonal")
    bool GetActiveMonthlyEvent(FLoomMonthlyEvent& OutEvent) const;

    /** Get all time-locked content available right now. */
    UFUNCTION(BlueprintPure, Category = "Seasonal")
    TArray<FLoomTimeLockedContent> GetAvailableTimeLocked() const;

    /** Snapshot the full calendar state. */
    UFUNCTION(BlueprintPure, Category = "Seasonal")
    FLoomSeasonalCalendarState GetCalendarState() const;

    // ── Prop Management ───────────────────────────────────────────

    /**
     * Async-load and spawn decoration actors for the currently active monthly
     * event in the given world. Replaces any previously spawned props.
     */
    UFUNCTION(BlueprintCallable, Category = "Seasonal")
    void SpawnEventProps(const FString& WorldId);

    /** Destroy all currently spawned event props for the given world. */
    UFUNCTION(BlueprintCallable, Category = "Seasonal")
    void DespawnEventProps(const FString& WorldId);

    /** Despawn all spawned event props across all worlds. */
    UFUNCTION(BlueprintCallable, Category = "Seasonal")
    void DespawnAllEventProps();

    // ── Delegates ─────────────────────────────────────────────────

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnTimeOfDayChanged,
        ELoomTimeOfDay, Previous, ELoomTimeOfDay, Current);

    UPROPERTY(BlueprintAssignable, Category = "Seasonal|Events")
    FOnTimeOfDayChanged OnTimeOfDayChanged;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnMonthlyEventStarted,
        FLoomMonthlyEvent, Event);

    UPROPERTY(BlueprintAssignable, Category = "Seasonal|Events")
    FOnMonthlyEventStarted OnMonthlyEventStarted;

    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnMonthlyEventEnded,
        FLoomMonthlyEvent, Event);

    UPROPERTY(BlueprintAssignable, Category = "Seasonal|Events")
    FOnMonthlyEventEnded OnMonthlyEventEnded;

    // ── UActorComponent ───────────────────────────────────────────

    virtual void BeginPlay() override;

private:
    // Current evaluated state
    FLoomSeasonalCalendarState CachedState;

    // WorldId → live spawned prop actors
    TMap<FString, TArray<TWeakObjectPtr<AActor>>> SpawnedProps;

    // Recurring timer handle for calendar re-evaluation
    FTimerHandle CalendarTickHandle;

    // Called by timer: compute new state and fire changed delegates
    void EvaluateCalendar();

    // Map UTC hour to time-of-day band
    static ELoomTimeOfDay HourToTimeOfDay(int32 Hour);

    // Seed MonthlyEvents with Bible v5 canonical data
    void InitDefaultMonthlyEvents();
};
